const __RRS_BASE = (() => {
    const fallback = "https://university-qr-reservation-system-production.up.railway.app";
    if (typeof window === "undefined") return "http://localhost:5000";
    const host = window.location.hostname;
    const explicit = window.RRS_API_BASE ? String(window.RRS_API_BASE).replace(/\/+$/, "") : "";
    const pageOrigin = String(window.location.origin || "").replace(/\/+$/, "");
    if (explicit && (["localhost", "127.0.0.1"].includes(host) || explicit !== pageOrigin)) return explicit;
    return ["localhost", "127.0.0.1"].includes(host) ? "http://localhost:5000" : fallback;
})();
const API_BASE_URL      = __RRS_BASE + "/api/reservation";
const ROOM_API_BASE_URL = __RRS_BASE + "/api/room";

const reservationForm = document.getElementById("reservationForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoader = submitBtn.querySelector(".btn-loader");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const fields = {
    roomId: document.getElementById("roomId"),
    reservationDate: document.getElementById("reservationDate"),
    startTime: document.getElementById("startTime"),
    endTime: document.getElementById("endTime")
};

const errors = {
    roomId: document.getElementById("roomIdError"),
    reservationDate: document.getElementById("reservationDateError"),
    slot: document.getElementById("slotError")
};

const preview = {
    roomRow: document.getElementById("previewRoomRow"),
    roomLabel: document.getElementById("previewRoomLabel"),
    roomId: document.getElementById("previewRoomId"),
    date: document.getElementById("previewDate"),
    startTime: document.getElementById("previewStartTime"),
    endTime: document.getElementById("previewEndTime"),
    remainingCapacity: document.getElementById("previewRemainingCapacity")
};

const slotsContainer = document.getElementById("slotsContainer");
const slotsMessage = document.getElementById("slotsMessage");

const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

let allSlots = [];
let selectedSlot = null;
let roomLockedFromQuery = false;
let roomsById = new Map();

function getStoredUserId() {
    return localStorage.getItem("userID") || localStorage.getItem("rrs.userId");
}

function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("rrs.token");
}

function getRole() {
    return (
        localStorage.getItem("role") ||
        localStorage.getItem("rrs.role") ||
        ""
    ).trim().toLowerCase();
}

function canViewRoomIds() {
    const role = getRole();
    return role === "admin" || role === "staff";
}

if (!getToken()) {
    window.location.href = "login.html";
}

function setupDashboardLink() {
    const role = getRole();

    if (!adminNavLink) return;

    if (role === "admin" || role === "staff") {
        adminNavLink.classList.remove("hidden");
        adminNavLink.textContent = "Dashboard";
        adminNavLink.href = "admin-dashboard.html";
    } else {
        adminNavLink.classList.add("hidden");
    }
}

function selectedRoomLabel() {
    const selectedId = fields.roomId.value;
    const room = roomsById.get(String(selectedId));
    if (room) return room.name;

    const selectedOption = fields.roomId.options[fields.roomId.selectedIndex];
    return selectedOption && selectedOption.value ? selectedOption.textContent : "-";
}

async function syncWarnings() {
    const token = getToken();
    if (!token) return [];

    const response = await fetch(`${API_BASE_URL}/warnings`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const contentType = response.headers.get("content-type") || "";
    let data = [];

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        await response.text();
    }

    if (!response.ok) {
        const errorMessage =
            typeof data === "string"
                ? data
                : data?.message || "Reservation warning sync failed.";
        throw new Error(errorMessage);
    }

    return Array.isArray(data) ? data : [];
}

function clearErrors() {
    Object.values(errors).forEach((item) => {
        if (item) item.textContent = "";
    });
}

function showError(fieldName, message) {
    if (errors[fieldName]) {
        errors[fieldName].textContent = message;
    }
}

function showMessage(type, title, text) {
    messageBox.classList.remove("hidden", "success", "error");
    messageBox.classList.add(type);

    messageIcon.textContent = type === "success" ? "OK" : "!";
    messageTitle.textContent = title;
    messageText.textContent = text;

    messageBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error");
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    resetBtn.disabled = isLoading;

    if (isLoading) {
        btnText.textContent = "Submitting...";
        btnLoader.classList.remove("hidden");
    } else {
        btnText.textContent = "Submit Reservation";
        btnLoader.classList.add("hidden");
    }
}

function formatDate(dateValue) {
    return dateValue || "-";
}

function formatSimpleTime(timeValue) {
    return timeValue || "-";
}

function formatSlotLabel(startTime, endTime) {
    return `${formatSimpleTime(startTime)} -> ${formatSimpleTime(endTime)}`;
}

function formatRemainingCapacity(slot) {
    if (slot.remainingCapacity === null || slot.remainingCapacity === undefined) {
        return isSelectedRoomDemo() ? "Capacity checked on submit" : "Capacity not available";
    }

    if (Number(slot.remainingCapacity) <= 0) {
        return "Full";
    }

    const seatLabel = Number(slot.remainingCapacity) === 1 ? "seat" : "seats";
    return `${slot.remainingCapacity} ${seatLabel} left`;
}

function updatePreview() {
    if (preview.roomLabel) {
        preview.roomLabel.textContent = canViewRoomIds() ? "Room ID" : "Room";
    }

    preview.roomId.textContent = canViewRoomIds()
        ? (fields.roomId.value || "-")
        : selectedRoomLabel();
    preview.date.textContent = formatDate(fields.reservationDate.value);
    preview.startTime.textContent = selectedSlot ? selectedSlot.startTime : "-";
    preview.endTime.textContent = selectedSlot ? selectedSlot.endTime : "-";

    if (preview.remainingCapacity) {
        preview.remainingCapacity.textContent = selectedSlot
            ? formatRemainingCapacity(selectedSlot)
            : "-";
    }
}

function prefillRoomIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const roomIdFromUrl = params.get("roomId");

    if (roomIdFromUrl) {
        fields.roomId.value = roomIdFromUrl;
        fields.roomId.disabled = true;
        roomLockedFromQuery = true;
    } else {
        fields.roomId.disabled = false;
        roomLockedFromQuery = false;
    }
}

function extractRoomsArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rooms)) return data.rooms;
    if (Array.isArray(data?.Rooms)) return data.Rooms;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.Data)) return data.Data;
    if (Array.isArray(data?.$values)) return data.$values;
    return [];
}

function normalizeRoom(room) {
    const name = room.roomName ?? room.RoomName ?? room.name ?? room.Name ?? "Unknown Room";
    const type = room.roomType ?? room.RoomType ?? room.type ?? room.Type ?? "Unknown Type";
    const demoByText = /demo/i.test(`${name} ${type}`);

    return {
        id: room.roomID ?? room.RoomID ?? room.id ?? room.ID,
        name,
        type,
        location: room.location ?? room.Location ?? "Unknown Location",
        isDemoRoom: Boolean(room.isDemoRoom ?? room.IsDemoRoom ?? demoByText)
    };
}

function isSelectedRoomDemo() {
    const room = roomsById.get(String(fields.roomId.value || ""));
    if (room && room.isDemoRoom) return true;

    const selectedOption = fields.roomId.options[fields.roomId.selectedIndex];
    return Boolean(selectedOption && /demo/i.test(selectedOption.textContent || ""));
}

function renderDemoRoomPicker() {
    const date = fields.reservationDate.value;
    slotsContainer.innerHTML = "";
    resetSelectedSlot();

    slotsMessage.innerHTML =
        '<strong>Demo Presentation Room</strong> — choose any start and end time. ' +
        'The two-hour slot grid does not apply.';

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;";

    function field(label, type, id) {
        const col = document.createElement("label");
        col.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:13px;";
        col.textContent = label;
        const input = document.createElement("input");
        input.type = type;
        input.id = id;
        input.style.cssText = "padding:8px;border:1px solid #ccc;border-radius:6px;font:inherit;";
        col.appendChild(input);
        return { col, input };
    }

    const startF = field("Start time", "time", "demoStartTime");
    const endF   = field("End time",   "time", "demoEndTime");

    function recompute() {
        const s = startF.input.value;
        const e = endF.input.value;
        if (!date || !s || !e) {
            resetSelectedSlot();
            return;
        }
        if (e <= s) {
            errors.slot.textContent = "End time must be after start time.";
            resetSelectedSlot();
            return;
        }
        errors.slot.textContent = "";
        selectedSlot = {
            startTime: s,
            endTime: e,
            startDateTime: `${date}T${s}:00`,
            endDateTime:   `${date}T${e}:00`,
            isAvailable: true,
            remainingCapacity: null,
            status: "Available"
        };
        fields.startTime.value = selectedSlot.startDateTime;
        fields.endTime.value   = selectedSlot.endDateTime;
        updatePreview();
    }

    startF.input.addEventListener("change", recompute);
    endF.input.addEventListener("change", recompute);

    wrap.appendChild(startF.col);
    wrap.appendChild(endF.col);
    slotsContainer.appendChild(wrap);
}

function populateRoomOptions(rooms) {
    const selected = fields.roomId.value;
    roomsById = new Map(rooms.map((room) => [String(room.id), room]));
    fields.roomId.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a room";
    fields.roomId.appendChild(placeholder);

    rooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = String(room.id);
        const demoLabel = room.isDemoRoom ? " - Demo Room" : "";
        option.textContent = canViewRoomIds()
            ? `${room.name} (ID: ${room.id})${demoLabel}`
            : `${room.name}${demoLabel}`;
        fields.roomId.appendChild(option);
    });

    if (selected) {
        const exists = rooms.some((r) => String(r.id) === String(selected));
        if (exists) {
            fields.roomId.value = String(selected);
            return;
        }

        if (roomLockedFromQuery) {
            fields.roomId.innerHTML = "";
            const fallback = document.createElement("option");
            fallback.value = String(selected);
            fallback.textContent = canViewRoomIds() ? `Room #${selected}` : "Selected room";
            fields.roomId.appendChild(fallback);
            fields.roomId.value = String(selected);
        }
    }
}

async function loadRoomOptions() {
    const data = await apiRequest(`${ROOM_API_BASE_URL}`);
    const rooms = extractRoomsArray(data).map(normalizeRoom);
    populateRoomOptions(rooms);
}

function resetSelectedSlot() {
    selectedSlot = null;
    fields.startTime.value = "";
    fields.endTime.value = "";
    updatePreview();
}

function extractArrayByKeys(data, keys) {
    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.[key]?.$values)) return data[key].$values;
    }

    return [];
}

function extractAllSlots(data) {
    if (Array.isArray(data)) return data;

    const availableSlots = extractArrayByKeys(data, [
        "availableSlots",
        "AvailableSlots",
        "slots",
        "Slots",
        "data",
        "Data",
        "$values"
    ]);

    const bookedSlots = extractArrayByKeys(data, [
        "bookedSlots",
        "BookedSlots"
    ]);

    return [...availableSlots, ...bookedSlots];
}

function normalizeSlot(slot, selectedDate) {
    const startTimeRaw =
        slot.startTime ?? slot.StartTime ?? slot.start ?? slot.Start ?? null;

    const endTimeRaw =
        slot.endTime ?? slot.EndTime ?? slot.end ?? slot.End ?? null;

    const remainingCapacityValue =
        slot.remainingCapacity ?? slot.RemainingCapacity ?? null;

    const remainingCapacity =
        remainingCapacityValue === null || remainingCapacityValue === undefined
            ? null
            : Number(remainingCapacityValue);

    const isAvailable =
        slot.isAvailable ??
        slot.IsAvailable ??
        (remainingCapacity !== null ? remainingCapacity > 0 : true);

    const status =
        slot.status ??
        slot.Status ??
        (isAvailable ? "Available" : "Full");

    return {
        startTime: startTimeRaw,
        endTime: endTimeRaw,
        status,
        totalCapacity: slot.totalCapacity ?? slot.TotalCapacity ?? null,
        currentBookings: Number(slot.currentBookings ?? slot.CurrentBookings ?? 0),
        remainingCapacity,
        isAvailable,
        startDateTime: startTimeRaw ? `${selectedDate}T${startTimeRaw}` : "",
        endDateTime: endTimeRaw ? `${selectedDate}T${endTimeRaw}` : ""
    };
}

function sortSlotsByStartTime(slots) {
    return slots.sort((a, b) => {
        const first = String(a.startTime || "");
        const second = String(b.startTime || "");
        return first.localeCompare(second);
    });
}

function isFutureSlot(slot) {
    const start = new Date(slot.startDateTime || "");
    if (isNaN(start.getTime())) return true;
    return start > new Date();
}

function isSlotFull(slot) {
    const hasCapacity = slot.remainingCapacity !== null && slot.remainingCapacity !== undefined;

    return (
        slot.isAvailable === false ||
        (hasCapacity && Number(slot.remainingCapacity) <= 0) ||
        String(slot.status || "").toLowerCase() === "full"
    );
}

function renderSlots(slots) {
    slotsContainer.innerHTML = "";
    resetSelectedSlot();

    if (!slots.length) {
        slotsMessage.textContent = "No slots found for this date.";
        return;
    }

    slotsMessage.textContent =
        "Choose one available slot. Full slots are shown but cannot be selected.";

    slots.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-btn slot-btn";

        const full = isSlotFull(slot);
        const capacityText = formatRemainingCapacity(slot);

        button.textContent = `${formatSlotLabel(slot.startTime, slot.endTime)} | ${capacityText}`;

        if (full) {
            button.disabled = true;
            button.classList.add("disabled");
            button.title = "This time slot is fully booked.";
        }

        button.addEventListener("click", () => {
            if (full) return;

            document.querySelectorAll(".slot-btn").forEach((btn) => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            selectedSlot = slot;
            fields.startTime.value = slot.startDateTime || "";
            fields.endTime.value = slot.endDateTime || "";
            errors.slot.textContent = "";
            updatePreview();
        });

        slotsContainer.appendChild(button);
    });
}

async function apiRequest(url, options = {}) {
    const token = getToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const errorMessage =
            typeof data === "string"
                ? data
                : data?.message || "Request failed.";

        throw new Error(errorMessage);
    }

    return data;
}

async function loadAvailableSlots() {
    const roomId = fields.roomId.value.trim();
    const date = fields.reservationDate.value;

    slotsContainer.innerHTML = "";
    resetSelectedSlot();
    hideMessage();

    if (!roomId) {
        slotsMessage.textContent = "Please select a room first.";
        return;
    }

    if (!date) {
        slotsMessage.textContent = "Choose a reservation date to load time slots.";
        return;
    }

    // Demo rooms bypass the 2-hour slot grid entirely.
    if (isSelectedRoomDemo()) {
        renderDemoRoomPicker();
        return;
    }

    try {
        slotsMessage.textContent = "Loading time slots...";

        const data = await apiRequest(
            `${ROOM_API_BASE_URL}/available-slots/${roomId}?date=${encodeURIComponent(date)}`
        );

        const slots = sortSlotsByStartTime(
            extractAllSlots(data)
                .map((slot) => normalizeSlot(slot, date))
                .filter((slot) => slot.startTime && slot.endTime)
        );

        const selectableSlots = slots.filter(isFutureSlot);

        allSlots = selectableSlots;
        renderSlots(selectableSlots);

        if (slots.length > 0 && selectableSlots.length === 0) {
            slotsMessage.textContent =
                "All slots for this date are in the past. Please choose another date.";
        }
    } catch (error) {
        allSlots = [];
        slotsContainer.innerHTML = "";
        slotsMessage.textContent = "Could not load time slots for this room and date.";

        showMessage(
            "error",
            "Slots Load Failed",
            error.message || "Unable to load slots."
        );
    }
}

function validateForm() {
    clearErrors();
    hideMessage();

    const storedUserId = getStoredUserId();
    let isValid = true;

    if (!storedUserId) {
        showMessage(
            "error",
            "Login Required",
            "You must log in first before creating a reservation."
        );
        return false;
    }

    if (!fields.roomId.value.trim()) {
        showError("roomId", "Room is required.");
        isValid = false;
    }

    if (!fields.reservationDate.value) {
        showError("reservationDate", "Reservation date is required.");
        isValid = false;
    }

    if (!selectedSlot || !fields.startTime.value || !fields.endTime.value) {
        showError("slot", "Please select one available time slot.");
        isValid = false;
    }

    if (selectedSlot && !isSelectedRoomDemo() && isSlotFull(selectedSlot)) {
        showError("slot", "This time slot is fully booked. Please choose another slot.");
        isValid = false;
    }

    return isValid;
}

function buildReservationPayload() {
    return {
        userID: Number(getStoredUserId()),
        roomID: Number(fields.roomId.value),
        reservationDate: `${fields.reservationDate.value}T00:00:00`,
        startTime: fields.startTime.value,
        endTime: fields.endTime.value
    };
}

async function submitReservation(payload) {
    const response = await fetch(`${API_BASE_URL}/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const errorMessage =
            typeof data === "string"
                ? data
                : data?.message || "Failed to create reservation.";

        throw new Error(errorMessage);
    }

    return data;
}

function getReservationIdFromResult(result) {
    return (
        result?.reservationID ??
        result?.ReservationID ??
        result?.id ??
        result?.ID ??
        result?.reservationId ??
        null
    );
}

function redirectAfterSuccess() {
    window.location.href = "my-reservations.html";
}

reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
        setLoading(true);
        await syncWarnings();

        const payload = buildReservationPayload();
        const result = await submitReservation(payload);
        const reservationId = getReservationIdFromResult(result);
        const status = result?.status || result?.Status || "Confirmed";

        showMessage(
            "success",
            "Reservation Created Successfully",
            `Your reservation was created successfully. Reservation ID: ${reservationId || "N/A"} | Status: ${status}`
        );

        setTimeout(() => {
            redirectAfterSuccess();
        }, 1000);
    } catch (error) {
        showMessage(
            "error",
            "Reservation Failed",
            error.message || "Unable to create reservation."
        );
    } finally {
        setLoading(false);
    }
});

reservationForm.addEventListener("reset", () => {
    clearErrors();
    hideMessage();

    setTimeout(() => {
        fields.roomId.disabled = false;
        prefillRoomIdFromUrl();
        loadRoomOptions().catch(() => {
            // Non-blocking on reset.
        });
        allSlots = [];
        slotsContainer.innerHTML = "";
        slotsMessage.textContent = "Choose a room and reservation date to load available slots.";
        resetSelectedSlot();
        updatePreview();
    }, 0);
});

fields.reservationDate.addEventListener("change", async () => {
    await loadAvailableSlots();
    updatePreview();
});

fields.roomId.addEventListener("change", async () => {
    resetSelectedSlot();
    if (fields.reservationDate.value) {
        await loadAvailableSlots();
    } else {
        slotsMessage.textContent = "Choose a reservation date to load available slots.";
    }
    updatePreview();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        localStorage.removeItem("rrs.token");
        localStorage.removeItem("rrs.role");
        localStorage.removeItem("rrs.userId");
        localStorage.removeItem("rrs.email");
        window.location.href = "login.html";
    });
}

setupDashboardLink();
prefillRoomIdFromUrl();
loadRoomOptions()
    .then(() => {
        if (roomLockedFromQuery) {
            fields.roomId.disabled = true;
        }
        updatePreview();
    })
    .catch(() => {
        slotsMessage.textContent = "Rooms could not be loaded. Please refresh the page.";
        updatePreview();
    });
slotsMessage.textContent = "Choose a room and reservation date to load available slots.";

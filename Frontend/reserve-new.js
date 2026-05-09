const API_BASE_URL = "https://localhost:5001/api/reservation";
const ROOM_API_BASE_URL = "https://localhost:5001/api/room";

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

function getStoredUserId() {
    return localStorage.getItem("userID");
}

function getToken() {
    return localStorage.getItem("token");
}

function getRole() {
    return (localStorage.getItem("role") || "").trim().toLowerCase();
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

    messageIcon.textContent = type === "success" ? "✓" : "!";
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
    return dateValue || "—";
}

function formatSimpleTime(timeValue) {
    return timeValue || "—";
}

function formatSlotLabel(startTime, endTime) {
    return `${formatSimpleTime(startTime)} → ${formatSimpleTime(endTime)}`;
}

function formatRemainingCapacity(slot) {
    if (slot.remainingCapacity === null || slot.remainingCapacity === undefined) {
        return "Capacity not available";
    }

    if (Number(slot.remainingCapacity) <= 0) {
        return "Full";
    }

    const seatLabel = Number(slot.remainingCapacity) === 1 ? "seat" : "seats";
    return `${slot.remainingCapacity} ${seatLabel} left`;
}

function updatePreview() {
    preview.roomId.textContent = fields.roomId.value || "—";
    preview.date.textContent = formatDate(fields.reservationDate.value);
    preview.startTime.textContent = selectedSlot ? selectedSlot.startTime : "—";
    preview.endTime.textContent = selectedSlot ? selectedSlot.endTime : "—";

    if (preview.remainingCapacity) {
        preview.remainingCapacity.textContent = selectedSlot
            ? formatRemainingCapacity(selectedSlot)
            : "—";
    }
}

function prefillRoomIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const roomIdFromUrl = params.get("roomId");

    if (roomIdFromUrl) {
        fields.roomId.value = roomIdFromUrl;
        fields.roomId.readOnly = true;
    }
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

function isSlotFull(slot) {
    return (
        slot.isAvailable === false ||
        Number(slot.remainingCapacity) <= 0 ||
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
        slotsMessage.textContent = "Room ID is missing.";
        return;
    }

    if (!date) {
        slotsMessage.textContent = "Choose a reservation date to load time slots.";
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

        allSlots = slots;
        renderSlots(slots);
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
        showError("roomId", "Room ID is required.");
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

    if (selectedSlot && isSlotFull(selectedSlot)) {
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
        prefillRoomIdFromUrl();
        allSlots = [];
        slotsContainer.innerHTML = "";
        slotsMessage.textContent = "Choose a reservation date to load time slots.";
        resetSelectedSlot();
        updatePreview();
    }, 0);
});

fields.reservationDate.addEventListener("change", async () => {
    await loadAvailableSlots();
    updatePreview();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        window.location.href = "login.html";
    });
}

setupDashboardLink();
prefillRoomIdFromUrl();
updatePreview();
slotsMessage.textContent = "Choose a reservation date to load time slots.";
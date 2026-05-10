const API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api/auth";

const loginForm = document.getElementById("loginForm");
const splash = document.getElementById("roomlinkSplash");

const studentModeBtn = document.getElementById("studentModeBtn");
const staffModeBtn = document.getElementById("staffModeBtn");
const studentField = document.getElementById("studentField");
const emailField = document.getElementById("emailField");

const studentNumberInput = document.getElementById("studentNumber");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const studentNumberError = document.getElementById("studentNumberError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

const loginBtn = document.getElementById("loginBtn");
const btnText = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".btn-loader");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

let loginMode = "student";

function runSplash() {
    if (!splash) return;

    const seen = sessionStorage.getItem("roomlinkSplashSeen") === "1";
    if (seen) {
        splash.classList.add("hidden");
        return;
    }

    setTimeout(() => {
        splash.classList.add("done");
    }, 1200);

    setTimeout(() => {
        splash.classList.add("hidden");
        sessionStorage.setItem("roomlinkSplashSeen", "1");
    }, 1700);
}

function showMessage(type, title, text) {
    messageBox.classList.remove("hidden", "success", "error");
    messageBox.classList.add(type);
    messageIcon.textContent = type === "success" ? "OK" : "!";
    messageTitle.textContent = title;
    messageText.textContent = text;
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error");
}

function clearErrors() {
    studentNumberError.textContent = "";
    emailError.textContent = "";
    passwordError.textContent = "";
}

function setMode(mode) {
    loginMode = mode === "staff" ? "staff" : "student";

    studentModeBtn.classList.toggle("active", loginMode === "student");
    staffModeBtn.classList.toggle("active", loginMode === "staff");

    if (loginMode === "student") {
        studentField.classList.remove("hidden");
        emailField.classList.add("hidden");
        emailInput.value = "";
    } else {
        studentField.classList.add("hidden");
        emailField.classList.remove("hidden");
        studentNumberInput.value = "";
    }

    clearErrors();
    hideMessage();
}

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    if (isLoading) {
        btnText.textContent = loginMode === "student" ? "Signing in student..." : "Signing in...";
        btnLoader.classList.remove("hidden");
    } else {
        btnText.textContent = "Login";
        btnLoader.classList.add("hidden");
    }
}

function validateForm() {
    clearErrors();
    hideMessage();

    let isValid = true;
    if (loginMode === "student") {
        if (!studentNumberInput.value.trim()) {
            studentNumberError.textContent = "Student number is required.";
            isValid = false;
        }
    } else {
        const email = emailInput.value.trim();
        if (!email) {
            emailError.textContent = "Email is required.";
            isValid = false;
        } else if (!email.includes("@")) {
            emailError.textContent = "Please enter a valid email address.";
            isValid = false;
        }
    }

    if (!passwordInput.value.trim()) {
        passwordError.textContent = "Password is required.";
        isValid = false;
    }

    return isValid;
}

async function login() {
    const payload = loginMode === "student"
        ? {
            studentNumber: studentNumberInput.value.trim(),
            password: passwordInput.value.trim()
        }
        : {
            email: emailInput.value.trim(),
            password: passwordInput.value.trim()
        };

    const endpoint = loginMode === "student" ? "student-login" : "login";

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const errorMessage = typeof data === "string"
            ? data
            : data?.message || "Login failed.";
        throw new Error(errorMessage);
    }

    return data;
}

function saveSession(result) {
    const fallbackEmail = loginMode === "student"
        ? `${studentNumberInput.value.trim()}@students.roomlink.local`
        : emailInput.value.trim();

    if (window.Auth && typeof window.Auth.save === "function") {
        window.Auth.save({
            token: result.token || "",
            role: result.role || "",
            userID: result.userID || "",
            email: result.email || fallbackEmail
        });
        return;
    }

    localStorage.setItem("token", result.token || "");
    localStorage.setItem("role", result.role || "");
    localStorage.setItem("userID", String(result.userID || ""));
}

function redirectAfterLogin(role) {
    if (role === "Admin" || role === "Staff") {
        window.location.href = "admin-dashboard.html";
        return;
    }
    window.location.href = "rooms.html";
}

studentModeBtn.addEventListener("click", () => setMode("student"));
staffModeBtn.addEventListener("click", () => setMode("staff"));

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
        setLoading(true);
        const result = await login();
        saveSession(result);
        showMessage("success", "Login Successful", "You have been signed in successfully.");
        setTimeout(() => {
            redirectAfterLogin(result.role);
        }, 650);
    } catch (error) {
        showMessage("error", "Login Failed", error.message || "Unable to sign in.");
    } finally {
        setLoading(false);
    }
});

runSplash();
setMode("student");

// Resolves at runtime: production HTML pages set window.RRS_API_BASE
// before this script loads.  Local dev falls back to http://localhost:5000.
const API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api/auth";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

const loginBtn = document.getElementById("loginBtn");
const btnText = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".btn-loader");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

function showMessage(type, title, text) {
    messageBox.classList.remove("hidden", "success", "error");
    messageBox.classList.add(type);

    if (type === "success") {
        messageIcon.textContent = "✓";
    } else {
        messageIcon.textContent = "!";
    }

    messageTitle.textContent = title;
    messageText.textContent = text;
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error");
}

function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
}

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;

    if (isLoading) {
        btnText.textContent = "Logging in...";
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

    if (!emailInput.value.trim()) {
        emailError.textContent = "Email is required.";
        isValid = false;
    }

    if (!passwordInput.value.trim()) {
        passwordError.textContent = "Password is required.";
        isValid = false;
    }

    return isValid;
}

async function login(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    });

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const errorMessage =
            typeof data === "string" ? data : data?.message || "Login failed.";
        throw new Error(errorMessage);
    }

    return data;
}

function saveSession(result) {
    localStorage.setItem("token", result.token || "");
    localStorage.setItem("role", result.role || "");
    localStorage.setItem("userID", String(result.userID || ""));
}

function redirectAfterLogin(role) {
    if (role === "Admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    window.location.href = "rooms.html";
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
        setLoading(true);

        const result = await login(emailInput.value.trim(), passwordInput.value.trim());
        saveSession(result);

        showMessage("success", "Login Successful", "You have been signed in successfully.");

        setTimeout(() => {
            redirectAfterLogin(result.role);
        }, 700);
    } catch (error) {
        showMessage("error", "Login Failed", error.message || "Unable to sign in.");
    } finally {
        setLoading(false);
    }
});
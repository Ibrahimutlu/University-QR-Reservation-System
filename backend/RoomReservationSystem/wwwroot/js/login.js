// Login page logic
(function () {
  // If already logged in, jump to dashboard.
  if (Auth.isAuthenticated()) {
    window.location.href = "dashboard.html";
    return;
  }

  const form        = document.getElementById("login-form");
  const errorBox    = document.getElementById("error-box");
  const submitText  = document.getElementById("submit-text");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    submitText.textContent = "Signing in…";

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await Api.login(email, password);
      Auth.save({
        token:  res.token,
        role:   res.role,
        userID: res.userID,
        email
      });
      window.location.href = "dashboard.html";
    } catch (err) {
      errorBox.textContent = err.message || "Login failed";
      errorBox.classList.remove("hidden");
      submitText.textContent = "Sign in";
    }
  });
})();

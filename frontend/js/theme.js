(function () {
  const storageKey = "roomlinkTheme";
  const root = document.documentElement;

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function savedTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch (_) {
      saved = null;
    }
    return saved === "dark" || saved === "light" ? saved : systemTheme();
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("title", theme === "dark" ? "Light mode" : "Dark mode");
      button.textContent = theme === "dark" ? "Light" : "Dark";
    });
  }

  function toggleTheme() {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, next);
    } catch (_) {
      // Theme still applies for this page load when storage is unavailable.
    }
    applyTheme(next);
  }

  function createToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.dataset.themeToggle = "true";
    button.addEventListener("click", toggleTheme);
    return button;
  }

  function mountToggle() {
    if (document.querySelector("[data-theme-toggle]")) {
      applyTheme(root.dataset.theme || savedTheme());
      return;
    }

    const host =
      document.querySelector(".topnav-right") ||
      document.querySelector(".navbar") ||
      document.querySelector(".header-container");

    if (!host) return;

    const toggle = createToggle();
    const logout = host.querySelector("#logoutBtn, .secondary-btn[onclick*='logout']");
    if (logout) {
      host.insertBefore(toggle, logout);
    } else {
      host.appendChild(toggle);
    }
    applyTheme(root.dataset.theme || savedTheme());
  }

  applyTheme(savedTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }

  window.addEventListener("roomlink:navigation-rendered", mountToggle);

  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      try {
        if (!localStorage.getItem(storageKey)) applyTheme(systemTheme());
      } catch (_) {
        applyTheme(systemTheme());
      }
    };

    if (media.addEventListener) {
      media.addEventListener("change", onSystemChange);
    } else if (media.addListener) {
      media.addListener(onSystemChange);
    }
  }
})();

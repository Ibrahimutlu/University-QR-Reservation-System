(function () {
  const storageKey = "roomlinkTheme";
  const schemeStorageKey = "roomlinkScheme";
  const schemes = [
    { key: "emerald", label: "Emerald", color: "#0b7f75" },
    { key: "indigo", label: "Indigo", color: "#4f46e5" },
    { key: "amber", label: "Amber", color: "#b45309" },
    { key: "plum", label: "Plum", color: "#a21caf" },
    { key: "slate", label: "Slate", color: "#1f2937" }
  ];
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

  function savedScheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(schemeStorageKey);
    } catch (_) {
      saved = null;
    }
    return schemes.some((scheme) => scheme.key === saved) ? saved : "emerald";
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

  function applyScheme(scheme) {
    root.dataset.scheme = scheme;
    document.querySelectorAll("[data-scheme-option]").forEach((button) => {
      const active = button.dataset.schemeOption === scheme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
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

  function selectScheme(scheme) {
    try {
      localStorage.setItem(schemeStorageKey, scheme);
    } catch (_) {
      // Scheme still applies for this page load when storage is unavailable.
    }
    applyScheme(scheme);
  }

  function createToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.dataset.themeToggle = "true";
    button.addEventListener("click", toggleTheme);
    return button;
  }

  function createSchemeSwitcher() {
    const switcher = document.createElement("div");
    switcher.className = "scheme-switcher";
    switcher.setAttribute("aria-label", "Color scheme");

    schemes.forEach((scheme) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scheme-option";
      button.dataset.schemeOption = scheme.key;
      button.style.setProperty("--scheme-color", scheme.color);
      button.setAttribute("aria-label", `${scheme.label} scheme`);
      button.title = `${scheme.label} scheme`;
      button.addEventListener("click", () => selectScheme(scheme.key));
      switcher.appendChild(button);
    });

    return switcher;
  }

  function mountToggle() {
    if (document.querySelector("[data-theme-controls]")) {
      applyTheme(root.dataset.theme || savedTheme());
      applyScheme(root.dataset.scheme || savedScheme());
      return;
    }

    const host =
      document.querySelector(".topnav-right") ||
      document.querySelector(".navbar") ||
      document.querySelector(".header-container");

    if (!host) return;

    const controls = document.createElement("div");
    controls.className = "theme-controls";
    controls.dataset.themeControls = "true";
    const toggle = createToggle();
    controls.appendChild(createSchemeSwitcher());
    controls.appendChild(toggle);

    const logout = host.querySelector("#logoutBtn, .secondary-btn[onclick*='logout']");
    if (logout) {
      host.insertBefore(controls, logout);
    } else {
      host.appendChild(controls);
    }
    applyTheme(root.dataset.theme || savedTheme());
    applyScheme(root.dataset.scheme || savedScheme());
  }

  applyTheme(savedTheme());
  applyScheme(savedScheme());

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

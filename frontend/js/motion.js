(function () {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targetSelector = [
    ".primary-btn",
    ".secondary-btn",
    ".danger-btn",
    ".action-btn",
    ".btn-primary",
    ".btn-secondary",
    ".nav-link",
    ".topnav-link",
    ".auth-mode-btn",
    ".slot-btn",
    ".mode-btn",
    "button"
  ].join(",");

  function isDisabled(el) {
    return !el || el.disabled || el.classList.contains("disabled") || el.getAttribute("aria-disabled") === "true";
  }

  function armTargets(root) {
    if (reduceMotion) return;
    root.querySelectorAll(targetSelector).forEach((el) => {
      if (!isDisabled(el)) el.classList.add("motion-target");
    });
  }

  function addRipple(target, event) {
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.35;
    const ripple = document.createElement("span");
    ripple.className = "motion-ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  function init() {
    document.body.classList.add("motion-ready");
    armTargets(document);

    if (reduceMotion) return;

    document.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest(targetSelector);
      if (!target || isDisabled(target)) return;
      target.classList.add("is-pressed");
      addRipple(target, event);
    }, { passive: true });

    document.addEventListener("pointerup", () => {
      document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
    }, { passive: true });

    document.addEventListener("pointercancel", () => {
      document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
    }, { passive: true });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) armTargets(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

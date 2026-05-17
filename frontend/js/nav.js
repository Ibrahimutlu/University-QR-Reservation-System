// Shared top navigation for utility pages (scan / print).
window.Nav = {
  render(activeKey) {
    const role = Auth.role() || "";
    const email = Auth.email() || "user@university.com";
    const initials = (email || "U").substring(0, 2).toUpperCase();

    const items = [
      { key: "rooms", label: "Rooms", href: "rooms.html" },
      { key: "my-reservations", label: "My Reservations", href: "my-reservations.html" },
      { key: "scan", label: "Scan QR", href: "scan.html" }
    ];

    if (role === "Admin" || role === "Staff") {
      items.push({ key: "admin", label: "Dashboard", href: "admin-dashboard.html" });
    }

    const linkHtml = items
      .map((it) => {
        const isActive = activeKey === it.key;
        return `<a href="${it.href}" class="topnav-link${isActive ? " active" : ""}">${it.label}</a>`;
      })
      .join("");

    const navHtml = `
      <nav class="topnav">
        <div class="topnav-inner">
          <a href="rooms.html" class="topnav-brand">
            <span class="topnav-mark">
              <img src="assets/roomlink-logo.png" alt="" aria-hidden="true" />
            </span>
            <span>
              <span class="topnav-title">RoomLink</span>
              <span class="topnav-subtitle">QR Reservation</span>
            </span>
          </a>

          <div class="topnav-links">${linkHtml}</div>

          <div class="topnav-right">
            <div class="topnav-user">
              <span class="topnav-role">${role}</span>
              <span class="topnav-email" title="${email}">${email}</span>
            </div>
            <span class="topnav-avatar">${initials}</span>
            <button type="button" class="secondary-btn" onclick="Auth.logout()">Logout</button>
          </div>
        </div>

        <div class="topnav-mobile">
          <div class="topnav-links">${linkHtml}</div>
        </div>
      </nav>`;

    document.getElementById("nav-slot").innerHTML = navHtml;
    window.dispatchEvent(new CustomEvent("roomlink:navigation-rendered"));
  }
};

window.toast = function (message, kind) {
  const host = document.createElement("div");
  host.className = "message-box " + (kind || "warning");
  host.style.position = "fixed";
  host.style.right = "16px";
  host.style.bottom = "16px";
  host.style.maxWidth = "360px";
  host.style.zIndex = "999";
  host.innerHTML = `<div class="message-icon">!</div><div class="message-content"><h4>Notice</h4><p>${message}</p></div>`;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 3500);
};

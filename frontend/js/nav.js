// Renders the shared top navigation. Each page calls Nav.render() in its <body>.
window.Nav = {
  render(activeKey) {
    const role     = Auth.role();
    const email    = Auth.email() || "user@university.com";
    const initials = (email || "U").substring(0, 2).toUpperCase();

    const items = [
      { key: "dashboard",    label: "Rooms",        href: "dashboard.html" },
      { key: "reservations", label: "My Bookings",  href: "reservations.html" },
      { key: "scan",         label: "Scan QR",      href: "scan.html" }
    ];
    if (role === "Admin") items.push({ key: "admin", label: "Admin", href: "admin.html" });

    const navHtml = `
      <nav class="topnav">
        <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="dashboard.html" class="flex items-center gap-2">
            <span class="brand-mark text-base font-bold">R</span>
            <span class="text-base font-semibold text-slate-900">RoomLink</span>
          </a>

          <div class="hidden md:flex items-center gap-1">
            ${items.map(it => `
              <a href="${it.href}"
                 class="px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${activeKey === it.key
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
                ${it.label}
              </a>`).join("")}
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right hidden sm:block">
              <div class="text-xs text-slate-500">${role || ""}</div>
              <div class="text-sm font-medium text-slate-900 truncate max-w-[180px]">${email}</div>
            </div>
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-sm font-semibold">
              ${initials}
            </div>
            <button onclick="Auth.logout()" class="btn-secondary text-sm" title="Sign out">Logout</button>
          </div>
        </div>

        <!-- Mobile nav -->
        <div class="md:hidden border-t border-slate-100">
          <div class="max-w-6xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto">
            ${items.map(it => `
              <a href="${it.href}"
                 class="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                        ${activeKey === it.key
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600'}">
                ${it.label}
              </a>`).join("")}
          </div>
        </div>
      </nav>`;

    document.getElementById("nav-slot").innerHTML = navHtml;
  }
};

// Toast helper
window.toast = function (message, kind) {
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

// icons.jsx — Lucide wrapper with currentColor inheritance.
// Use: <Icon name="qr-code" size={20} />
function Icon({ name, size = 20, color, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ icons: window.lucide.icons });
  }, [name, size]);
  return (
    <i
      ref={ref}
      data-lucide={name}
      width={size}
      height={size}
      style={{ display: "inline-flex", color: color || "currentColor", ...(style || {}) }}
    />
  );
}

Object.assign(window, { Icon });

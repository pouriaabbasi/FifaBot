import { NavLink } from "react-router-dom";

const items = [
  { to: "/leagues", icon: "🏆", label: "لیگ‌ها" },
  { to: "/profile", icon: "👤", label: "پروفایل" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

import { Search } from "lucide-react";

export function Toolbar({ title, subtitle, children }) {
  return (
    <div className="section-toolbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="toolbar-actions">{children}</div>
    </div>
  );
}

export function SearchBox({ placeholder = "Search...", value, onChange }) {
  return (
    <label className="toolbar-search">
      <Search size={15} />
      <input placeholder={placeholder} value={value} onChange={onChange} />
    </label>
  );
}

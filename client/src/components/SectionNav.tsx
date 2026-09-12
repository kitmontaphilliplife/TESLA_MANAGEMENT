export interface SectionNavItem {
  id: string;
  label: string;
}

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="section-nav">
      {items.map((item) => (
        <button key={item.id} className="section-nav-item" onClick={() => scrollTo(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

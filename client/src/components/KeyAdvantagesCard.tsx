import type { KeyAdvantageCard as Card } from "../types";
import { DebouncedInput } from "./DebouncedInput";
import { IconStar } from "../icons";

export function KeyAdvantagesCard({
  enabled,
  header,
  cards,
  onToggleEnabled,
  onHeaderCommit,
  onCardCommit,
}: {
  enabled: boolean;
  header: string;
  cards: Card[];
  onToggleEnabled: (enabled: boolean) => void;
  onHeaderCommit: (v: string) => void;
  onCardCommit: (id: string, patch: Partial<Pick<Card, "title" | "subtitle">>) => void;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconStar /> Key Advantages</div>
          <div className="card-sub">Section นี้เปิด/ปิดได้ต่อ Package (Optional)</div>
        </div>
        <div className="toggle-row">
          <span className="toggle-label">เปิดใช้งาน Section</span>
          <button className={`toggle ${enabled ? "on" : ""}`} onClick={() => onToggleEnabled(!enabled)}>
            <span className="knob" />
          </button>
        </div>
      </div>
      {enabled && (
        <div className="card-body">
          <div className="field full" style={{ marginBottom: 14 }}>
            <label className="label">Header</label>
            <DebouncedInput className="input" value={header} onCommit={onHeaderCommit} />
          </div>
          <div className="adv-grid">
            {cards.map((a, i) => (
              <div className="adv-card" key={a.id}>
                <span className="adv-num">{String(i + 1).padStart(2, "0")}</span>
                <DebouncedInput
                  className="adv-title-input"
                  value={a.title}
                  onCommit={(v) => onCardCommit(a.id, { title: v })}
                />
                <DebouncedInput
                  as="textarea"
                  className="adv-sub-input"
                  value={a.subtitle}
                  onCommit={(v) => onCardCommit(a.id, { subtitle: v })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

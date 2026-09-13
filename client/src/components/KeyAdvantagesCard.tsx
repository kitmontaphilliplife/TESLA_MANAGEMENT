import { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import type { KeyAdvantageCard as Card, KeyFeatureMaster } from "../types";
import { IconStar, IconImage, IconClose } from "../icons";
import { DebouncedInput } from "./DebouncedInput";
import { api } from "../api";

export function KeyAdvantagesCard({
  header,
  cards,
  onHeaderCommit,
  onCardCommit,
}: {
  header: string;
  cards: Card[];
  onHeaderCommit: (v: string) => void;
  onCardCommit: (id: string, patch: Partial<Pick<Card, "title" | "subtitle" | "image">>) => void;
}) {
  const [masters, setMasters] = useState<KeyFeatureMaster[]>([]);

  useEffect(() => {
    api.listKeyFeatureMasters().then(setMasters).catch(() => setMasters([]));
  }, []);

  const topicOptions = masters
    .filter((m) => m.section === "key_advantages" && m.system === "ONLINE")
    .map((m) => ({ label: m.feature, value: m.feature }));

  // A topic already picked on another card can't be picked again — same rule as Key Features.
  function topicOptionsFor(current: Card) {
    const usedElsewhere = new Set(cards.filter((c) => c.id !== current.id && c.title).map((c) => c.title));
    return topicOptions.filter((o) => !usedElsewhere.has(o.value));
  }

  function handleTopicChange(card: Card, title: string) {
    // Same feature name can exist under both key_features and key_advantages (or other
    // channels) — must match on section+system too, or this can pick up a different
    // section's master row (and its icon) that just happens to share the same label.
    const master = masters.find((m) => m.feature === title && m.section === "key_advantages" && m.system === "ONLINE");
    onCardCommit(card.id, master ? { title, subtitle: master.detailFeature, image: master.iconImage } : { title });
  }

  function handleClear(card: Card) {
    onCardCommit(card.id, { title: "", subtitle: "", image: null });
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconStar /> Key Advantages</div>
        </div>
      </div>
      <div className="card-body">
        <div className="field full" style={{ marginBottom: 14 }}>
          <label className="label">จุดเด่นของแผนประกันนี้</label>
          <DebouncedInput className="input" value={header} onCommit={onHeaderCommit} />
        </div>
        <div className="adv-grid">
          {cards.map((a) => (
            <div className="adv-card" key={a.id}>
              <div className="upload-box adv-card-image" style={{ height: 250, padding: a.image ? 0 : undefined, position: "relative" }}>
                {a.image ? (
                  <img src={`/uploads/${a.image}`} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <>
                    <IconImage />
                    <div className="upload-sub">มาจาก Master Setup — เลือกหัวข้อเพื่อแสดงรูป</div>
                  </>
                )}
                {(a.title || a.subtitle || a.image) && (
                  <button
                    className="icon-btn"
                    style={{ position: "absolute", top: 6, right: 6, background: "#fff" }}
                    onClick={(e) => { e.stopPropagation(); handleClear(a); }}
                    title="ล้างข้อมูลการ์ดนี้"
                  >
                    <IconClose />
                  </button>
                )}
              </div>
              <Dropdown
                className="select adv-topic-select"
                value={a.title}
                options={topicOptionsFor(a)}
                onChange={(e) => handleTopicChange(a, e.value)}
                placeholder="Select topic"
              />
              <input
                className="input kf-value-readonly"
                value={a.subtitle}
                readOnly
                title="ค่านี้มาจาก Master Setup — แก้ไขได้ที่ Master Setup เท่านั้น"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

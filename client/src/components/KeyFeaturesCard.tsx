import type { ChannelContent, KeyFeature } from "../types";
import { FeatureIcon, IconTrash, IconShieldOutline } from "../icons";
import { DebouncedInput } from "./DebouncedInput";

export function KeyFeaturesCard({
  content,
  onAdd,
  onEdit,
  onToggleHighlight,
  onRemove,
  onContractualPayoutChange,
}: {
  content: ChannelContent;
  onAdd: () => void;
  onEdit: (id: string, patch: Partial<Pick<KeyFeature, "topic" | "value">>) => void;
  onToggleHighlight: (id: string, highlight: boolean) => void;
  onRemove: (id: string) => void;
  onContractualPayoutChange: (patch: Partial<{ value: string; active: boolean }>) => void;
}) {
  const isOnline = content.channelType === "ONLINE";
  const features = content.keyFeatures;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconShieldOutline /> Key Features of the Insurance Plan</div>
          <div className="card-sub">จุดเด่นของแบบประกันภัย — จำนวนแถวปรับได้ตามสินค้า (Dynamic)</div>
        </div>
        <span className="badge badge-blue">{features.length} แถว</span>
      </div>
      <div className="card-body">
        {isOnline && (
          <div className="field" style={{ marginBottom: 14, maxWidth: 260 }}>
            <label className="label">Icon Asset (ชุดไอคอน)</label>
            <select className="select" defaultValue={content.iconAsset ?? ""}>
              <option value="myxtra-logo">ชุดไอคอน — ออมทรัพย์ (Standard)</option>
            </select>
          </div>
        )}

        {features.map((f) => (
          <div className="kf-row" key={f.id}>
            {isOnline && (
              <div className="kf-icon">
                <FeatureIcon name={f.icon} />
              </div>
            )}
            <div className="kf-body">
              <DebouncedInput
                className="kf-topic-input"
                value={f.topic}
                onCommit={(v) => onEdit(f.id, { topic: v })}
              />
              <DebouncedInput
                className="kf-value-input"
                value={f.value}
                onCommit={(v) => onEdit(f.id, { value: v })}
              />
            </div>
            <div className="kf-actions">
              {isOnline && (
                <div className="toggle-row">
                  <span className="toggle-label">ไฮไลท์</span>
                  <button
                    className={`toggle ${f.highlight ? "on" : ""}`}
                    onClick={() => onToggleHighlight(f.id, !f.highlight)}
                    title="แสดงป้ายไฮไลท์ (เช่น จ่ายผลประโยชน์ตามสัญญา)"
                  >
                    <span className="knob" />
                  </button>
                </div>
              )}
              <button className="icon-btn" onClick={() => onRemove(f.id)} title="ลบแถวนี้">
                <IconTrash />
              </button>
            </div>
          </div>
        ))}

        {isOnline && content.contractualPayout && (
          <div className="kf-row" key="contractual-payout">
            <div className="kf-body">
              <div className="kf-topic-input" style={{ color: "var(--gray-500)" }}>
                Contractual payout
              </div>
              <DebouncedInput
                className="kf-value-input"
                value={content.contractualPayout.value}
                onCommit={(v) => onContractualPayoutChange({ value: v })}
              />
            </div>
            <div className="kf-actions">
              <div className="toggle-row">
                <span className="toggle-label">Active</span>
                <button
                  className={`toggle ${content.contractualPayout.active ? "on" : ""}`}
                  onClick={() => onContractualPayoutChange({ active: !content.contractualPayout!.active })}
                >
                  <span className="knob" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="dashed-btn" onClick={onAdd}>
            + เพิ่มแถว Key Feature
          </button>
        </div>
      </div>
    </div>
  );
}

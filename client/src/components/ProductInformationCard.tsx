import type { ChannelContent, ProductInfoItem } from "../types";
import { DebouncedInput } from "./DebouncedInput";
import { IconTrash, IconInfo } from "../icons";

type GroupType = "insurance_type" | "additional_coverage" | "highlight";

const GROUP_LABELS: Record<GroupType, string> = {
  insurance_type: "แบบประกัน",
  additional_coverage: "ความคุ้มครองเพิ่มเติม",
  highlight: "จุดเด่น",
};

function ItemGroup({
  groupType,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  groupType: GroupType;
  items: ProductInfoItem[];
  onAdd: (groupType: GroupType) => void;
  onEdit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="label" style={{ display: "block", marginBottom: 8 }}>
        {GROUP_LABELS[groupType]}
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DebouncedInput className="input" value={item.label} onCommit={(v) => onEdit(item.id, v)} />
            <button className="icon-btn" onClick={() => onRemove(item.id)} title="ลบรายการนี้">
              <IconTrash />
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="upload-sub">ยังไม่มีรายการ</div>}
        <button className="dashed-btn" style={{ padding: 8 }} onClick={() => onAdd(groupType)}>
          + เพิ่มรายการ
        </button>
      </div>
    </div>
  );
}

export function ProductInformationCard({
  content,
  onSetProductType,
  onAddItem,
  onEditItem,
  onRemoveItem,
}: {
  content: ChannelContent;
  onSetProductType: (productType: "Normal" | "Takaful") => void;
  onAddItem: (groupType: GroupType) => void;
  onEditItem: (id: string, label: string) => void;
  onRemoveItem: (id: string) => void;
}) {
  if (!content.productInformation) return null;
  const info = content.productInformation;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconInfo /> Product information</div>
          <div className="card-sub">ข้อมูลสำหรับตัวแทนใช้ประกอบการเสนอขาย (เฉพาะช่องทาง F2F)</div>
        </div>
      </div>
      <div className="card-body">
        <div className="field" style={{ marginBottom: 18 }}>
          <label className="label">Product Type</label>
          <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
            {(["Normal", "Takaful"] as const).map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input type="radio" checked={content.productType === t} onChange={() => onSetProductType(t)} />
                {t}
              </label>
            ))}
          </div>
        </div>

        <ItemGroup groupType="insurance_type" items={info.insuranceTypes} onAdd={onAddItem} onEdit={onEditItem} onRemove={onRemoveItem} />
        <ItemGroup groupType="additional_coverage" items={info.additionalCoverages} onAdd={onAddItem} onEdit={onEditItem} onRemove={onRemoveItem} />
        <ItemGroup groupType="highlight" items={info.highlights} onAdd={onAddItem} onEdit={onEditItem} onRemove={onRemoveItem} />
      </div>
    </div>
  );
}

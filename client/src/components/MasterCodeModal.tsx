import { useState } from "react";
import type { MasterCode, MasterCodeCategory } from "../types";
import { IconClose, IconSave, IconTag } from "../icons";

export function MasterCodeModal({
  category,
  editing,
  onClose,
  onSave,
}: {
  category: MasterCodeCategory;
  editing: MasterCode | null;
  onClose: () => void;
  onSave: (data: { codeId: string; nameEn: string; nameTh: string; channelGroup?: string }) => Promise<void>;
}) {
  const [codeId, setCodeId] = useState(editing?.codeId ?? "");
  const [nameEn, setNameEn] = useState(editing?.nameEn ?? "");
  const [nameTh, setNameTh] = useState(editing?.nameTh ?? "");
  const [channelGroup, setChannelGroup] = useState(editing?.channelGroup ?? "UNMAPPED");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDistributionChannel = category === "distribution_channel";

  async function handleSave() {
    if (!codeId.trim() || !nameEn.trim() || !nameTh.trim()) {
      setError("กรอก Code ID, Name EN, Name TH ให้ครบ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ codeId: codeId.trim(), nameEn: nameEn.trim(), nameTh: nameTh.trim(), channelGroup: isDistributionChannel ? channelGroup : undefined });
    } catch (e: any) {
      setError(String(e.message ?? e));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title"><IconTag /> {editing ? "Edit" : "Add"} Code</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="ปิด">
            <IconClose />
          </button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label">Code ID *</label>
            <input className="input" value={codeId} onChange={(e) => setCodeId(e.target.value)} disabled={!!editing} />
          </div>
          <div className="field">
            <label className="label">Name EN *</label>
            <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Name TH *</label>
            <input className="input" value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
          </div>
          {isDistributionChannel && (
            <div className="field">
              <label className="label">Group (F2F / Online)</label>
              <select
                className="select"
                value={channelGroup ?? "UNMAPPED"}
                onChange={(e) => setChannelGroup(e.target.value as "F2F" | "ONLINE" | "UNMAPPED")}
              >
                <option value="F2F">F2F</option>
                <option value="ONLINE">ONLINE</option>
                <option value="UNMAPPED">UNMAPPED (ยังไม่ยืนยัน)</option>
              </select>
            </div>
          )}
          {error && <div className="readonly-note">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            <IconClose /> Cancel
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            <IconSave /> {saving ? "กำลังบันทึก…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

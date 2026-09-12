import { useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { MasterCode, MasterCodeCategory } from "../types";
import { IconClose, IconSave, IconTag, IconEye } from "../icons";

const CHANNEL_GROUP_OPTIONS = [
  { label: "F2F", value: "F2F" },
  { label: "ONLINE", value: "ONLINE" },
  { label: "UNMAPPED (ยังไม่ยืนยัน)", value: "UNMAPPED" },
];

export function MasterCodeModal({
  category,
  editing,
  readOnly = false,
  onClose,
  onSave,
}: {
  category: MasterCodeCategory;
  editing: MasterCode | null;
  readOnly?: boolean;
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
    <Dialog
      visible
      onHide={onClose}
      header={
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconTag /> {readOnly ? "View" : editing ? "Edit" : "Add"} Code
          {readOnly && (
            <span className="read-only-badge">
              <IconEye /> อ่านอย่างเดียว
            </span>
          )}
        </span>
      }
      style={{ width: 440 }}
      footer={
        readOnly ? (
          <Button label="Close" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />
        ) : (
          <>
            <Button label="Cancel" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />
            <Button label={saving ? "กำลังบันทึก…" : "Save"} icon={<IconSave />} disabled={saving} onClick={handleSave} />
          </>
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <label className="label">Code ID *</label>
          <InputText className="input" value={codeId} onChange={(e) => setCodeId(e.target.value)} disabled={readOnly || !!editing} />
        </div>
        <div className="field">
          <label className="label">Name EN *</label>
          <InputText className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} disabled={readOnly} />
        </div>
        <div className="field">
          <label className="label">Name TH *</label>
          <InputText className="input" value={nameTh} onChange={(e) => setNameTh(e.target.value)} disabled={readOnly} />
        </div>
        {isDistributionChannel && (
          <div className="field">
            <label className="label">Group (F2F / Online)</label>
            <Dropdown
              className="select"
              value={channelGroup ?? "UNMAPPED"}
              options={CHANNEL_GROUP_OPTIONS}
              onChange={(e) => setChannelGroup(e.value)}
              disabled={readOnly}
            />
          </div>
        )}
        {error && <div className="readonly-note">{error}</div>}
      </div>
    </Dialog>
  );
}

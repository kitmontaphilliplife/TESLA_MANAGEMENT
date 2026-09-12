import { useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { api } from "../api";
import { IconClose, IconRefresh, IconSave, IconPackage } from "../icons";

const MAX_LENGTH = 10000;

const ERROR_MESSAGES: Record<string, string> = {
  payload_required: "กรุณาวาง payload ก่อนบันทึก",
  missing_required_fields: "Payload ต้องมีอย่างน้อย plan_Code, plan_Name_En และ plan_Name_Th",
  plan_code_exists: "มี Plan Code นี้อยู่ในระบบแล้ว",
  plan_code_mismatch: "plan_Code ใน payload ไม่ตรงกับ Product ที่กำลังแก้ไข",
  not_found: "ไม่พบ Product นี้แล้ว",
};

export function PayloadModal({
  mode,
  planCode,
  initialText = "",
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  planCode?: string;
  initialText?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    setText(initialText);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    if (!text.trim()) {
      setError(ERROR_MESSAGES.payload_required);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบ payload ที่วาง");
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        await api.createProductFromPayload(parsed);
      } else {
        await api.updateProductPayload(planCode!, parsed);
      }
      onSaved();
    } catch (e: any) {
      const key = String(e.message ?? e);
      setError(ERROR_MESSAGES[key] ?? key);
      setSaving(false);
    }
  }

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconPackage /> {mode === "add" ? "Add Package" : "Edit Package"}
        </span>
      }
      style={{ width: 640 }}
      footer={
        <>
          <Button label="Cancel" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />
          <Button label="Reset" icon={<IconRefresh />} outlined severity="secondary" onClick={handleReset} />
          <Button label={saving ? "กำลังบันทึก…" : "Save"} icon={<IconSave />} disabled={saving} onClick={handleSave} />
        </>
      }
    >
      <div className="field" style={{ border: "1px solid var(--gray-200)", borderRadius: 12, padding: 16 }}>
        <label className="label" style={{ color: "var(--navy)", fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
          Payload
        </label>
        <InputTextarea
          className="textarea"
          style={{ width: "100%", minHeight: 260, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="วาง TESLA_MASTER payload (JSON) ที่นี่..."
        />
        <div className="upload-sub" style={{ textAlign: "right", marginTop: 4 }}>
          {text.length}/{MAX_LENGTH}
        </div>
      </div>

      {error && (
        <div className="readonly-note" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </Dialog>
  );
}

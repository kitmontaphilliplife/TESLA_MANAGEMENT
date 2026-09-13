import { useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from "primereact/button";
import type { KeyFeatureMaster, KeyFeatureSection } from "../types";
import { KEY_FEATURE_SECTIONS, KEY_FEATURE_SECTION_LABEL } from "../types";
import { api } from "../api";
import { ImageUploadBox } from "./ImageUploadBox";
import { IconClose, IconSave, IconStar, IconUpload } from "../icons";

const SYSTEM_OPTIONS = [
  { label: "F2F", value: "F2F" },
  { label: "Online", value: "ONLINE" },
];
const SECTION_OPTIONS = KEY_FEATURE_SECTIONS.map((s) => ({ label: KEY_FEATURE_SECTION_LABEL[s], value: s }));

export function KeyFeatureModal({
  editing,
  readOnly = false,
  onClose,
  onSave,
  onSaved,
  onChanged,
}: {
  editing: KeyFeatureMaster | null;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (data: { feature: string; detailFeature: string; section: KeyFeatureSection; system: "F2F" | "ONLINE" }) => Promise<KeyFeatureMaster>;
  onSaved: () => void;
  onChanged: () => void;
}) {
  const [feature, setFeature] = useState(editing?.feature ?? "");
  const [detailFeature, setDetailFeature] = useState(editing?.detailFeature ?? "");
  const [section, setSection] = useState<KeyFeatureSection>(editing?.section ?? "key_features");
  const [system, setSystem] = useState<"F2F" | "ONLINE">(editing?.system ?? "F2F");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add mode has no id yet (icon upload needs one), so the picked file is staged locally
  // and only uploaded once Save has created the row.
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
  const [pendingIconPreview, setPendingIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickPendingIcon(file: File | null) {
    setPendingIconFile(file);
    setPendingIconPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSave() {
    if (!feature.trim()) {
      setError("กรอก Feature ให้ครบ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave({ feature: feature.trim(), detailFeature: detailFeature.trim(), section, system });
      if (!editing && pendingIconFile) {
        await api.uploadKeyFeatureIcon(saved.id, pendingIconFile);
      }
      onSaved();
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
          <IconStar /> {readOnly ? "View" : editing ? "Edit" : "Add"} Key Feature
          {editing && <span className="chip" style={{ marginLeft: 4 }}>{editing.codeId}</span>}
        </span>
      }
      style={{ width: 460 }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label className="label">Icon</label>
          {editing ? (
            <ImageUploadBox
              image={editing.iconImage}
              height={100}
              sublabel="JPG/PNG/WEBP/SVG · max 5MB"
              onUpload={async (file) => {
                await api.uploadKeyFeatureIcon(editing.id, file);
                onChanged();
              }}
              onRemove={async () => {
                await api.removeKeyFeatureIcon(editing.id);
                onChanged();
              }}
            />
          ) : (
            <div
              className="upload-box"
              style={{ height: 100, position: "relative", padding: pendingIconPreview ? 0 : undefined, overflow: "hidden", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  pickPendingIcon(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              {pendingIconPreview ? (
                <>
                  <img src={pendingIconPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    className="icon-btn"
                    style={{ position: "absolute", top: 6, right: 6, background: "#fff" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      pickPendingIcon(null);
                    }}
                    title="เอารูปออก"
                  >
                    <IconClose />
                  </button>
                </>
              ) : (
                <>
                  <IconUpload />
                  <div className="upload-sub">Click to upload</div>
                  <div className="upload-sub">JPG/PNG/WEBP/SVG · max 5MB</div>
                </>
              )}
            </div>
          )}
        </div>

        <FloatLabel>
          <InputText id="kf-feature" className="input" value={feature} onChange={(e) => setFeature(e.target.value)} disabled={readOnly} />
          <label htmlFor="kf-feature">Feature *</label>
        </FloatLabel>

        <FloatLabel>
          <InputText id="kf-detail" className="input" value={detailFeature} onChange={(e) => setDetailFeature(e.target.value)} disabled={readOnly} />
          <label htmlFor="kf-detail">Detail Feature</label>
        </FloatLabel>

        <FloatLabel>
          <Dropdown
            inputId="kf-section"
            className="select"
            style={{ width: "100%" }}
            value={section}
            options={SECTION_OPTIONS}
            onChange={(e) => setSection(e.value)}
            disabled={readOnly}
          />
          <label htmlFor="kf-section">Section</label>
        </FloatLabel>

        <FloatLabel>
          <Dropdown
            inputId="kf-system"
            className="select"
            style={{ width: "100%" }}
            value={system}
            options={SYSTEM_OPTIONS}
            onChange={(e) => setSystem(e.value)}
            disabled={readOnly}
          />
          <label htmlFor="kf-system">System</label>
        </FloatLabel>

        {error && <div className="readonly-note">{error}</div>}
      </div>
    </Dialog>
  );
}

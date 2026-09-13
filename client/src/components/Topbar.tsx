import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import type { PackageDetail } from "../types";
import { IconArrowLeft, IconSave, IconSend, IconClock, IconEye, IconLiveTv, IconEdit, IconTag, IconLayers } from "../icons";

const STATUS_LABEL: Record<PackageDetail["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  inactive: "Inactive",
};
const STATUS_SEVERITY: Record<PackageDetail["status"], "secondary" | "warning" | "success"> = {
  draft: "secondary",
  pending_approval: "warning",
  active: "success",
  inactive: "secondary",
};

export function Topbar({
  pkg,
  saving,
  readOnly,
  submitDisabled,
  previewAvailable,
  previewOn,
  onTogglePreview,
  onSaveDraft,
  onSaveAndClose,
  onSubmit,
  onBack,
}: {
  pkg: PackageDetail;
  saving: boolean;
  readOnly: boolean;
  submitDisabled: boolean;
  previewAvailable: boolean;
  previewOn: boolean;
  onTogglePreview: () => void;
  onSaveDraft: () => void;
  onSaveAndClose: () => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="topbar">
      <div className="crumb">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
          <IconArrowLeft /> Package List
        </a>
        / <b>Package Configuration</b>
      </div>
      <div className="title-row">
        <div className="title-left">
          <div className="title">
            {pkg.product.planCode} · {pkg.product.nameTh}
            {!readOnly && (
              <span className="title-edit-icon" title="แก้ไขชื่อ Package ผ่าน Master Setup → Package">
                <IconEdit />
              </span>
            )}
          </div>
          <Tag value={STATUS_LABEL[pkg.status]} severity={STATUS_SEVERITY[pkg.status]} />
        </div>
        <div className="title-actions">
          {readOnly ? (
            <span className="read-only-badge"><IconEye /> อ่านอย่างเดียว</span>
          ) : (
            <>
              {saving && <span className="save-status">กำลังบันทึก…</span>}
              {previewAvailable && (
                <button className={`preview-toggle ${previewOn ? "on" : ""}`} onClick={onTogglePreview}>
                  <IconLiveTv /> Preview
                </button>
              )}
              <Button label="Save & Close" icon={<IconSave />} outlined severity="secondary" onClick={onSaveAndClose} />
              <Button label="Save" icon={<IconSave />} outlined severity="secondary" onClick={onSaveDraft} />
              <Button
                label={pkg.status === "pending_approval" ? "รออนุมัติ" : "Submit"}
                icon={pkg.status === "pending_approval" ? <IconClock /> : <IconSend />}
                onClick={onSubmit}
                disabled={pkg.status === "pending_approval" || submitDisabled}
              />
            </>
          )}
        </div>
      </div>
      <div className="topbar-meta">
        <span className="topbar-meta-item"><IconTag /> {pkg.product.planCode}</span>
        <span className="topbar-meta-divider" />
        <span className="topbar-meta-item"><IconLayers /> {pkg.product.category}</span>
        <span className="topbar-meta-divider" />
        <span className="topbar-meta-item"><IconClock /> Eff Date : {pkg.product.startDate ?? "-"}</span>
        <span className="topbar-meta-divider" />
        <span className="topbar-meta-item"><IconClock /> Exp Date : {pkg.product.endDate ?? "ไม่มีกำหนด"}</span>
      </div>
    </div>
  );
}

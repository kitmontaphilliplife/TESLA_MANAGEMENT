import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import type { PackageDetail } from "../types";
import { IconArrowLeft, IconSave, IconSend, IconClock, IconEye } from "../icons";

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
  onSaveDraft,
  onSubmit,
  onBack,
}: {
  pkg: PackageDetail;
  saving: boolean;
  readOnly: boolean;
  onSaveDraft: () => void;
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
          </div>
          <Tag value={STATUS_LABEL[pkg.status]} severity={STATUS_SEVERITY[pkg.status]} />
        </div>
        <div className="title-actions">
          {readOnly ? (
            <span className="read-only-badge"><IconEye /> อ่านอย่างเดียว</span>
          ) : (
            <>
              {saving ? <span className="save-status">กำลังบันทึก…</span> : <span className="save-status">บันทึกอัตโนมัติแล้ว</span>}
              <Button label="บันทึกฉบับร่าง" icon={<IconSave />} outlined severity="secondary" onClick={onSaveDraft} />
              <Button
                label={pkg.status === "pending_approval" ? "รออนุมัติ" : "ส่งขออนุมัติ"}
                icon={pkg.status === "pending_approval" ? <IconClock /> : <IconSend />}
                onClick={onSubmit}
                disabled={pkg.status === "pending_approval"}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

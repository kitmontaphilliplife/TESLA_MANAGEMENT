import type { PackageDetail } from "../types";
import { IconArrowLeft, IconSave, IconSend, IconClock, IconEye } from "../icons";

const STATUS_LABEL: Record<PackageDetail["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  inactive: "Inactive",
};
const STATUS_CLASS: Record<PackageDetail["status"], string> = {
  draft: "badge-gray",
  pending_approval: "badge-amber",
  active: "badge-green",
  inactive: "badge-gray",
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
          <span className={`badge ${STATUS_CLASS[pkg.status]}`}>{STATUS_LABEL[pkg.status]}</span>
        </div>
        <div className="title-actions">
          {readOnly ? (
            <span className="read-only-badge"><IconEye /> อ่านอย่างเดียว</span>
          ) : (
            <>
              {saving ? <span className="save-status">กำลังบันทึก…</span> : <span className="save-status">บันทึกอัตโนมัติแล้ว</span>}
              <button className="btn btn-secondary" onClick={onSaveDraft}>
                <IconSave /> บันทึกฉบับร่าง
              </button>
              <button className="btn btn-primary" onClick={onSubmit} disabled={pkg.status === "pending_approval"}>
                {pkg.status === "pending_approval" ? <IconClock /> : <IconSend />}
                {pkg.status === "pending_approval" ? "รออนุมัติ" : "ส่งขออนุมัติ"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

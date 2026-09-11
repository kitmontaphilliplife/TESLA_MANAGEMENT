import type { PackageDetail } from "../types";

export function InfoBar({ pkg }: { pkg: PackageDetail }) {
  const groups = Array.from(new Set(pkg.product.channels.map((c) => c.group))).filter((g) => g !== "UNMAPPED");

  return (
    <div className="infobar">
      <div className="infobar-item">
        <span className="infobar-label">Plan Code</span>
        <span className="infobar-value">{pkg.product.planCode}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label">ชื่อ EN</span>
        <span className="infobar-value">{pkg.product.nameEn}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label">หมวด</span>
        <span className="infobar-value">{pkg.product.category}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label">Eff / Exp Date</span>
        <span className="infobar-value">
          {pkg.product.startDate ?? "-"} – {pkg.product.endDate ?? "ไม่มีกำหนด"}
        </span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label">Channel Group</span>
        <span className="infobar-value">{groups.join(" + ") || "-"}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label">แก้ไขล่าสุด</span>
        <span className="infobar-value">
          {pkg.updatedAt} · {pkg.updatedBy}
        </span>
      </div>
    </div>
  );
}

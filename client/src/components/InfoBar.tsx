import type { PackageDetail } from "../types";
import { IconTag, IconDoc, IconLayers, IconClock, IconBroadcast } from "../icons";

export function InfoBar({ pkg }: { pkg: PackageDetail }) {
  const groups = Array.from(new Set(pkg.product.channels.map((c) => c.group))).filter((g) => g !== "UNMAPPED");

  return (
    <div className="infobar">
      <div className="infobar-item">
        <span className="infobar-label"><IconTag /> Plan Code</span>
        <span className="infobar-value">{pkg.product.planCode}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label"><IconDoc /> ชื่อ EN</span>
        <span className="infobar-value">{pkg.product.nameEn}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label"><IconLayers /> หมวด</span>
        <span className="infobar-value">{pkg.product.category}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label"><IconClock /> Eff / Exp Date</span>
        <span className="infobar-value">
          {pkg.product.startDate ?? "-"} – {pkg.product.endDate ?? "ไม่มีกำหนด"}
        </span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label"><IconBroadcast /> Channel Group</span>
        <span className="infobar-value">{groups.join(" + ") || "-"}</span>
      </div>
      <div className="infobar-item">
        <span className="infobar-label"><IconClock /> แก้ไขล่าสุด</span>
        <span className="infobar-value">
          {pkg.updatedAt} · {pkg.updatedBy}
        </span>
      </div>
    </div>
  );
}

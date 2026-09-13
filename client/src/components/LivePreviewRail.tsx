import type { ChannelContent, PackageDetail } from "../types";
import { IconClose } from "../icons";

export function LivePreviewRail({
  pkg,
  content,
  onClose,
}: {
  pkg: PackageDetail;
  content: ChannelContent;
  onClose: () => void;
}) {
  return (
    <div className="live-preview-rail">
      <div className="live-preview-head">
        <span>Live preview</span>
        <button className="icon-btn" onClick={onClose} title="ปิดพรีวิว">
          <IconClose />
        </button>
      </div>
      <div className="live-preview-page">
        <div className="live-preview-hero">
          <div className="live-preview-hero-title">{content.banner.title || "Protection that grows with you"}</div>
          <div className="live-preview-hero-sub">{content.banner.subtitle || "-"}</div>
        </div>
        <div className="live-preview-body">
          <div className="live-preview-title">{pkg.product.nameEn}</div>
          <div className="live-preview-code">
            {pkg.product.planCode} · {pkg.product.category}
          </div>
          <div className="live-preview-features">
            {content.keyFeatures.map((f) => (
              <div className="live-preview-feature-row" key={f.id}>
                <span className="live-preview-feature-topic">{f.topic}</span>
                <span className="live-preview-feature-value">{f.value}</span>
              </div>
            ))}
            {content.keyFeatures.length === 0 && <div className="search-empty">ยังไม่มี Key Feature</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CampaignCardPreview({
  packageTitle,
  packageCode,
  category,
  ribbonText,
}: {
  packageTitle: string;
  packageCode: string;
  category: string;
  ribbonText: string;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">Card preview</div>
          <div className="card-sub">หน้าตาการ์ดที่ลูกค้าจะเห็นเมื่อ Campaign นี้ Active</div>
        </div>
      </div>
      <div className="card-body">
        <div className="campaign-card-preview">
          <div className="campaign-card-preview-hero">
            <span className="campaign-card-preview-ribbon">{ribbonText || "Campaign ribbon"}</span>
          </div>
          <div className="campaign-card-preview-body">
            <div className="campaign-card-preview-title">{packageTitle}</div>
            <div className="campaign-card-preview-sub">
              {packageCode} · {category}
            </div>
            <div className="campaign-card-preview-cta-row">
              <button className="btn btn-primary" tabIndex={-1}>
                See plan
              </button>
            </div>
          </div>
        </div>
        <div className="campaign-card-preview-note">
          Overlapping campaigns on the same package are not allowed — the schedule above blocks conflicting dates as you save.
        </div>
      </div>
    </div>
  );
}

import type { AuditEntry, Campaign } from "../types";
import { IconCampaign, IconClock } from "../icons";

export function CampaignPanel({ campaign }: { campaign: Campaign | null }) {
  return (
    <>
      <div className="side-title"><IconCampaign /> Campaign</div>
      <div className="card">
        <div className="card-body campaign-card">
          {campaign ? (
            <>
              <span className="badge badge-blue" style={{ width: "fit-content" }}>
                Linked Campaign
              </span>
              <div className="campaign-name">{campaign.name}</div>
              <div className="campaign-meta">
                {campaign.startDate} – {campaign.endDate} · {campaign.discountLabel}
              </div>
              <a href="#">จัดการใน Campaign Setting →</a>
            </>
          ) : (
            <div className="campaign-meta">ยังไม่มี Campaign ผูกกับ Package นี้</div>
          )}
        </div>
      </div>
    </>
  );
}

export function ApprovalHistoryPanel({ auditLog }: { auditLog: AuditEntry[] }) {
  return (
    <div className="card">
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="side-title" style={{ padding: 0 }}>
          <IconClock /> Approval History
        </div>
        <div className="timeline">
          {auditLog.length === 0 && <div className="campaign-meta">ยังไม่มีประวัติ</div>}
          {auditLog.map((entry, i) => (
            <div className="tl-item" key={i}>
              <span className="tl-dot" />
              <span>
                <b>{entry.created_at}</b> — {entry.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

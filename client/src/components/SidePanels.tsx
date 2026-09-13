import { useEffect, useMemo, useState } from "react";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import type { AuditEntry, Campaign, CampaignListItem, ChannelType } from "../types";
import { api } from "../api";
import { campaignStatus } from "../campaignStatus";
import { IconCampaign, IconClock, IconPlus, IconCheckCircle, IconCancel, IconCalendar, IconEye, IconClose, IconSearch } from "../icons";

export function CampaignPanel({
  planCode,
  channelType,
  onOpenCampaign,
}: {
  planCode: string;
  channelType: ChannelType;
  onOpenCampaign: (campaignId: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAttach, setShowAttach] = useState(false);

  function reload() {
    api
      .listCampaignsForPackage(planCode)
      .then((rows) => setCampaigns(rows.find((r) => r.channelType === channelType)?.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }
  useEffect(reload, [planCode, channelType]);

  return (
    <>
      <div className="card">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="side-title" style={{ padding: 0 }}>
            <IconCampaign /> Campaign
          </div>
          <button className="btn btn-primary campaign-add-btn" onClick={() => setShowAttach(true)}>
            <IconPlus /> Attach Campaign
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="side-title" style={{ padding: 0 }}>
            Campaign History
          </div>
          {campaigns.length === 0 && <div className="campaign-meta">ยังไม่มี Campaign ผูกกับ Package นี้</div>}
          <div className="campaign-history-list">
            {campaigns.map((c) => {
              const status = campaignStatus(c.startDate, c.endDate);
              const expired = status === "ended";
              return (
                <div className="campaign-history-entry" key={c.id}>
                  <div className={`campaign-history-status ${expired ? "expired" : "active"}`}>
                    <IconClock />
                    <Tag
                      severity={expired ? "danger" : "success"}
                      icon={expired ? <IconCancel /> : <IconCheckCircle />}
                      value={expired ? "Expirey" : "Active"}
                    />
                  </div>
                  <div className="campaign-history-card">
                    <div className="campaign-history-body">
                      <div className="campaign-history-name">{c.name}</div>
                      <div className="campaign-history-date"><IconCalendar /> Effective Date : {c.startDate}</div>
                      <div className="campaign-history-date"><IconCalendar /> Expiry Date : {c.endDate}</div>
                    </div>
                    <button className="icon-btn campaign-history-view" onClick={() => onOpenCampaign(c.id)} title="ดูรายละเอียด">
                      <IconEye />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAttach && (
        <AttachCampaignDialog
          planCode={planCode}
          channelType={channelType}
          onClose={() => setShowAttach(false)}
          onAttached={() => {
            setShowAttach(false);
            reload();
          }}
        />
      )}
    </>
  );
}

// Picks from EXISTING campaigns and attaches one to this package/channel —
// campaigns are created independently (Campaign menu), this only links them.
function AttachCampaignDialog({
  planCode,
  channelType,
  onClose,
  onAttached,
}: {
  planCode: string;
  channelType: ChannelType;
  onClose: () => void;
  onAttached: () => void;
}) {
  const [campaigns, setCampaigns] = useState<CampaignListItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.listCampaigns().then(setCampaigns);
  }, []);

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [campaigns, query]);

  function isAttached(c: CampaignListItem) {
    return c.attachments.some((a) => a.planCode === planCode && a.channelType === channelType);
  }

  async function attach(c: CampaignListItem) {
    setBusyId(c.id);
    setErr(null);
    try {
      await api.attachCampaign(c.id, { planCode, channelType });
      onAttached();
    } catch (e: any) {
      const code = String(e.message ?? e);
      setErr(code === "campaign_overlap" ? "ช่วงวันที่ของ Campaign นี้ทับซ้อนกับ Campaign อื่นบน Package/Channel นี้อยู่" : code);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog
      visible
      onHide={onClose}
      header="Attach Campaign — เลือก Campaign ที่มีอยู่"
      style={{ width: 480 }}
      footer={<Button label="ปิด" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />}
    >
      <div className="search-box" style={{ marginBottom: 12 }}>
        <div className="search-inner">
          <IconSearch />
          <input placeholder="ค้นหาชื่อ Campaign…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </div>
      </div>
      {err && <div className="readonly-note" style={{ marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
        {campaigns === null && <div className="search-empty">กำลังโหลด…</div>}
        {campaigns !== null && filtered.length === 0 && <div className="search-empty">ไม่พบ Campaign — สร้างใหม่ได้ที่เมนู Campaign</div>}
        {filtered.map((c) => {
          const attached = isAttached(c);
          return (
            <div
              key={c.id}
              className="search-dropdown-item"
              style={{ border: "1px solid var(--gray-200)", borderRadius: 9, opacity: attached ? 0.55 : 1, cursor: attached ? "default" : "pointer" }}
              onClick={() => !attached && busyId !== c.id && attach(c)}
            >
              <b>{c.name}</b>
              <span>
                {c.startDate} – {c.endDate} · {attached ? "ผูกกับ Package/Channel นี้อยู่แล้ว" : "คลิกเพื่อผูก"}
              </span>
            </div>
          );
        })}
      </div>
    </Dialog>
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

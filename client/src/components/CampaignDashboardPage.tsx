import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import type { CampaignListItem, CampaignSummary, CampaignType } from "../types";
import { CAMPAIGN_TYPE_LABEL } from "../types";
import { api } from "../api";
import { campaignStatus, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_SEVERITY } from "../campaignStatus";
import { toBuddhist } from "../thaiDate";
import { addMonthsClampToDay, monthCountInclusive } from "../monthRange";
import { CampaignScheduleTimeline } from "./CampaignScheduleTimeline";
import { RowActionsMenu } from "./RowActionsMenu";
import { IconCampaign, IconPlus } from "../icons";

// Display order for the Promotion type card — matches the approved mockup, not CAMPAIGN_TYPES' own order.
const PROMOTION_TYPE_ORDER: CampaignType[] = ["Discount", "Voucher", "Cashback", "Gift", "Installment"];

const MAX_RANGE_MONTHS = 12;

function thisYearRange() {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function formatBaht(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  return `฿${Math.round(n).toLocaleString("en-US")}`;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function CampaignDashboardPage({ onOpenCampaign }: { onOpenCampaign: (campaignId: string | null) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(thisYearRange());
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const [scheduleMaxHeight, setScheduleMaxHeight] = useState<number | undefined>(undefined);

  function reload() {
    api.listCampaigns().then(setCampaigns).catch((e) => setError(String(e.message ?? e)));
  }
  useEffect(reload, []);

  async function handleDelete(c: CampaignListItem) {
    if (!confirm(`ลบ Campaign ${c.name}? Package ที่ผูกอยู่ (${c.attachments.length}) จะถูกถอดออกด้วย`)) return;
    try {
      await api.deleteCampaign(c.id);
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  useEffect(() => {
    api.getCampaignSummary(range.from, range.to).then(setSummary).catch(() => setSummary(null));
  }, [range.from, range.to]);

  // The Schedule card matches the left column's height exactly (CSS Grid alone can't cap one
  // column's auto height to the other's — its track sizing always follows the taller natural
  // content), then scrolls internally past that instead of growing the whole row.
  useLayoutEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const update = () => setScheduleMaxHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [campaigns, summary]);

  // The Schedule's month header spans exactly this range, so it can't exceed 12 columns —
  // moving either end further than 12 calendar months from the other pulls that other end along.
  function setFrom(newFrom: string) {
    setRange((r) => {
      const to = monthCountInclusive(newFrom, r.to) > MAX_RANGE_MONTHS ? addMonthsClampToDay(newFrom, MAX_RANGE_MONTHS - 1) : r.to;
      return { from: newFrom, to: newFrom > to ? newFrom : to };
    });
  }
  function setTo(newTo: string) {
    setRange((r) => {
      const from = monthCountInclusive(r.from, newTo) > MAX_RANGE_MONTHS ? addMonthsClampToDay(newTo, -(MAX_RANGE_MONTHS - 1)) : r.from;
      return { from: from > newTo ? newTo : from, to: newTo };
    });
  }

  if (error) return <div className="loading-screen">เกิดข้อผิดพลาด: {error}</div>;
  if (!campaigns) return <div className="loading-screen">กำลังโหลดข้อมูล…</div>;

  const rangeLabel = `${toBuddhist(range.from)} – ${toBuddhist(range.to)}`;

  const statCards = summary
    ? [
        {
          label: "Total Campaign",
          value: String(summary.campaignsCount),
          sub: `${summary.liveNowCount} live now`,
          barPct: summary.campaignsCount > 0 ? (summary.liveNowCount / summary.campaignsCount) * 100 : 0,
        },
        {
          label: "Usage volume",
          value: summary.redemptions.toLocaleString("en-US"),
          sub: `of ${summary.usageVolumeTarget.toLocaleString("en-US")}`,
          barPct: summary.usageVolumeTarget > 0 ? (summary.redemptions / summary.usageVolumeTarget) * 100 : 0,
        },
        {
          label: "Budget committed",
          value: formatBaht(summary.budgetCommitted),
          sub: `of ${formatBaht(summary.annualBudgetPlan)} plan`,
          barPct: summary.annualBudgetPlan > 0 ? (summary.budgetCommitted / summary.annualBudgetPlan) * 100 : 0,
        },
        {
          label: "Budget used",
          value: formatBaht(summary.budgetUsed),
          sub: `${summary.budgetCommitted > 0 ? Math.round((summary.budgetUsed / summary.budgetCommitted) * 100) : 0}% of committed`,
          barPct: summary.budgetCommitted > 0 ? (summary.budgetUsed / summary.budgetCommitted) * 100 : 0,
        },
      ]
    : [];

  const mixByTypeOrdered = summary
    ? PROMOTION_TYPE_ORDER.map((type) => summary.mixByType.find((m) => m.type === type)).filter(
        (m): m is CampaignSummary["mixByType"][number] => !!m
      )
    : [];

  return (
    <div className="list-page">
      <div className="list-page-head">
        <div className="page-title-row">
          <div className="page-title-icon">
            <IconCampaign />
          </div>
          <div>
            <div className="title">Campaign</div>
          </div>
        </div>
        <Button label="Create Campaign" icon={<IconPlus />} onClick={() => onOpenCampaign(null)} />
      </div>

      <div className="campaign-range-row">
        <div className="campaign-range-field">
          <label className="label">Start date *</label>
          <InputText className="input" type="date" value={range.from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="campaign-range-field">
          <label className="label">End date *</label>
          <InputText className="input" type="date" value={range.to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="campaign-dashboard-grid">
        <div className="campaign-dashboard-col" ref={leftColRef}>
          <div className="campaign-stats-row campaign-stats-row-2col">
            {statCards.map((c) => (
              <div className="campaign-stat-card" key={c.label}>
                <div className="campaign-stat-label">{c.label}</div>
                <div className="campaign-stat-value">{c.value}</div>
                <div className="campaign-stat-sub">{c.sub}</div>
                <div className="campaign-stat-bar">
                  <i style={{ width: `${clampPct(c.barPct)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-left">
                <div className="card-title">Promotion type</div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(!summary || mixByTypeOrdered.length === 0) && <div className="search-empty">ไม่มี Campaign ในช่วงที่เลือก</div>}
              {mixByTypeOrdered.map((m) => (
                <div className="campaign-mix-row" key={m.type}>
                  <span className="campaign-mix-label">{CAMPAIGN_TYPE_LABEL[m.type]}</span>
                  <div className="campaign-mix-bar">
                    <i style={{ width: `${clampPct(m.pct)}%` }} />
                  </div>
                  <span className="campaign-mix-pct">{Math.round(m.pct)} %</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CampaignScheduleTimeline
          campaigns={summary?.schedule ?? []}
          rangeFrom={range.from}
          rangeTo={range.to}
          rangeLabel={rangeLabel}
          maxHeight={scheduleMaxHeight}
          onSelect={(id) => onOpenCampaign(id)}
        />
      </div>

      <div className="list-page-table card">
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title">Campaigns</div>
          </div>
        </div>
        <DataTable value={campaigns} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} dataKey="id" emptyMessage="ยังไม่มี Campaign" stripedRows scrollable>
          <Column
            header="Campaign"
            body={(c: CampaignListItem) => (
              <div>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="upload-sub">
                  {c.code} ·{" "}
                  {c.attachments.length === 0
                    ? "ยังไม่ผูก Package"
                    : c.attachments.length === 1
                    ? c.attachments[0].packageNameEn
                    : `${c.attachments.length} packages`}
                </div>
              </div>
            )}
          />
          <Column header="Type" body={(c: CampaignListItem) => <Tag severity="info" value={CAMPAIGN_TYPE_LABEL[c.type]} />} />
          <Column
            header="Period"
            body={(c: CampaignListItem) => (
              <span className="upload-sub">
                {c.startDate} – {c.endDate}
              </span>
            )}
          />
          <Column header="Channel" body={(c: CampaignListItem) => c.channels.join(", ") || "-"} />
          <Column
            header="Budget used"
            body={(c: CampaignListItem) => (
              <div className="campaign-budget-cell">
                <div className="campaign-budget-track">
                  <i style={{ width: `${c.budget > 0 ? clampPct((c.budgetUsed / c.budget) * 100) : 0}%` }} />
                </div>
                <span className="upload-sub">
                  {formatBaht(c.budgetUsed)} / {formatBaht(c.budget)}
                </span>
              </div>
            )}
          />
          <Column
            header="Status"
            body={(c: CampaignListItem) => {
              const s = campaignStatus(c.startDate, c.endDate);
              return <Tag severity={CAMPAIGN_STATUS_SEVERITY[s]} value={CAMPAIGN_STATUS_LABEL[s]} />;
            }}
          />
          <Column
            header="Action"
            body={(c: CampaignListItem) => (
              <RowActionsMenu
                onView={() => onOpenCampaign(c.id)}
                onEdit={() => onOpenCampaign(c.id)}
                onDelete={() => handleDelete(c)}
                canDelete={campaignStatus(c.startDate, c.endDate) === "scheduled"}
              />
            )}
          />
        </DataTable>
      </div>
    </div>
  );
}

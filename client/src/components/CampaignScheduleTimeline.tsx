import { campaignStatus, CAMPAIGN_STATUS_LABEL } from "../campaignStatus";
import { toBuddhist } from "../thaiDate";
import { monthOffset, monthsBetweenInclusive } from "../monthRange";
import { IconCalendar } from "../icons";

export function CampaignScheduleTimeline({
  campaigns,
  rangeFrom,
  rangeTo,
  rangeLabel,
  maxHeight,
  onSelect,
}: {
  campaigns: { id: string; name: string; startDate: string; endDate: string }[];
  rangeFrom: string;
  rangeTo: string;
  rangeLabel: string;
  maxHeight?: number;
  onSelect?: (id: string) => void;
}) {
  const months = monthsBetweenInclusive(rangeFrom, rangeTo);
  const totalMonths = months.length;

  return (
    <div className="card schedule-card" style={maxHeight ? { height: maxHeight } : undefined}>
      <div className="card-head schedule-card-head">
        <div className="card-head-left">
          <div className="card-title schedule-title">
            <IconCalendar /> Schedule · {rangeLabel}
          </div>
        </div>
        <div className="schedule-legend">
          <span className="schedule-legend-item"><i className="schedule-swatch live" />Live</span>
          <span className="schedule-legend-item"><i className="schedule-swatch scheduled" />Scheduled</span>
          <span className="schedule-legend-item"><i className="schedule-swatch ended" />Ended</span>
        </div>
      </div>
      <div className="card-body schedule-body">
        <div className="schedule-months" style={{ gridTemplateColumns: `minmax(0,172px) repeat(${totalMonths}, 1fr)` }}>
          <span className="schedule-months-name">Campaign name</span>
          {months.map((m) => (
            <span key={`${m.year}-${m.month}`}>{m.label}</span>
          ))}
        </div>
        {/* Height is matched to the left column by the parent — beyond that, this list scrolls. */}
        <div className="schedule-rows">
          {campaigns.length === 0 && <div className="search-empty">ไม่มี Campaign ในช่วงที่เลือก</div>}
          {campaigns.map((c) => {
            const startFrac = monthOffset(c.startDate, months);
            const endFrac = Math.max(monthOffset(c.endDate, months) + 1 / 30, startFrac + 0.3);
            const status = campaignStatus(c.startDate, c.endDate);
            const widthPct = ((endFrac - startFrac) / totalMonths) * 100;
            return (
              <div className="schedule-row" key={c.id} onClick={() => onSelect?.(c.id)}>
                <div className="schedule-row-label">
                  <div className="schedule-row-name">{c.name}</div>
                  <div className="schedule-row-dates">
                    {toBuddhist(c.startDate)} – {toBuddhist(c.endDate)}
                  </div>
                </div>
                <div className="schedule-track">
                  <div
                    className={`schedule-bar ${status}`}
                    style={{ left: `${(startFrac / totalMonths) * 100}%`, width: `${widthPct}%` }}
                    title={CAMPAIGN_STATUS_LABEL[status]}
                  >
                    {/* A bar narrower than ~2 months can't fit the label — color + legend still convey status. */}
                    {widthPct >= 16 ? CAMPAIGN_STATUS_LABEL[status] : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

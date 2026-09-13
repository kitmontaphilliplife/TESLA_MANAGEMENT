export type CampaignStatus = "live" | "scheduled" | "ended";

export function campaignStatus(startDate: string, endDate: string): CampaignStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return "scheduled";
  if (today > endDate) return "ended";
  return "live";
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  ended: "Ended",
};

export const CAMPAIGN_STATUS_SEVERITY: Record<CampaignStatus, "success" | "info" | "secondary"> = {
  live: "success",
  scheduled: "info",
  ended: "secondary",
};

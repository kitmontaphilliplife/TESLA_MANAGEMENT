import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { findChannelContentRow, findPackageRow } from "./packages.js";

export const campaignsRouter = Router();

const CAMPAIGN_TYPES = ["Voucher", "Cashback", "Discount", "Gift", "Installment"] as const;
type ChannelType = "F2F" | "ONLINE";

function serializeCampaignRow(row: any) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    discountLabel: row.discount_label,
    channels: JSON.parse(row.channels || "[]"),
    budget: row.budget,
    budgetUsed: row.budget_used,
    redemptions: row.redemptions,
  };
}

function nextCampaignCode(): string {
  const buddhistYear = new Date().getFullYear() + 543;
  const n = (db.prepare(`SELECT COUNT(*) AS n FROM campaigns WHERE code IS NOT NULL`).get() as { n: number }).n + 1;
  return `CMP${buddhistYear}${String(n).padStart(4, "0")}`;
}

// A campaign's real "live now" status — same rule the client's campaignStatus() uses.
function isLiveNow(startDate: string, endDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return startDate <= today && today <= endDate;
}

// Every package/channel this campaign is currently attached to.
function findAttachments(campaignId: string) {
  return (
    db
      .prepare(
        `SELECT pcc.id AS channel_content_id, pcc.channel_type, p.plan_code, pr.name_en, pr.name_th
         FROM channel_content_campaigns ccc
         JOIN package_channel_content pcc ON pcc.id = ccc.channel_content_id
         JOIN packages p ON p.id = pcc.package_id
         JOIN products pr ON pr.plan_code = p.plan_code
         WHERE ccc.campaign_id = ?
         ORDER BY p.plan_code ASC`
      )
      .all(campaignId) as any[]
  ).map((r) => ({
    channelType: r.channel_type,
    planCode: r.plan_code,
    packageNameEn: r.name_en,
    packageNameTh: r.name_th,
  }));
}

function findCampaignRow(id: string) {
  return db.prepare(`SELECT * FROM campaigns WHERE id = ?`).get(id) as any;
}

// Every OTHER campaign attached to the same channel_content_id.
function findSiblingCampaigns(channelContentId: string, excludeCampaignId?: string) {
  return db
    .prepare(
      `SELECT c.* FROM campaigns c
       JOIN channel_content_campaigns ccc ON ccc.campaign_id = c.id
       WHERE ccc.channel_content_id = ? AND c.id != ?`
    )
    .all(channelContentId, excludeCampaignId ?? "") as any[];
}

function hasOverlap(channelContentId: string, startDate: string, endDate: string, excludeCampaignId?: string) {
  return findSiblingCampaigns(channelContentId, excludeCampaignId).some(
    (c) => startDate <= c.end_date && endDate >= c.start_date
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
}

// Dashboard summary — stat cards, promotion mix, and the schedule strip, all scoped to one date range.
campaignsRouter.get("/summary", (req, res) => {
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  if (!from || !to || from > to) return res.status(400).json({ error: "invalid_range" });

  const inRange = db
    .prepare(`SELECT * FROM campaigns WHERE start_date <= ? AND end_date >= ? ORDER BY start_date ASC`)
    .all(to, from) as any[];

  const days = daysBetween(from, to);
  const prevTo = shiftDate(from, -1);
  const prevFrom = shiftDate(prevTo, -days);
  const prevRedemptions = (
    db
      .prepare(`SELECT COALESCE(SUM(redemptions), 0) AS n FROM campaigns WHERE start_date <= ? AND end_date >= ?`)
      .get(prevTo, prevFrom) as { n: number }
  ).n;

  const campaignsCount = inRange.length;
  const liveNowCount = inRange.filter((c) => isLiveNow(c.start_date, c.end_date)).length;
  const budgetCommitted = inRange.reduce((s, c) => s + c.budget, 0);
  const budgetUsed = inRange.reduce((s, c) => s + c.budget_used, 0);
  const redemptions = inRange.reduce((s, c) => s + c.redemptions, 0);
  const costPerPolicy = redemptions > 0 ? budgetUsed / redemptions : 0;
  const redemptionsDeltaPct = prevRedemptions > 0 ? ((redemptions - prevRedemptions) / prevRedemptions) * 100 : null;

  // Promotion type — every campaign in the date range regardless of status (active and
  // inactive both count); each type's own bar is its budget-used/committed utilization,
  // independent of the other types (so these do not need to sum to 100%).
  const mixByType = CAMPAIGN_TYPES.map((type) => {
    const rows = inRange.filter((c) => c.type === type);
    const typeBudget = rows.reduce((s, c) => s + c.budget, 0);
    const typeBudgetUsed = rows.reduce((s, c) => s + c.budget_used, 0);
    return { type, pct: typeBudget > 0 ? (typeBudgetUsed / typeBudget) * 100 : 0 };
  });

  const settingsRows = db.prepare(`SELECT key, value FROM campaign_settings`).all() as { key: string; value: number }[];
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));

  res.json({
    campaignsCount,
    liveNowCount,
    budgetCommitted,
    budgetUsed,
    redemptions,
    redemptionsDeltaPct,
    costPerPolicy,
    annualBudgetPlan: settings.annual_budget_plan ?? 0,
    costPerPolicyTarget: settings.cost_per_policy_target ?? 0,
    usageVolumeTarget: settings.usage_volume_target ?? 0,
    mixByType,
    schedule: inRange.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.start_date,
      endDate: c.end_date,
    })),
  });
});

campaignsRouter.get("/settings", (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM campaign_settings`).all() as { key: string; value: number }[];
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    annualBudgetPlan: settings.annual_budget_plan ?? 0,
    costPerPolicyTarget: settings.cost_per_policy_target ?? 0,
    usageVolumeTarget: settings.usage_volume_target ?? 0,
  });
});

campaignsRouter.patch("/settings", (req, res) => {
  const b = req.body ?? {};
  const set = db.prepare(`INSERT INTO campaign_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  if (b.annualBudgetPlan !== undefined) set.run("annual_budget_plan", Number(b.annualBudgetPlan));
  if (b.costPerPolicyTarget !== undefined) set.run("cost_per_policy_target", Number(b.costPerPolicyTarget));
  if (b.usageVolumeTarget !== undefined) set.run("usage_volume_target", Number(b.usageVolumeTarget));
  const rows = db.prepare(`SELECT key, value FROM campaign_settings`).all() as { key: string; value: number }[];
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    annualBudgetPlan: settings.annual_budget_plan ?? 0,
    costPerPolicyTarget: settings.cost_per_policy_target ?? 0,
    usageVolumeTarget: settings.usage_volume_target ?? 0,
  });
});

// List every campaign, each with the package/channels it's attached to — the Campaign list page.
campaignsRouter.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM campaigns ORDER BY start_date DESC`).all() as any[];
  res.json(rows.map((r) => ({ ...serializeCampaignRow(r), attachments: findAttachments(r.id) })));
});

// One campaign's own fields + its attachments — the Campaign detail page.
campaignsRouter.get("/:id", (req, res) => {
  const row = findCampaignRow(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ...serializeCampaignRow(row), attachments: findAttachments(row.id) });
});

// All channel-contents for one package with their attached campaigns — Package Configuration's campaign panel.
campaignsRouter.get("/package/:planCode", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  const contentRows = db
    .prepare(`SELECT * FROM package_channel_content WHERE package_id = ? ORDER BY channel_type ASC`)
    .all(pkgRow.id) as any[];
  res.json(
    contentRows.map((row) => ({
      channelType: row.channel_type,
      campaigns: (
        db
          .prepare(
            `SELECT c.* FROM campaigns c
             JOIN channel_content_campaigns ccc ON ccc.campaign_id = c.id
             WHERE ccc.channel_content_id = ? ORDER BY c.start_date ASC`
          )
          .all(row.id) as any[]
      ).map(serializeCampaignRow),
    }))
  );
});

// Create a standalone campaign — not attached to any package yet.
campaignsRouter.post("/", (req, res) => {
  const b = req.body ?? {};
  const { type, name, startDate, endDate, discountLabel = "", channels = [], budget = 0 } = b;

  if (!CAMPAIGN_TYPES.includes(type)) return res.status(400).json({ error: "invalid_campaign_type" });
  if (!name || !startDate || !endDate) return res.status(400).json({ error: "missing_required_fields" });
  if (startDate > endDate) return res.status(400).json({ error: "invalid_date_range" });

  const id = nanoid(10);
  const code = nextCampaignCode();
  db.prepare(
    `INSERT INTO campaigns (id, code, type, name, start_date, end_date, discount_label, channels, budget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, code, type, name, startDate, endDate, discountLabel, JSON.stringify(channels), Number(budget) || 0);

  res.status(201).json({ ...serializeCampaignRow(findCampaignRow(id)), attachments: [] });
});

// Update a campaign's own fields (not its attachments).
campaignsRouter.patch("/:id", (req, res) => {
  const existing = findCampaignRow(req.params.id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  const b = req.body ?? {};

  const type = b.type ?? existing.type;
  const name = b.name ?? existing.name;
  const startDate = b.startDate ?? existing.start_date;
  const endDate = b.endDate ?? existing.end_date;
  const discountLabel = b.discountLabel ?? existing.discount_label;
  const channels = b.channels ?? JSON.parse(existing.channels || "[]");
  const budget = b.budget !== undefined ? Number(b.budget) || 0 : existing.budget;
  const budgetUsed = b.budgetUsed !== undefined ? Number(b.budgetUsed) || 0 : existing.budget_used;
  const redemptions = b.redemptions !== undefined ? Number(b.redemptions) || 0 : existing.redemptions;

  if (!CAMPAIGN_TYPES.includes(type)) return res.status(400).json({ error: "invalid_campaign_type" });
  if (startDate > endDate) return res.status(400).json({ error: "invalid_date_range" });

  // Editing dates can only newly collide with campaigns on channels this one is already attached to.
  const attachedChannelContentIds = (
    db.prepare(`SELECT channel_content_id FROM channel_content_campaigns WHERE campaign_id = ?`).all(existing.id) as any[]
  ).map((r) => r.channel_content_id);
  if (attachedChannelContentIds.some((ccId) => hasOverlap(ccId, startDate, endDate, existing.id))) {
    return res.status(409).json({ error: "campaign_overlap" });
  }

  db.prepare(
    `UPDATE campaigns SET type = ?, name = ?, start_date = ?, end_date = ?, discount_label = ?, channels = ?, budget = ?, budget_used = ?, redemptions = ? WHERE id = ?`
  ).run(type, name, startDate, endDate, discountLabel, JSON.stringify(channels), budget, budgetUsed, redemptions, existing.id);

  res.json({ ...serializeCampaignRow(findCampaignRow(existing.id)), attachments: findAttachments(existing.id) });
});

campaignsRouter.delete("/:id", (req, res) => {
  const existing = findCampaignRow(req.params.id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  const today = new Date().toISOString().slice(0, 10);
  if (existing.start_date <= today) return res.status(409).json({ error: "campaign_already_started" });
  db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(existing.id);
  res.json({ ok: true });
});

// Attach this campaign to one package's channel.
campaignsRouter.post("/:id/attachments", (req, res) => {
  const existing = findCampaignRow(req.params.id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  const { planCode, channelType } = req.body ?? {};
  if (channelType !== "F2F" && channelType !== "ONLINE") return res.status(400).json({ error: "invalid_channel_type" });
  const row = findChannelContentRow(planCode, channelType as ChannelType);
  if (!row) return res.status(404).json({ error: "channel_not_found" });
  if (hasOverlap(row.id, existing.start_date, existing.end_date, existing.id)) {
    return res.status(409).json({ error: "campaign_overlap" });
  }
  db.prepare(
    `INSERT OR IGNORE INTO channel_content_campaigns (channel_content_id, campaign_id) VALUES (?, ?)`
  ).run(row.id, existing.id);
  res.status(201).json({ ...serializeCampaignRow(existing), attachments: findAttachments(existing.id) });
});

// Detach this campaign from one package's channel (the campaign itself stays).
campaignsRouter.delete("/:id/attachments", (req, res) => {
  const existing = findCampaignRow(req.params.id);
  if (!existing) return res.status(404).json({ error: "not_found" });
  const { planCode, channelType } = req.body ?? {};
  const row = findChannelContentRow(planCode, channelType as ChannelType);
  if (!row) return res.status(404).json({ error: "channel_not_found" });
  db.prepare(`DELETE FROM channel_content_campaigns WHERE channel_content_id = ? AND campaign_id = ?`).run(row.id, existing.id);
  res.json({ ...serializeCampaignRow(existing), attachments: findAttachments(existing.id) });
});

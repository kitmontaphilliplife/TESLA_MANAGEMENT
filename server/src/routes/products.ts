import { Router } from "express";
import { db } from "../db.js";
import { classifyChannel } from "../channelGroups.js";

export const productsRouter = Router();

// TESLA_MASTER product cache — read-only browsing, used by the "+ Add Package" picker
// to show which products don't have a Package yet.
productsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, pkg.id AS package_id FROM products p LEFT JOIN packages pkg ON pkg.plan_code = p.plan_code
       ORDER BY p.plan_code ASC`
    )
    .all() as any[];
  res.json(
    rows.map((r) => {
      const channelCodes = JSON.parse(r.channel_codes || "[]") as { code: string; nameEn: string }[];
      const channels = channelCodes.map((c) => ({ code: c.code, nameEn: c.nameEn, group: classifyChannel(c.code, c.nameEn) }));
      const channelGroups = Array.from(new Set(channels.map((c) => c.group)));
      return {
        planCode: r.plan_code,
        nameTh: r.name_th,
        nameEn: r.name_en,
        category: r.category,
        productTypeNameEn: r.product_type_name_en,
        subProductTypeNameEn: r.sub_product_type_name_en,
        startDate: r.start_date,
        channels,
        channelGroups,
        hasPackage: !!r.package_id,
        hasRawPayload: !!r.raw_payload,
      };
    })
  );
});

// Full original TESLA_MASTER payload for one product, for the read-only "Package" viewer
// under Master Setup. Only products the business actually gave us a real payload for
// carry one — everything else responds 404 here (they still appear in the list above).
productsRouter.get("/:planCode/raw", (req, res) => {
  const row = db.prepare(`SELECT plan_code, name_th, name_en, raw_payload FROM products WHERE plan_code = ?`).get(req.params.planCode) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  if (!row.raw_payload) return res.status(404).json({ error: "no_raw_payload" });
  res.json({ planCode: row.plan_code, nameTh: row.name_th, nameEn: row.name_en, payload: JSON.parse(row.raw_payload) });
});

import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";

export const masterCodesRouter = Router();

const CATEGORIES = [
  "class_of_business",
  "line_of_business",
  "coverage_type",
  "product_type",
  "sub_product_type",
  "occupation_class",
  "occupation_group",
  "occupation_position",
  "occupation",
  "distribution_channel",
  "payment_mode",
  "payment_method",
] as const;

function serialize(row: any) {
  return {
    id: row.id,
    category: row.category,
    codeId: row.code_id,
    nameEn: row.name_en,
    nameTh: row.name_th,
    parentName: row.parent_name,
    channelGroup: row.channel_group,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

masterCodesRouter.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

masterCodesRouter.get("/:category", (req, res) => {
  if (!CATEGORIES.includes(req.params.category as any)) return res.status(400).json({ error: "invalid_category" });
  const rows = db
    .prepare(`SELECT * FROM master_codes WHERE category = ? ORDER BY code_id ASC`)
    .all(req.params.category) as any[];
  res.json(rows.map(serialize));
});

masterCodesRouter.post("/:category", (req, res) => {
  const category = req.params.category;
  if (!CATEGORIES.includes(category as any)) return res.status(400).json({ error: "invalid_category" });
  const { codeId, nameEn, nameTh, channelGroup, parentName } = req.body ?? {};
  if (!codeId || !nameEn || !nameTh) return res.status(400).json({ error: "codeId_nameEn_nameTh_required" });
  if (category === "distribution_channel" && channelGroup && !["F2F", "ONLINE", "UNMAPPED"].includes(channelGroup)) {
    return res.status(400).json({ error: "invalid_channel_group" });
  }
  const existing = db.prepare(`SELECT id FROM master_codes WHERE category = ? AND code_id = ?`).get(category, codeId);
  if (existing) return res.status(409).json({ error: "code_id_already_exists" });

  const id = nanoid(10);
  db.prepare(
    `INSERT INTO master_codes (id, category, code_id, name_en, name_th, parent_name, channel_group) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, category, codeId, nameEn, nameTh, parentName ?? null, category === "distribution_channel" ? channelGroup ?? "UNMAPPED" : null);
  const row = db.prepare(`SELECT * FROM master_codes WHERE id = ?`).get(id);
  res.status(201).json(serialize(row));
});

masterCodesRouter.patch("/:category/:id", (req, res) => {
  const category = req.params.category;
  if (!CATEGORIES.includes(category as any)) return res.status(400).json({ error: "invalid_category" });
  const row = db.prepare(`SELECT * FROM master_codes WHERE id = ? AND category = ?`).get(req.params.id, category) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  const b = req.body ?? {};
  if (b.channelGroup && !["F2F", "ONLINE", "UNMAPPED"].includes(b.channelGroup)) {
    return res.status(400).json({ error: "invalid_channel_group" });
  }
  db.prepare(
    `UPDATE master_codes SET
      name_en = COALESCE(@nameEn, name_en),
      name_th = COALESCE(@nameTh, name_th),
      channel_group = COALESCE(@channelGroup, channel_group),
      updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: row.id,
    nameEn: b.nameEn ?? null,
    nameTh: b.nameTh ?? null,
    channelGroup: b.channelGroup ?? null,
  });
  const updated = db.prepare(`SELECT * FROM master_codes WHERE id = ?`).get(row.id);
  res.json(serialize(updated));
});

masterCodesRouter.delete("/:category/:id", (req, res) => {
  const category = req.params.category;
  if (!CATEGORIES.includes(category as any)) return res.status(400).json({ error: "invalid_category" });
  const info = db.prepare(`DELETE FROM master_codes WHERE id = ? AND category = ?`).run(req.params.id, category);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

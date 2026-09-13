import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { IMAGE_MIMETYPES, sanitizeIfSvg } from "../imageUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIMETYPES.includes(file.mimetype)) return cb(new Error("Image only (JPG/PNG/WEBP/SVG)"));
    cb(null, true);
  },
});

export const keyFeatureMasterRouter = Router();

const SECTIONS = ["key_features", "key_advantages"] as const;

function serialize(row: any) {
  return {
    id: row.id,
    codeId: row.code_id,
    iconImage: row.icon_image,
    feature: row.feature,
    detailFeature: row.detail_feature,
    section: row.section,
    system: row.system,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function nextCodeId(): string {
  const rows = db.prepare(`SELECT code_id FROM key_feature_master WHERE code_id LIKE 'KF%'`).all() as { code_id: string }[];
  const maxN = rows.reduce((max, r) => {
    const n = parseInt(r.code_id.replace("KF", ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `KF${String(maxN + 1).padStart(2, "0")}`;
}

keyFeatureMasterRouter.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM key_feature_master ORDER BY code_id ASC`).all() as any[];
  res.json(rows.map(serialize));
});

keyFeatureMasterRouter.post("/", (req, res) => {
  const { feature, detailFeature = "", section, system } = req.body ?? {};
  if (!feature || typeof feature !== "string") return res.status(400).json({ error: "feature_required" });
  if (!SECTIONS.includes(section)) return res.status(400).json({ error: "invalid_section" });
  if (system !== "F2F" && system !== "ONLINE") return res.status(400).json({ error: "invalid_system" });

  const id = nanoid(10);
  const codeId = nextCodeId();
  db.prepare(
    `INSERT INTO key_feature_master (id, code_id, feature, detail_feature, section, system) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, codeId, feature, detailFeature, section, system);

  res.status(201).json(serialize(db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(id)));
});

keyFeatureMasterRouter.patch("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  const b = req.body ?? {};
  if (b.section !== undefined && !SECTIONS.includes(b.section)) {
    return res.status(400).json({ error: "invalid_section" });
  }
  if (b.system !== undefined && b.system !== "F2F" && b.system !== "ONLINE") {
    return res.status(400).json({ error: "invalid_system" });
  }
  db.prepare(
    `UPDATE key_feature_master SET
      feature = COALESCE(@feature, feature),
      detail_feature = COALESCE(@detailFeature, detail_feature),
      section = COALESCE(@section, section),
      system = COALESCE(@system, system),
      updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: row.id,
    feature: b.feature ?? null,
    detailFeature: b.detailFeature ?? null,
    section: b.section ?? null,
    system: b.system ?? null,
  });

  res.json(serialize(db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(row.id)));
});

keyFeatureMasterRouter.delete("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  db.prepare(`DELETE FROM key_feature_master WHERE id = ?`).run(row.id);
  res.json({ ok: true });
});

keyFeatureMasterRouter.post("/:id/icon", uploadImage.single("file"), (req, res) => {
  const row = db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  if (!req.file) return res.status(400).json({ error: "file_required" });
  sanitizeIfSvg(req.file.path, req.file.mimetype);
  db.prepare(`UPDATE key_feature_master SET icon_image = ?, updated_at = datetime('now') WHERE id = ?`).run(req.file.filename, row.id);
  res.json(serialize(db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(row.id)));
});

keyFeatureMasterRouter.delete("/:id/icon", (req, res) => {
  const row = db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "not_found" });
  db.prepare(`UPDATE key_feature_master SET icon_image = NULL, updated_at = datetime('now') WHERE id = ?`).run(row.id);
  res.json(serialize(db.prepare(`SELECT * FROM key_feature_master WHERE id = ?`).get(row.id)));
});

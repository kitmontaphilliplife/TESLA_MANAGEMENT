import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { classifyChannel } from "../channelGroups.js";
import { createPackageForProduct } from "../packageFactory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("PDF only"));
    cb(null, true);
  },
});

const IMAGE_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIMETYPES.includes(file.mimetype)) return cb(new Error("Image only (JPG/PNG/WEBP)"));
    cb(null, true);
  },
});

export const packagesRouter = Router();

type ChannelType = "F2F" | "ONLINE";

function findProductRow(planCode: string) {
  return db.prepare(`SELECT * FROM products WHERE plan_code = ?`).get(planCode) as any;
}
function findPackageRow(planCode: string) {
  return db.prepare(`SELECT * FROM packages WHERE plan_code = ?`).get(planCode) as any;
}
function findChannelContentRow(planCode: string, channelType: ChannelType) {
  return db
    .prepare(
      `SELECT pcc.* FROM package_channel_content pcc
       JOIN packages p ON p.id = pcc.package_id
       WHERE p.plan_code = ? AND pcc.channel_type = ?`
    )
    .get(planCode, channelType) as any;
}

function serializeChannelContent(row: any, categoryForLegal: string) {
  const features = db
    .prepare(`SELECT * FROM key_features WHERE channel_content_id = ? ORDER BY sort_order ASC`)
    .all(row.id) as any[];
  const legal = db.prepare(`SELECT body FROM legal_templates WHERE category = ?`).get(categoryForLegal) as any;

  const base: any = {
    channelContentId: row.id,
    channelType: row.channel_type,
    thumbnail: {
      image: row.thumbnail_image,
      captions: [row.thumbnail_c1, row.thumbnail_c2, row.thumbnail_c3],
    },
    banner: {
      desktopImage: row.banner_desktop_image,
      mobileImage: row.banner_mobile_image,
      title: row.banner_title,
      subtitle: row.banner_subtitle,
    },
    keyFeatures: features.map((f) => ({ id: f.id, icon: f.icon, topic: f.topic, value: f.value, highlight: !!f.highlight })),
    iconAsset: null,
    contractualPayout: null,
    keyAdvantages: null,
    recommends: null,
    productType: null,
    productInformation: null,
    document: {
      filename: row.document_filename,
      uploadedAt: row.document_uploaded_at,
      legalText: legal?.body ?? null,
    },
    campaign: (() => {
      const c = db
        .prepare(
          `SELECT c.* FROM channel_content_campaigns ccc JOIN campaigns c ON c.id = ccc.campaign_id WHERE ccc.channel_content_id = ? LIMIT 1`
        )
        .get(row.id) as any;
      return c
        ? { id: c.id, type: c.type, name: c.name, startDate: c.start_date, endDate: c.end_date, discountLabel: c.discount_label }
        : null;
    })(),
  };

  if (row.channel_type === "ONLINE") {
    const advantageCards = db
      .prepare(`SELECT * FROM key_advantage_cards WHERE channel_content_id = ? ORDER BY sort_order ASC`)
      .all(row.id) as any[];
    const recommends = db
      .prepare(
        `SELECT pr.recommended_plan_code, p.name_th, p.name_en, p.category FROM package_recommends pr
         JOIN products p ON p.plan_code = pr.recommended_plan_code
         WHERE pr.channel_content_id = ? ORDER BY pr.sort_order ASC`
      )
      .all(row.id) as any[];
    base.iconAsset = row.icon_asset;
    base.contractualPayout = { value: row.contractual_payout_value, active: !!row.contractual_payout_active };
    base.keyAdvantages = {
      enabled: !!row.key_advantages_enabled,
      header: row.key_advantages_header,
      cards: advantageCards.map((a) => ({ id: a.id, title: a.title, subtitle: a.subtitle })),
    };
    base.recommends = recommends.map((r) => ({ code: r.recommended_plan_code, nameTh: r.name_th, nameEn: r.name_en, category: r.category }));
  }

  if (row.channel_type === "F2F") {
    const items = db
      .prepare(`SELECT * FROM product_info_items WHERE channel_content_id = ? ORDER BY group_type ASC, sort_order ASC`)
      .all(row.id) as any[];
    const byGroup = (g: string) => items.filter((i) => i.group_type === g).map((i) => ({ id: i.id, label: i.label }));
    base.productType = row.product_type;
    base.productInformation = {
      insuranceTypes: byGroup("insurance_type"),
      additionalCoverages: byGroup("additional_coverage"),
      highlights: byGroup("highlight"),
    };
  }

  return base;
}

function serializePackage(planCode: string) {
  const product = findProductRow(planCode);
  const pkgRow = findPackageRow(planCode);
  if (!product || !pkgRow) return null;

  const channelCodes = JSON.parse(product.channel_codes || "[]") as { code: string; nameEn: string; nameTh: string }[];
  const unmappedChannels = channelCodes
    .map((c) => ({ ...c, group: classifyChannel(c.code, c.nameEn) }))
    .filter((c) => c.group === "UNMAPPED")
    .map((c) => ({ channelCode: c.code, nameEn: c.nameEn }));

  const contentRows = db
    .prepare(`SELECT * FROM package_channel_content WHERE package_id = ? ORDER BY channel_type ASC`)
    .all(pkgRow.id) as any[];

  const auditLog = db
    .prepare(`SELECT message, created_at FROM audit_log WHERE package_id = ? ORDER BY created_at DESC`)
    .all(pkgRow.id) as any[];

  return {
    packageId: pkgRow.id,
    status: pkgRow.status,
    updatedAt: pkgRow.updated_at,
    updatedBy: pkgRow.updated_by,
    product: {
      planCode: product.plan_code,
      nameTh: product.name_th,
      nameEn: product.name_en,
      category: product.category,
      insuranceTypeCode: product.insurance_type_code,
      insuranceTypeNameEn: product.insurance_type_name_en,
      hasSubPlan: !!product.has_sub_plan,
      startDate: product.start_date,
      endDate: product.end_date,
      additionalRiders: JSON.parse(product.additional_riders || "[]"),
      flags: {
        contractualPayouts: product.contractual_payouts_flag === "Y",
        maturity: product.maturity_flag === "Y",
        deathBenefit: product.death_benefit_flag === "Y",
        cashSurrender: product.cash_surrender_value_flag === "Y",
        extendedTerm: product.extended_term_flag === "Y",
        reducedPaidup: product.reduced_paidup_flag === "Y",
      },
      channels: channelCodes.map((c) => ({ ...c, group: classifyChannel(c.code, c.nameEn) })),
    },
    channelContents: contentRows.map((r) => serializeChannelContent(r, product.category)),
    unmappedChannels,
    auditLog,
  };
}

function touch(planCode: string) {
  db.prepare(`UPDATE packages SET updated_at = datetime('now') WHERE plan_code = ?`).run(planCode);
}
function log(packageId: string, message: string) {
  db.prepare(`INSERT INTO audit_log (id, package_id, message) VALUES (?, ?, ?)`).run(nanoid(10), packageId, message);
}
function requireChannelContent(res: any, planCode: string, channelType: string) {
  if (channelType !== "F2F" && channelType !== "ONLINE") {
    res.status(400).json({ error: "invalid_channel_type" });
    return null;
  }
  const row = findChannelContentRow(planCode, channelType as ChannelType);
  if (!row) {
    res.status(404).json({ error: "channel_not_active_for_product" });
    return null;
  }
  return row;
}

// List packages (for the Package List screen)
packagesRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, pr.name_th, pr.name_en, pr.category, pr.channel_codes FROM packages p
       JOIN products pr ON pr.plan_code = p.plan_code
       ORDER BY p.updated_at DESC`
    )
    .all() as any[];
  res.json(
    rows.map((r) => {
      const channelCodes = JSON.parse(r.channel_codes || "[]") as { code: string; nameEn: string }[];
      const groups = Array.from(new Set(channelCodes.map((c) => classifyChannel(c.code, c.nameEn)))).filter((g) => g !== "UNMAPPED");
      return {
        planCode: r.plan_code,
        nameTh: r.name_th,
        nameEn: r.name_en,
        category: r.category,
        channelGroups: groups,
        status: r.status,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
      };
    })
  );
});

// Create a new Package for a Product (the "+ Add" action on the Package List screen).
// Channel content rows are derived from the product's own channels — the caller only picks the product.
packagesRouter.post("/", (req, res) => {
  const planCode = req.body?.planCode;
  if (!planCode || typeof planCode !== "string") return res.status(400).json({ error: "planCode_required" });
  try {
    createPackageForProduct(planCode, "draft");
  } catch (e: any) {
    if (e.message === "product_not_found") return res.status(404).json({ error: "product_not_found" });
    if (e.message === "package_already_exists") return res.status(409).json({ error: "package_already_exists" });
    throw e;
  }
  res.status(201).json(serializePackage(planCode));
});

// Search products for the "Package recommend" picker (excludes the product itself)
packagesRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const exclude = String(req.query.exclude ?? "");
  const rows = db
    .prepare(
      `SELECT plan_code, name_th, name_en, category FROM products
       WHERE plan_code != ? AND (name_th LIKE ? OR name_en LIKE ? OR plan_code LIKE ?)
       LIMIT 10`
    )
    .all(exclude, `%${q}%`, `%${q}%`, `%${q}%`) as any[];
  res.json(rows.map((r) => ({ code: r.plan_code, nameTh: r.name_th, nameEn: r.name_en, category: r.category })));
});

// Get one package's full configuration (all active channel contents)
packagesRouter.get("/:planCode", (req, res) => {
  const detail = serializePackage(req.params.planCode);
  if (!detail) return res.status(404).json({ error: "not_found" });
  res.json(detail);
});

// Update thumbnail / banner for a specific channel
packagesRouter.patch("/:planCode/:channelType/content", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  const b = req.body ?? {};
  db.prepare(
    `UPDATE package_channel_content SET
      thumbnail_c1 = COALESCE(@c1, thumbnail_c1),
      thumbnail_c2 = COALESCE(@c2, thumbnail_c2),
      thumbnail_c3 = COALESCE(@c3, thumbnail_c3),
      banner_title = COALESCE(@bannerTitle, banner_title),
      banner_subtitle = COALESCE(@bannerSubtitle, banner_subtitle)
     WHERE id = @id`
  ).run({
    id: row.id,
    c1: b.thumbnail?.captions?.[0] ?? null,
    c2: b.thumbnail?.captions?.[1] ?? null,
    c3: b.thumbnail?.captions?.[2] ?? null,
    bannerTitle: b.banner?.title ?? null,
    bannerSubtitle: b.banner?.subtitle ?? null,
  });
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Key Features (dynamic rows, shared shape across both channels) ---
packagesRouter.post("/:planCode/:channelType/key-features", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  const { icon = "shield", topic = "หัวข้อใหม่", value = "ระบุค่า", highlight = false } = req.body ?? {};
  const maxOrder = (db.prepare(`SELECT MAX(sort_order) AS m FROM key_features WHERE channel_content_id = ?`).get(row.id) as any)?.m ?? -1;
  const id = nanoid(10);
  db.prepare(`INSERT INTO key_features (id, channel_content_id, sort_order, icon, topic, value, highlight) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, row.id, maxOrder + 1, icon, topic, value, highlight ? 1 : 0);
  const pkgRow = findPackageRow(req.params.planCode);
  log(pkgRow.id, `[${req.params.channelType}] เพิ่ม Key Feature: ${topic}`);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.patch("/:planCode/:channelType/key-features/:id", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  const b = req.body ?? {};
  db.prepare(
    `UPDATE key_features SET
      topic = COALESCE(@topic, topic),
      value = COALESCE(@value, value),
      highlight = COALESCE(@highlight, highlight)
     WHERE id = @id AND channel_content_id = @channelContentId`
  ).run({
    id: req.params.id,
    channelContentId: row.id,
    topic: b.topic ?? null,
    value: b.value ?? null,
    highlight: typeof b.highlight === "boolean" ? (b.highlight ? 1 : 0) : null,
  });
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.delete("/:planCode/:channelType/key-features/:id", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  db.prepare(`DELETE FROM key_features WHERE id = ? AND channel_content_id = ?`).run(req.params.id, row.id);
  const pkgRow = findPackageRow(req.params.planCode);
  log(pkgRow.id, `[${req.params.channelType}] ลบ Key Feature (id: ${req.params.id})`);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Key Advantages (ONLINE only) ---
packagesRouter.patch("/:planCode/ONLINE/key-advantages", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "ONLINE");
  if (!row) return;
  const b = req.body ?? {};
  db.prepare(
    `UPDATE package_channel_content SET
      key_advantages_enabled = COALESCE(@enabled, key_advantages_enabled),
      key_advantages_header = COALESCE(@header, key_advantages_header)
     WHERE id = @id`
  ).run({
    id: row.id,
    enabled: typeof b.enabled === "boolean" ? (b.enabled ? 1 : 0) : null,
    header: b.header ?? null,
  });
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.patch("/:planCode/ONLINE/key-advantages/:id", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "ONLINE");
  if (!row) return;
  const b = req.body ?? {};
  db.prepare(
    `UPDATE key_advantage_cards SET title = COALESCE(@title, title), subtitle = COALESCE(@subtitle, subtitle)
     WHERE id = @id AND channel_content_id = @channelContentId`
  ).run({ id: req.params.id, channelContentId: row.id, title: b.title ?? null, subtitle: b.subtitle ?? null });
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Contractual payout row (ONLINE only) ---
packagesRouter.patch("/:planCode/ONLINE/contractual-payout", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "ONLINE");
  if (!row) return;
  const b = req.body ?? {};
  db.prepare(
    `UPDATE package_channel_content SET
      contractual_payout_value = COALESCE(@value, contractual_payout_value),
      contractual_payout_active = COALESCE(@active, contractual_payout_active)
     WHERE id = @id`
  ).run({
    id: row.id,
    value: typeof b.value === "string" ? b.value : null,
    active: typeof b.active === "boolean" ? (b.active ? 1 : 0) : null,
  });
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Package recommend (ONLINE only) ---
packagesRouter.put("/:planCode/ONLINE/recommends", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "ONLINE");
  if (!row) return;
  const codes: string[] = Array.isArray(req.body?.codes) ? req.body.codes : [];
  // node:sqlite's DatabaseSync has no .transaction() helper (unlike better-sqlite3), so wrap manually.
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM package_recommends WHERE channel_content_id = ?`).run(row.id);
    const insert = db.prepare(`INSERT OR IGNORE INTO package_recommends (channel_content_id, recommended_plan_code, sort_order) VALUES (?, ?, ?)`);
    codes.forEach((c, i) => {
      if (findProductRow(c)) insert.run(row.id, c, i);
    });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Product information (F2F only) ---
packagesRouter.patch("/:planCode/F2F/product-type", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "F2F");
  if (!row) return;
  const productType = req.body?.productType;
  if (!["Normal", "Takaful"].includes(productType)) return res.status(400).json({ error: "invalid_product_type" });
  db.prepare(`UPDATE package_channel_content SET product_type = ? WHERE id = ?`).run(productType, row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

const INFO_GROUPS = ["insurance_type", "additional_coverage", "highlight"] as const;

packagesRouter.post("/:planCode/F2F/product-info-items", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "F2F");
  if (!row) return;
  const { groupType, label = "ระบุรายการ" } = req.body ?? {};
  if (!INFO_GROUPS.includes(groupType)) return res.status(400).json({ error: "invalid_group_type" });
  const maxOrder =
    (db.prepare(`SELECT MAX(sort_order) AS m FROM product_info_items WHERE channel_content_id = ? AND group_type = ?`).get(row.id, groupType) as any)?.m ?? -1;
  db.prepare(`INSERT INTO product_info_items (id, channel_content_id, group_type, sort_order, label) VALUES (?, ?, ?, ?, ?)`)
    .run(nanoid(10), row.id, groupType, maxOrder + 1, label);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.patch("/:planCode/F2F/product-info-items/:id", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "F2F");
  if (!row) return;
  const label = req.body?.label;
  db.prepare(`UPDATE product_info_items SET label = COALESCE(?, label) WHERE id = ? AND channel_content_id = ?`).run(label ?? null, req.params.id, row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.delete("/:planCode/F2F/product-info-items/:id", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, "F2F");
  if (!row) return;
  db.prepare(`DELETE FROM product_info_items WHERE id = ? AND channel_content_id = ?`).run(req.params.id, row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Document T&C (per channel) ---
packagesRouter.post("/:planCode/:channelType/document", upload.single("file"), (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  if (!req.file) return res.status(400).json({ error: "file_required" });
  db.prepare(`UPDATE package_channel_content SET document_filename = ?, document_uploaded_at = datetime('now') WHERE id = ?`)
    .run(req.file.filename, row.id);
  const pkgRow = findPackageRow(req.params.planCode);
  log(pkgRow.id, `[${req.params.channelType}] อัปโหลดเอกสาร: ${req.file.originalname}`);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Thumbnail image (per channel) ---
packagesRouter.post("/:planCode/:channelType/thumbnail-image", uploadImage.single("file"), (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  if (!req.file) return res.status(400).json({ error: "file_required" });
  db.prepare(`UPDATE package_channel_content SET thumbnail_image = ? WHERE id = ?`).run(req.file.filename, row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.delete("/:planCode/:channelType/thumbnail-image", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  db.prepare(`UPDATE package_channel_content SET thumbnail_image = NULL WHERE id = ?`).run(row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// --- Banner image (per channel, slot = "desktop" | "mobile") ---
packagesRouter.post("/:planCode/:channelType/banner-image/:slot", uploadImage.single("file"), (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  if (!req.file) return res.status(400).json({ error: "file_required" });
  const slot = req.params.slot;
  if (slot !== "desktop" && slot !== "mobile") return res.status(400).json({ error: "invalid_slot" });
  const column = slot === "desktop" ? "banner_desktop_image" : "banner_mobile_image";
  db.prepare(`UPDATE package_channel_content SET ${column} = ? WHERE id = ?`).run(req.file.filename, row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

packagesRouter.delete("/:planCode/:channelType/banner-image/:slot", (req, res) => {
  const row = requireChannelContent(res, req.params.planCode, req.params.channelType);
  if (!row) return;
  const slot = req.params.slot;
  if (slot !== "desktop" && slot !== "mobile") return res.status(400).json({ error: "invalid_slot" });
  const column = slot === "desktop" ? "banner_desktop_image" : "banner_mobile_image";
  db.prepare(`UPDATE package_channel_content SET ${column} = NULL WHERE id = ?`).run(row.id);
  touch(req.params.planCode);
  res.json(serializePackage(req.params.planCode));
});

// Delete a Package — only while it hasn't been approved yet (draft or pending_approval).
// packages.plan_code has no ON DELETE CASCADE (see seed.ts), but every child table cascades
// off packages.id (package_channel_content -> its own children, audit_log), so this one
// DELETE is enough with foreign_keys pragma ON.
packagesRouter.delete("/:planCode", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  if (pkgRow.status === "active" || pkgRow.status === "inactive") {
    return res.status(409).json({ error: "already_approved" });
  }
  db.prepare(`DELETE FROM packages WHERE id = ?`).run(pkgRow.id);
  res.json({ ok: true });
});

// Save Draft / Submit for Approval (Package-level status)
packagesRouter.post("/:planCode/status", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  const status = req.body?.status;
  if (!["draft", "pending_approval", "active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }
  db.prepare(`UPDATE packages SET status = ?, updated_at = datetime('now') WHERE plan_code = ?`).run(status, req.params.planCode);
  const label = status === "pending_approval" ? "ส่งขออนุมัติ" : status === "draft" ? "บันทึกฉบับร่าง" : `เปลี่ยนสถานะเป็น ${status}`;
  log(pkgRow.id, label);
  res.json(serializePackage(req.params.planCode));
});

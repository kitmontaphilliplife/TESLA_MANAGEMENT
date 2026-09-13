// Uses Node's built-in SQLite (stable since Node 22.5+) instead of better-sqlite3 —
// avoids a native node-gyp build (and its Python/MSVC toolchain requirement) entirely,
// which is what broke `npm install` on Windows without a working Python install.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets a host with a persistent-disk mount (Render, Railway, Fly.io, ...) point
// the SQLite file somewhere durable; local dev just uses server/data as before.
const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
-- TESLA_MASTER product cache — read-only from TESLA_Management's point of view.
-- Only the fields SET_PACKAGE actually needs are mirrored here (not the full plan master schema).
CREATE TABLE IF NOT EXISTS products (
  plan_code TEXT PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  product_type_code TEXT,
  product_type_name_en TEXT,
  sub_product_type_code TEXT,
  sub_product_type_name_en TEXT,
  insurance_type_code TEXT,
  insurance_type_name_en TEXT,
  has_sub_plan INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  additional_riders TEXT NOT NULL DEFAULT '[]',
  contractual_payouts_flag TEXT,
  maturity_flag TEXT,
  death_benefit_flag TEXT,
  cash_surrender_value_flag TEXT,
  extended_term_flag TEXT,
  reduced_paidup_flag TEXT,
  channel_codes TEXT NOT NULL DEFAULT '[]',
  -- Full original TESLA_MASTER payload (as given), for products where we have it.
  -- Powers the read-only "Package" viewer in Master Setup — every field the master API
  -- returns, not just the subset we've mapped to columns above.
  raw_payload TEXT
);

-- Generic master/reference code tables, modeled on GIO's "Product Setup" screen
-- (gio-app-uat.philliplife.com/product-setup) — one shared shape (Code ID / Name EN /
-- Name TH / Updated date / Updated by) reused across all 12 categories via the category column.
-- channel_group is the one field GIO's own table doesn't have — TESLA_Management adds it
-- only for category = 'distribution_channel', to derive F2F/ONLINE/UNMAPPED (see channelGroups.ts).
-- parent_name is a denormalized name-only reference (e.g. Line of Business "Individual"
-- carries parent_name "Life"), matching how the source GIO export itself stores it —
-- not a foreign key, just an informational label for categories that have a parent.
CREATE TABLE IF NOT EXISTS master_codes (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  code_id TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_th TEXT NOT NULL,
  parent_name TEXT,
  channel_group TEXT CHECK (channel_group IS NULL OR channel_group IN ('F2F','ONLINE','UNMAPPED')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT 'Phil (BA)',
  UNIQUE (category, code_id)
);

-- One Package per Product. Channel-specific content lives in package_channel_content.
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  plan_code TEXT UNIQUE NOT NULL REFERENCES products(plan_code),
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT 'Phil (BA)'
);

-- A Package has one ChannelContent row per channel group the Product is sold through
-- (derived from products.channel_codes via master_codes/distribution_channel — see channelGroups.ts).
-- Fields below are a superset; TESLA-B (F2F) and TESLA-C (ONLINE) each only use their subset:
--   ONLINE-only : icon_asset, contractual_payout_*, key_advantages_*
--   F2F-only    : product_type  (+ product_info_items rows)
--   shared      : thumbnail_*, banner_*, document_* (value entered separately per channel)
CREATE TABLE IF NOT EXISTS package_channel_content (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('F2F','ONLINE')),
  thumbnail_image TEXT,
  thumbnail_c1 TEXT NOT NULL DEFAULT '',
  thumbnail_c2 TEXT NOT NULL DEFAULT '',
  thumbnail_c3 TEXT NOT NULL DEFAULT '',
  banner_desktop_image TEXT,
  banner_mobile_image TEXT,
  banner_title TEXT NOT NULL DEFAULT '',
  banner_subtitle TEXT NOT NULL DEFAULT '',
  icon_asset TEXT,
  contractual_payout_value TEXT NOT NULL DEFAULT '',
  contractual_payout_active INTEGER NOT NULL DEFAULT 0,
  key_advantages_enabled INTEGER NOT NULL DEFAULT 1,
  key_advantages_header TEXT NOT NULL DEFAULT '',
  product_type TEXT,
  document_filename TEXT,
  document_uploaded_at TEXT,
  UNIQUE (package_id, channel_type)
);

CREATE TABLE IF NOT EXISTS key_features (
  id TEXT PRIMARY KEY,
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  icon TEXT NOT NULL DEFAULT 'shield',
  icon_image TEXT,
  topic TEXT NOT NULL,
  value TEXT NOT NULL,
  highlight INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS key_advantage_cards (
  id TEXT PRIMARY KEY,
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  image TEXT,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS package_recommends (
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  recommended_plan_code TEXT NOT NULL REFERENCES products(plan_code),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel_content_id, recommended_plan_code)
);

-- F2F-only "Product information": three repeatable groups (แบบประกัน / ความคุ้มครองเพิ่มเติม / จุดเด่น)
CREATE TABLE IF NOT EXISTS product_info_items (
  id TEXT PRIMARY KEY,
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  group_type TEXT NOT NULL CHECK (group_type IN ('insurance_type','additional_coverage','highlight')),
  sort_order INTEGER NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_templates (
  category TEXT PRIMARY KEY,
  body TEXT NOT NULL
);

-- SET_CAMPAIGN — separate bounded context, only linked in here.
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Coupon','Cashback','Discount','Gift')),
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  discount_label TEXT NOT NULL DEFAULT ''
);

-- A Campaign links to one specific channel's content, not the whole Package.
CREATE TABLE IF NOT EXISTS channel_content_campaigns (
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_content_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Approval chain — recreated fresh each time a package is submitted for approval
-- (see POST /:planCode/status in packages.ts). Submitted is done immediately; Marketing
-- lead / Compliance / Publish start out active/todo/todo.
CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  person TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('done','active','todo')),
  note TEXT NOT NULL DEFAULT '',
  decided_at TEXT
);

-- Reviewer comments pinned to one section of the package (per channel) — section_label is
-- captured at post time so the Approval screen's pill doesn't need a channel-content lookup.
CREATE TABLE IF NOT EXISTS package_comments (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  section_label TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER NOT NULL DEFAULT 0
);

-- Master Setup > Key Features — reference catalog of Key Feature/Key Advantage topics and
-- values a package's Key Features or Key Advantages section can draw on. code_id is
-- auto-assigned (KF01, KF02, ...) by the server, never typed by hand. feature/detail_feature
-- are free text for now (to be sourced from the TESLA_MASTER payload later, per the pending
-- field mapping); section is which package section this entry is for; system is which
-- template (F2F/ONLINE) it applies to.
CREATE TABLE IF NOT EXISTS key_feature_master (
  id TEXT PRIMARY KEY,
  code_id TEXT UNIQUE NOT NULL,
  icon_image TEXT,
  feature TEXT NOT NULL,
  detail_feature TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT 'key_features' CHECK (section IN ('key_features','key_advantages')),
  system TEXT NOT NULL CHECK (system IN ('F2F','ONLINE')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT 'Phil (BA)'
);

-- Multi-file Document uploads (replaces the old single document_filename/document_uploaded_at
-- columns on package_channel_content below — those stay in place, unused, rather than churn a
-- DROP COLUMN; see the one-time migration further down that copies any existing single file in).
CREATE TABLE IF NOT EXISTS package_documents (
  id TEXT PRIMARY KEY,
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Terms & Conditions',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Additive migrations — CREATE TABLE IF NOT EXISTS above won't touch an already-existing
// table, so a new column needs its own guarded ALTER TABLE.
{
  const campaignCols = db.prepare(`PRAGMA table_info(campaigns)`).all() as { name: string }[];
  if (!campaignCols.some((c) => c.name === "channels")) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN channels TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!campaignCols.some((c) => c.name === "code")) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN code TEXT`);
  }
  if (!campaignCols.some((c) => c.name === "budget")) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN budget REAL NOT NULL DEFAULT 0`);
  }
  if (!campaignCols.some((c) => c.name === "budget_used")) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN budget_used REAL NOT NULL DEFAULT 0`);
  }
  if (!campaignCols.some((c) => c.name === "redemptions")) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN redemptions INTEGER NOT NULL DEFAULT 0`);
  }
}

// Expand the campaign type enum to match the redesigned dashboard (Voucher/Cashback/Discount/
// Gift/Installment — "Coupon" renamed to "Voucher"). SQLite can't ALTER a CHECK constraint in
// place, so this rebuilds the table; guarded on the constraint text so it only runs once.
{
  const tableSql = (db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='campaigns'`).get() as { sql: string } | undefined)?.sql ?? "";
  if (!tableSql.includes("Voucher")) {
    // ALTER TABLE RENAME always rewrites other tables' REFERENCES text to the new name —
    // there's no pragma that suppresses it in this SQLite build — so channel_content_campaigns
    // ends up pointing at "campaigns_old" and gets fixed back up in the next migration block
    // below. Each statement must be its own exec() call: bundling them in one multi-statement
    // string left PRAGMA foreign_keys=OFF not actually applied before the DROP TABLE ran,
    // which silently cascade-deleted every row in channel_content_campaigns.
    db.exec(`PRAGMA foreign_keys = OFF;`);
    db.exec(`ALTER TABLE campaigns RENAME TO campaigns_old;`);
    db.exec(`
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        code TEXT,
        type TEXT NOT NULL CHECK (type IN ('Voucher','Cashback','Discount','Gift','Installment')),
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        discount_label TEXT NOT NULL DEFAULT '',
        channels TEXT NOT NULL DEFAULT '[]',
        budget REAL NOT NULL DEFAULT 0,
        budget_used REAL NOT NULL DEFAULT 0,
        redemptions INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.exec(`
      INSERT INTO campaigns (id, code, type, name, start_date, end_date, discount_label, channels, budget, budget_used, redemptions)
        SELECT id, code, CASE WHEN type = 'Coupon' THEN 'Voucher' ELSE type END, name, start_date, end_date, discount_label, channels, budget, budget_used, redemptions
        FROM campaigns_old;
    `);
    db.exec(`DROP TABLE campaigns_old;`);
    db.exec(`PRAGMA foreign_keys = ON;`);
  }
}

// Rebuild channel_content_campaigns if its FK text still points at a stale/dropped
// "campaigns_old" (left over from the campaigns rebuild above, on a database that hit that
// migration before this fix existed) — otherwise every future attach fails with a
// missing-table error, and any rows still hanging off the old name are unreachable.
{
  const cccSql = (db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='channel_content_campaigns'`).get() as { sql: string } | undefined)?.sql ?? "";
  if (cccSql.includes("campaigns_old")) {
    db.exec(`PRAGMA foreign_keys = OFF;`);
    db.exec(`ALTER TABLE channel_content_campaigns RENAME TO channel_content_campaigns_old;`);
    db.exec(`
      CREATE TABLE channel_content_campaigns (
        channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        PRIMARY KEY (channel_content_id, campaign_id)
      );
    `);
    db.exec(`INSERT INTO channel_content_campaigns SELECT * FROM channel_content_campaigns_old;`);
    db.exec(`DROP TABLE channel_content_campaigns_old;`);
    db.exec(`PRAGMA foreign_keys = ON;`);
  }
}

// Backfill a display code (CMP + Buddhist year + running number) for any campaign created
// before codes existed — ordered by rowid (insertion order) since campaigns has no created_at.
{
  const uncoded = db.prepare(`SELECT id FROM campaigns WHERE code IS NULL ORDER BY rowid ASC`).all() as { id: string }[];
  if (uncoded.length > 0) {
    const buddhistYear = new Date().getFullYear() + 543;
    let next = ((db.prepare(`SELECT COUNT(*) AS n FROM campaigns WHERE code IS NOT NULL`).get() as { n: number }).n) + 1;
    const setCode = db.prepare(`UPDATE campaigns SET code = ? WHERE id = ?`);
    for (const row of uncoded) {
      setCode.run(`CMP${buddhistYear}${String(next).padStart(4, "0")}`, row.id);
      next++;
    }
  }
}

// Global per-year targets shown alongside the Campaign dashboard's stat cards
// (annual budget plan, cost-per-policy target) — a single editable settings row per key.
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_settings (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL
  );
  INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('annual_budget_plan', 26000000);
  INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('cost_per_policy_target', 450);
  INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('usage_volume_target', 1000);
`);
{
  const kfCols = db.prepare(`PRAGMA table_info(key_feature_master)`).all() as { name: string }[];
  if (!kfCols.some((c) => c.name === "section")) {
    db.exec(`ALTER TABLE key_feature_master ADD COLUMN section TEXT NOT NULL DEFAULT 'key_features'`);
  }
}
{
  const kfCols = db.prepare(`PRAGMA table_info(key_features)`).all() as { name: string }[];
  if (!kfCols.some((c) => c.name === "icon_image")) {
    db.exec(`ALTER TABLE key_features ADD COLUMN icon_image TEXT`);
  }
}
{
  const kaCols = db.prepare(`PRAGMA table_info(key_advantage_cards)`).all() as { name: string }[];
  if (!kaCols.some((c) => c.name === "image")) {
    db.exec(`ALTER TABLE key_advantage_cards ADD COLUMN image TEXT`);
  }
}

// Backfill: any ONLINE channel content created before key_advantage_cards became a fixed
// 4-row grid (see packageFactory.ts) gets its 4 blank rows now, so Key Advantages isn't
// stuck permanently empty for packages created before this fix.
{
  const onlineContents = db
    .prepare(`SELECT id FROM package_channel_content WHERE channel_type = 'ONLINE'`)
    .all() as { id: string }[];
  const countCards = db.prepare(`SELECT COUNT(*) AS n FROM key_advantage_cards WHERE channel_content_id = ?`);
  const insertCard = db.prepare(
    `INSERT INTO key_advantage_cards (id, channel_content_id, sort_order, title, subtitle) VALUES (?, ?, ?, '', '')`
  );
  for (const c of onlineContents) {
    const n = (countCards.get(c.id) as { n: number }).n;
    for (let i = n; i < 4; i++) insertCard.run(nanoid(10), c.id, i);
  }
}

// One-time data migration: carry any already-uploaded single document over into the new
// package_documents list, so nothing uploaded before this change is lost. Only runs while
// package_documents is still empty, so it's a no-op after the first successful run.
{
  const alreadyMigrated = (db.prepare(`SELECT COUNT(*) AS n FROM package_documents`).get() as { n: number }).n > 0;
  if (!alreadyMigrated) {
    const legacyDocs = db
      .prepare(`SELECT id, document_filename, document_uploaded_at FROM package_channel_content WHERE document_filename IS NOT NULL`)
      .all() as { id: string; document_filename: string; document_uploaded_at: string | null }[];
    const insertDoc = db.prepare(
      `INSERT INTO package_documents (id, channel_content_id, filename, original_name, file_size, document_type, uploaded_at)
       VALUES (?, ?, ?, ?, 0, 'Terms & Conditions', ?)`
    );
    for (const doc of legacyDocs) {
      insertDoc.run(nanoid(10), doc.id, doc.document_filename, doc.document_filename, doc.document_uploaded_at ?? new Date().toISOString());
    }
  }
}

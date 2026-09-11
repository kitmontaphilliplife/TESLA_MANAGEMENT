// Uses Node's built-in SQLite (stable since Node 22.5+) instead of better-sqlite3 —
// avoids a native node-gyp build (and its Python/MSVC toolchain requirement) entirely,
// which is what broke `npm install` on Windows without a working Python install.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

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
  channel_codes TEXT NOT NULL DEFAULT '[]'
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
  topic TEXT NOT NULL,
  value TEXT NOT NULL,
  highlight INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS key_advantage_cards (
  id TEXT PRIMARY KEY,
  channel_content_id TEXT NOT NULL REFERENCES package_channel_content(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
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
`);

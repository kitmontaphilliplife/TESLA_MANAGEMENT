import { nanoid } from "nanoid";
import { db } from "./db.js";
import { classifyChannel } from "./channelGroups.js";

/**
 * Creates a Package for a Product and derives its ChannelContent rows (F2F/ONLINE)
 * from the product's own distribution channels — the content team never chooses the
 * channel directly, per the SET_PACKAGE design. Shared by seed.ts and the "Add Package"
 * flow (POST /api/packages) so both go through the exact same derivation logic.
 */
export function createPackageForProduct(planCode: string, status: string, updatedBy = "Phil (BA)") {
  const product = db.prepare(`SELECT * FROM products WHERE plan_code = ?`).get(planCode) as any;
  if (!product) throw new Error("product_not_found");
  const existing = db.prepare(`SELECT id FROM packages WHERE plan_code = ?`).get(planCode);
  if (existing) throw new Error("package_already_exists");

  const channelCodes = JSON.parse(product.channel_codes || "[]") as { code: string; nameEn: string }[];
  const groups = new Set(channelCodes.map((c) => classifyChannel(c.code, c.nameEn)));
  const unmapped = channelCodes.filter((c) => classifyChannel(c.code, c.nameEn) === "UNMAPPED");

  const packageId = `pkg_${planCode.toLowerCase()}`;
  db.prepare(`INSERT INTO packages (id, plan_code, status, updated_by) VALUES (?, ?, ?, ?)`).run(packageId, planCode, status, updatedBy);

  const channelContentIds: Partial<Record<"F2F" | "ONLINE", string>> = {};
  (["F2F", "ONLINE"] as const).forEach((g) => {
    if (groups.has(g)) {
      const id = nanoid(10);
      db.prepare(`INSERT INTO package_channel_content (id, package_id, channel_type) VALUES (?, ?, ?)`).run(id, packageId, g);
      channelContentIds[g] = id;
    }
  });

  db.prepare(`INSERT INTO audit_log (id, package_id, message) VALUES (?, ?, ?)`).run(nanoid(10), packageId, "สร้าง Package ใหม่ (Draft)");
  if (unmapped.length > 0) {
    db.prepare(`INSERT INTO audit_log (id, package_id, message) VALUES (?, ?, ?)`).run(
      nanoid(10),
      packageId,
      `พบ channel ที่ยังไม่ได้จัดกลุ่ม F2F/Online: ${unmapped.map((u) => `${u.nameEn} (${u.code})`).join(", ")} — รอ Product/Master ยืนยัน`
    );
  }

  return { packageId, channelContentIds };
}

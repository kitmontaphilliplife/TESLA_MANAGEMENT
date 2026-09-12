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

// Every field the products table needs is already on the raw TESLA_MASTER payload itself
// (this is exactly the mapping that was being done by hand into seed.ts for each product
// added this session) — so "paste a payload" is enough to create or update a product,
// no separate form fields required.
function mapPayloadToProduct(payload: any, planCodeOverride?: string) {
  const planCode = planCodeOverride ?? payload.plan_Code;
  const nameTh = payload.plan_Name_Th;
  const nameEn = payload.plan_Name_En;
  if (!planCode || !nameTh || !nameEn) {
    throw new Error("missing_required_fields");
  }
  const channels = Array.isArray(payload.plan_Channel_Code)
    ? payload.plan_Channel_Code.map((c: any) => ({ code: c.channel_Code, nameEn: c.name_En, nameTh: c.name_Th }))
    : [];
  const additionalRiders = Array.isArray(payload.plan_Additional_Rider)
    ? payload.plan_Additional_Rider.map((r: any) => r.product_Type_Name_Th).filter(Boolean)
    : [];
  return {
    planCode,
    nameTh,
    nameEn,
    category: payload.sub_Product_Type_Name_Th ?? "",
    productTypeCode: payload.product_Type_Code ?? null,
    productTypeNameEn: payload.product_Type_Name_En ?? null,
    subProductTypeCode: payload.sub_Product_Type_Code ?? null,
    subProductTypeNameEn: payload.sub_Product_Type_Name_En ?? null,
    insuranceTypeCode: payload.insurance_Type_Code ?? null,
    insuranceTypeNameEn: payload.insurance_Type_Name_En ?? null,
    hasSubPlan: payload.has_Sub_Plan ? 1 : 0,
    startDate: payload.start_Date ? String(payload.start_Date).slice(0, 10) : null,
    endDate: payload.end_Date ? String(payload.end_Date).slice(0, 10) : null,
    additionalRiders: JSON.stringify(additionalRiders),
    contractualPayouts: payload.contractual_Payouts_Flag ?? "N",
    maturity: payload.maturity_Flag ?? "N",
    deathBenefit: payload.death_Benefit_Flag ?? "N",
    cashSurrender: payload.cash_Surrender_Value_Flag ?? "N",
    extendedTerm: payload.extended_Term_Flag ?? "N",
    reducedPaidup: payload.reduced_Paidup_Flag ?? "N",
    channelCodes: JSON.stringify(channels),
    rawPayload: JSON.stringify(payload),
  };
}

// Add a product by pasting its raw TESLA_MASTER payload.
productsRouter.post("/", (req, res) => {
  const payload = req.body?.payload;
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "payload_required" });
  let mapped;
  try {
    mapped = mapPayloadToProduct(payload);
  } catch {
    return res.status(400).json({ error: "missing_required_fields" });
  }
  const existing = db.prepare(`SELECT plan_code FROM products WHERE plan_code = ?`).get(mapped.planCode);
  if (existing) return res.status(409).json({ error: "plan_code_exists" });
  db.prepare(
    `INSERT INTO products (plan_code, name_th, name_en, category, product_type_code, product_type_name_en,
      sub_product_type_code, sub_product_type_name_en, insurance_type_code, insurance_type_name_en,
      has_sub_plan, start_date, end_date, additional_riders, contractual_payouts_flag, maturity_flag,
      death_benefit_flag, cash_surrender_value_flag, extended_term_flag, reduced_paidup_flag, channel_codes,
      raw_payload)
    VALUES (@planCode, @nameTh, @nameEn, @category, @productTypeCode, @productTypeNameEn,
      @subProductTypeCode, @subProductTypeNameEn, @insuranceTypeCode, @insuranceTypeNameEn,
      @hasSubPlan, @startDate, @endDate, @additionalRiders, @contractualPayouts, @maturity,
      @deathBenefit, @cashSurrender, @extendedTerm, @reducedPaidup, @channelCodes, @rawPayload)`
  ).run(mapped);
  res.status(201).json({ planCode: mapped.planCode });
});

// Re-paste a payload onto an existing product (its plan code, if present in the payload
// too, must match the one already in the URL — this isn't a rename).
productsRouter.put("/:planCode", (req, res) => {
  const planCode = req.params.planCode;
  const payload = req.body?.payload;
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "payload_required" });
  if (payload.plan_Code && payload.plan_Code !== planCode) return res.status(400).json({ error: "plan_code_mismatch" });
  const existing = db.prepare(`SELECT plan_code FROM products WHERE plan_code = ?`).get(planCode);
  if (!existing) return res.status(404).json({ error: "not_found" });
  let mapped;
  try {
    mapped = mapPayloadToProduct(payload, planCode);
  } catch {
    return res.status(400).json({ error: "missing_required_fields" });
  }
  db.prepare(
    `UPDATE products SET name_th=@nameTh, name_en=@nameEn, category=@category, product_type_code=@productTypeCode,
      product_type_name_en=@productTypeNameEn, sub_product_type_code=@subProductTypeCode,
      sub_product_type_name_en=@subProductTypeNameEn, insurance_type_code=@insuranceTypeCode,
      insurance_type_name_en=@insuranceTypeNameEn, has_sub_plan=@hasSubPlan, start_date=@startDate,
      end_date=@endDate, additional_riders=@additionalRiders, contractual_payouts_flag=@contractualPayouts,
      maturity_flag=@maturity, death_benefit_flag=@deathBenefit, cash_surrender_value_flag=@cashSurrender,
      extended_term_flag=@extendedTerm, reduced_paidup_flag=@reducedPaidup, channel_codes=@channelCodes,
      raw_payload=@rawPayload
    WHERE plan_code=@planCode`
  ).run(mapped);
  res.json({ planCode });
});

// Delete a product — blocked while a Package still references it.
productsRouter.delete("/:planCode", (req, res) => {
  const planCode = req.params.planCode;
  const existing = db.prepare(`SELECT plan_code FROM products WHERE plan_code = ?`).get(planCode);
  if (!existing) return res.status(404).json({ error: "not_found" });
  const pkg = db.prepare(`SELECT id FROM packages WHERE plan_code = ?`).get(planCode);
  if (pkg) return res.status(409).json({ error: "has_package" });
  db.prepare(`DELETE FROM products WHERE plan_code = ?`).run(planCode);
  res.json({ ok: true });
});

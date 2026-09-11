import { db } from "./db.js";
import { nanoid } from "nanoid";
import masterData from "./masterDataSeed.json" with { type: "json" };
import wln001Payload from "./rawProductPayloads/WLN001.json" with { type: "json" };
import enn002Payload from "./rawProductPayloads/ENN002.json" with { type: "json" };
import enn001Payload from "./rawProductPayloads/ENN001.json" with { type: "json" };

// Full original TESLA_MASTER payloads, for products where the business actually gave us
// one — powers the read-only "Package" viewer in Master Setup. ENN019 and PA0231 have no
// real payload (see notes on those products below), so they're left out of this map.
const RAW_PAYLOADS: Record<string, unknown> = {
  WLN001: wln001Payload,
  ENN002: enn002Payload,
  ENN001: enn001Payload,
};

// ---------------------------------------------------------------------------
// 1. Master / reference codes — mirrors GIO's "Product Setup" screen structure
//    (gio-app-uat.philliplife.com/product-setup): 12 categories, each a flat code
//    table (Code ID / Name EN / Name TH [/ Parent]). Loaded from masterDataSeed.json,
//    which was extracted from the real "Master data.xlsx" export the user provided —
//    not hand-typed, since occupation_position alone has 447 rows.
//    NOTE: occupation_group and occupation_position had Name EN/Name TH reversed in
//    that source file; the extraction script swapped them back.
//
//    channel_group (F2F/ONLINE/UNMAPPED) is a TESLA_Management-only addition on top of
//    distribution_channel — not part of GIO's own table. Confirmed 2026-09-11 by the
//    business (via the Master Setup screen, then baked in here so it survives the free
//    Render instance's ephemeral filesystem — see the "start:demo re-seeds on every boot"
//    note in README): CHN01/02/03/06/09/10 = F2F, CHN04/07/08 = ONLINE. CHN05 (Direct
//    Marketing) is still unconfirmed. CHN10 is "Telesale" per this file — earlier we had
//    (wrongly) assumed CHN10 was "Online" based on the ENN001 payload alone; this master
//    export is the more authoritative source, so ENN001's channel list below was corrected.
//    CHN11-14 (DTS, IBANK, MOM, TELEID) were removed from Distribution Channel by the
//    business — excluded from seeding below, not just left UNMAPPED.
// ---------------------------------------------------------------------------
const CONFIRMED_CHANNEL_GROUPS: Record<string, string> = {
  CHN01: "F2F",
  CHN02: "F2F",
  CHN03: "F2F",
  CHN04: "ONLINE",
  CHN06: "F2F",
  CHN07: "ONLINE",
  CHN08: "ONLINE",
  CHN09: "F2F",
  CHN10: "F2F",
};
const EXCLUDED_DISTRIBUTION_CHANNELS = new Set(["CHN11", "CHN12", "CHN13", "CHN14"]);

db.exec(`DELETE FROM master_codes`);
const insertMasterCode = db.prepare(
  `INSERT INTO master_codes (id, category, code_id, name_en, name_th, parent_name, channel_group) VALUES (?, ?, ?, ?, ?, ?, ?)`
);
type MasterDataRow = { codeId: string; nameEn: string; nameTh: string; parentName: string | null };
const typedMasterData = masterData as Record<string, MasterDataRow[]>;
for (const [category, rows] of Object.entries(typedMasterData)) {
  for (const row of rows) {
    if (category === "distribution_channel" && EXCLUDED_DISTRIBUTION_CHANNELS.has(row.codeId)) continue;
    const channelGroup = category === "distribution_channel" ? CONFIRMED_CHANNEL_GROUPS[row.codeId] ?? "UNMAPPED" : null;
    insertMasterCode.run(nanoid(10), category, row.codeId, row.nameEn, row.nameTh, row.parentName, channelGroup);
  }
}

// ---------------------------------------------------------------------------
// 2. Products (TESLA_MASTER cache) — reset 2026-09-11 at the business's request (old list
//    mixed real payloads with guessed/synthetic ones, confusing to tell apart). Added back
//    one at a time, only once a real payload is actually provided — see RAW_PAYLOADS above
//    for the exact source file per plan code.
// ---------------------------------------------------------------------------
interface ProductChannel { code: string; nameEn: string; nameTh: string }
interface ProductSeed {
  planCode: string; nameTh: string; nameEn: string; category: string;
  productTypeCode: string; productTypeNameEn: string;
  subProductTypeCode: string; subProductTypeNameEn: string;
  insuranceTypeCode: string; insuranceTypeNameEn: string; hasSubPlan: boolean;
  startDate: string | null; endDate: string | null;
  additionalRiders: string[];
  flags: { contractualPayouts: string; maturity: string; deathBenefit: string; cashSurrender: string; extendedTerm: string; reducedPaidup: string };
  channels: ProductChannel[];
}

const products: ProductSeed[] = [
  {
    // Real payload: "Happy value 90/20" (WLN001) — re-confirmed by the business 2026-09-11,
    // identical to what was provided before the reset. Full payload: rawProductPayloads/WLN001.json.
    planCode: "WLN001", nameTh: "แฮปปี้ แวลู 90/20 ชนิดไม่มีเงินปันผล", nameEn: "Happy Value 90/20",
    category: "ประกันชีวิตตลอดชีพ",
    productTypeCode: "PTY01", productTypeNameEn: "Ordinary Life Insurance",
    subProductTypeCode: "SPT02", subProductTypeNameEn: "Whole Life",
    insuranceTypeCode: "INSTYPNRM", insuranceTypeNameEn: "Normal", hasSubPlan: false,
    startDate: "2020-11-16", endDate: null,
    additionalRiders: ["ประกันภัยอุบัติเหตุ", "ประกันโรคร้ายแรง", "ค่าชดเชยรายวันจากการเข้าพักรักษาตัวในโรงพยาบาล", "ประกันสุขภาพ", "สัญญาเพิ่มการประกันภัยชั่วระยะเวลา", "คุ้มครองผู้ชำระเบี้ยประกันภัย", "ทุพพลภาพสิ้นเชิงถาวร", "ยกเว้นเบี้ยประกันภัย"],
    flags: { contractualPayouts: "Y", maturity: "Y", deathBenefit: "Y", cashSurrender: "Y", extendedTerm: "Y", reducedPaidup: "Y" },
    channels: [
      { code: "CHN01", nameEn: "Agent", nameTh: "ตัวแทนของบริษัท" },
      { code: "CHN02", nameEn: "Broker", nameTh: "นายหน้าประกันชีวิต" },
      { code: "CHN03", nameEn: "Bancassurance", nameTh: "ธนาคาร" },
      { code: "CHN06", nameEn: "Work Site", nameTh: "การขายผ่านองค์กร" },
      { code: "CHN09", nameEn: "Partnership", nameTh: "ช่องทางจัดจำหน่าย/ขยายธุรกิจผ่านพันธมิตร" },
    ],
  },
  {
    // Real payload: "Max Ten One 10/1 Xtra" (ENN002) — re-confirmed 2026-09-11, identical
    // to what was provided before the reset. Full payload: rawProductPayloads/ENN002.json.
    planCode: "ENN002", nameTh: "แม็กซ์ เท็น วัน 10/1 เอ็กซ์ตร้า ชนิดไม่มีเงินปันผล", nameEn: "Max Ten One 10/1 Xtra",
    category: "ประกันแบบสะสมทรัพย์",
    productTypeCode: "PTY01", productTypeNameEn: "Ordinary Life Insurance",
    subProductTypeCode: "SPT03", subProductTypeNameEn: "Endowment",
    insuranceTypeCode: "INSTYPNRM", insuranceTypeNameEn: "Normal", hasSubPlan: false,
    startDate: "2024-11-25", endDate: null, additionalRiders: [],
    flags: { contractualPayouts: "Y", maturity: "Y", deathBenefit: "Y", cashSurrender: "Y", extendedTerm: "N", reducedPaidup: "N" },
    channels: [
      { code: "CHN01", nameEn: "Agent", nameTh: "ตัวแทนของบริษัท" },
      { code: "CHN02", nameEn: "Broker", nameTh: "นายหน้าประกันชีวิต" },
      { code: "CHN03", nameEn: "Bancassurance", nameTh: "ธนาคาร" },
      { code: "CHN04", nameEn: "Direct Online", nameTh: "ลูกค้าติดต่อโดยตรงกับบริษัททางอิเล็กทรอนิกส์" },
      { code: "CHN05", nameEn: "Direct Marketing", nameTh: "ขายตรง" },
      { code: "CHN06", nameEn: "Work Site", nameTh: "การขายผ่านองค์กร" },
      { code: "CHN07", nameEn: "Agent Online", nameTh: "ตัวแทนของบริษัท (ขายช่องทางออนไลน์)" },
      { code: "CHN08", nameEn: "Broker Online", nameTh: "นายหน้าประกันชีวิต (ขายช่องทางออนไลน์)" },
    ],
  },
];

const insertProduct = db.prepare(`
  INSERT INTO products (plan_code, name_th, name_en, category, product_type_code, product_type_name_en,
    sub_product_type_code, sub_product_type_name_en, insurance_type_code, insurance_type_name_en,
    has_sub_plan, start_date, end_date, additional_riders, contractual_payouts_flag, maturity_flag,
    death_benefit_flag, cash_surrender_value_flag, extended_term_flag, reduced_paidup_flag, channel_codes,
    raw_payload)
  VALUES (@planCode, @nameTh, @nameEn, @category, @productTypeCode, @productTypeNameEn,
    @subProductTypeCode, @subProductTypeNameEn, @insuranceTypeCode, @insuranceTypeNameEn,
    @hasSubPlan, @startDate, @endDate, @additionalRiders, @contractualPayouts, @maturity,
    @deathBenefit, @cashSurrender, @extendedTerm, @reducedPaidup, @channelCodes,
    @rawPayload)
`);

// packages.plan_code references products.plan_code without ON DELETE CASCADE, so packages
// (and everything that cascades from them) must be cleared before products on a re-seed.
db.exec(`DELETE FROM packages`);
db.exec(`DELETE FROM products`);
for (const p of products) {
  insertProduct.run({
    planCode: p.planCode, nameTh: p.nameTh, nameEn: p.nameEn, category: p.category,
    productTypeCode: p.productTypeCode, productTypeNameEn: p.productTypeNameEn,
    subProductTypeCode: p.subProductTypeCode, subProductTypeNameEn: p.subProductTypeNameEn,
    insuranceTypeCode: p.insuranceTypeCode, insuranceTypeNameEn: p.insuranceTypeNameEn,
    hasSubPlan: p.hasSubPlan ? 1 : 0, startDate: p.startDate, endDate: p.endDate,
    additionalRiders: JSON.stringify(p.additionalRiders),
    contractualPayouts: p.flags.contractualPayouts, maturity: p.flags.maturity, deathBenefit: p.flags.deathBenefit,
    cashSurrender: p.flags.cashSurrender, extendedTerm: p.flags.extendedTerm, reducedPaidup: p.flags.reducedPaidup,
    channelCodes: JSON.stringify(p.channels.map((c) => ({ code: c.code, nameEn: c.nameEn, nameTh: c.nameTh }))),
    rawPayload: RAW_PAYLOADS[p.planCode] ? JSON.stringify(RAW_PAYLOADS[p.planCode]) : null,
  });
}

// ---------------------------------------------------------------------------
// 3. Packages — intentionally none for now (see note above: cleared with the products).
//    createPackageForProduct (packageFactory.ts) is still what the "+ Add Package" flow
//    calls at runtime once real products exist again.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. Legal templates (read-only, owned by Legal/Compliance)
// ---------------------------------------------------------------------------
db.exec(`DELETE FROM legal_templates`);
const insertLegal = db.prepare(`INSERT INTO legal_templates (category, body) VALUES (?, ?)`);
insertLegal.run(
  "ออมทรัพย์",
  [
    "ความสมบูรณ์ของสัญญาประกันภัย: ในกรณีที่ผู้เอาประกันภัยรู้อยู่แล้วและแถลงข้อความอันเป็นเท็จ หรือรู้อยู่แล้วในข้อความจริงใดแต่ไม่เปิดเผยข้อความจริงนั้นให้บริษัทฯทราบ สัญญาประกันภัยนี้จะตกเป็นโมฆียะตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 865",
    "กรณีที่บริษัทฯ จะไม่คุ้มครอง: ผู้เอาประกันภัยฆ่าตัวตายด้วยใจสมัครภายใน 1 ปี นับแต่วันเริ่มมีผลคุ้มครองตามกรมธรรม์",
    "หมายเหตุ: การลดหย่อนภาษี เบี้ยประกันภัยสามารถใช้ลดหย่อนภาษีได้สูงสุด 100,000 บาทต่อปี ตามเงื่อนไขของกรมสรรพากร",
    "คำเตือน: ผู้ขอเอาประกันภัยควรทำความเข้าใจในรายละเอียดความคุ้มครองและเงื่อนไขก่อนตัดสินใจทำประกันทุกครั้ง",
  ].join("\n\n")
);
insertLegal.run(
  "ประกันชีวิตตลอดชีพ",
  [
    "ความสมบูรณ์ของสัญญาประกันภัย: เป็นไปตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 865",
    "ระยะเวลา Free Look: ผู้เอาประกันภัยมีสิทธิ์ยกเลิกกรมธรรม์ภายใน 15 วัน นับแต่วันที่ได้รับกรมธรรม์",
    "คำเตือน: ผู้ขอเอาประกันภัยควรทำความเข้าใจในรายละเอียดความคุ้มครองและเงื่อนไขก่อนตัดสินใจทำประกันทุกครั้ง",
  ].join("\n\n")
);
insertLegal.run(
  "ประกันแบบสะสมทรัพย์",
  [
    "ความสมบูรณ์ของสัญญาประกันภัย: เป็นไปตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 865",
    "หมายเหตุ: กรมธรรม์นี้เป็นแบบชำระเบี้ยประกันภัยครั้งเดียว ไม่มีการต่ออายุ",
    "คำเตือน: ผู้ขอเอาประกันภัยควรทำความเข้าใจในรายละเอียดความคุ้มครองและเงื่อนไขก่อนตัดสินใจทำประกันทุกครั้ง",
  ].join("\n\n")
);

// ---------------------------------------------------------------------------
// 5. Campaign (SET_CAMPAIGN) — linked to one specific channel's content, per confirmed decision
// ---------------------------------------------------------------------------
db.exec(`DELETE FROM campaigns`);
db.exec(`DELETE FROM channel_content_campaigns`);
db.prepare(`INSERT INTO campaigns (id, type, name, start_date, end_date, discount_label) VALUES (?, ?, ?, ?, ?, ?)`).run(
  "cmp_ny2569", "Discount", "ลดหย่อนภาษีต้อนรับปีใหม่ 2569", "2025-12-01", "2026-01-31", "ส่วนลดเบี้ยปีแรก 5%"
);
{
  const onlineContentRow = db
    .prepare(
      `SELECT pcc.id FROM package_channel_content pcc JOIN packages p ON p.id = pcc.package_id WHERE p.plan_code = 'ENN019' AND pcc.channel_type = 'ONLINE'`
    )
    .get() as { id: string } | undefined;
  if (onlineContentRow) {
    db.prepare(`INSERT INTO channel_content_campaigns (channel_content_id, campaign_id) VALUES (?, 'cmp_ny2569')`).run(onlineContentRow.id);
  }
}

console.log("Seed complete.");

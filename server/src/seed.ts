import { db } from "./db.js";
import { nanoid } from "nanoid";
import { createPackageForProduct } from "./packageFactory.js";
import masterData from "./masterDataSeed.json" with { type: "json" };

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
//    distribution_channel — not part of GIO's own table. Only CHN01 (F2F) and
//    CHN04/07/08 (ONLINE) are confirmed; everything else starts UNMAPPED, editable from
//    the Master Setup screen. CHN10 is "Telesale" per this file — earlier we had (wrongly)
//    assumed CHN10 was "Online" based on the ENN001 payload alone; this master export is
//    the more authoritative source, so ENN001's channel list below has been corrected.
// ---------------------------------------------------------------------------
const CONFIRMED_CHANNEL_GROUPS: Record<string, string> = {
  CHN01: "F2F",
  CHN04: "ONLINE",
  CHN07: "ONLINE",
  CHN08: "ONLINE",
};

db.exec(`DELETE FROM master_codes`);
const insertMasterCode = db.prepare(
  `INSERT INTO master_codes (id, category, code_id, name_en, name_th, parent_name, channel_group) VALUES (?, ?, ?, ?, ?, ?, ?)`
);
type MasterDataRow = { codeId: string; nameEn: string; nameTh: string; parentName: string | null };
const typedMasterData = masterData as Record<string, MasterDataRow[]>;
for (const [category, rows] of Object.entries(typedMasterData)) {
  for (const row of rows) {
    const channelGroup = category === "distribution_channel" ? CONFIRMED_CHANNEL_GROUPS[row.codeId] ?? "UNMAPPED" : null;
    insertMasterCode.run(nanoid(10), category, row.codeId, row.nameEn, row.nameTh, row.parentName, channelGroup);
  }
}

// ---------------------------------------------------------------------------
// 2. Products (TESLA_MASTER cache) — real payloads covering the 3 scenarios:
//    ENN019 = Online-only, WLN001 = F2F-only (+1 unmapped channel),
//    ENN002 / ENN001 = both F2F & Online (+1-2 unmapped channels)
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
    planCode: "ENN019", nameTh: "แม็กซ์ เก็น เก็น 10/10 เอ็กซ์ตร้า พลัส", nameEn: "Tax Fighter 10/10",
    category: "ออมทรัพย์",
    // ไม่มี payload จริงสำหรับ ENN019 — ใช้ค่าสมมติที่สอดคล้องกับหมวด "ออมทรัพย์" (เหมือน ENN002) รอ confirm จาก master จริง
    productTypeCode: "PTY01", productTypeNameEn: "Ordinary Life Insurance",
    subProductTypeCode: "SPT03", subProductTypeNameEn: "Endowment",
    insuranceTypeCode: "INSTYPNRM", insuranceTypeNameEn: "Normal", hasSubPlan: false,
    startDate: "2026-02-20", endDate: "2037-02-20", additionalRiders: [],
    flags: { contractualPayouts: "Y", maturity: "Y", deathBenefit: "Y", cashSurrender: "Y", extendedTerm: "Y", reducedPaidup: "Y" },
    channels: [{ code: "CHN04", nameEn: "Direct Online", nameTh: "ลูกค้าติดต่อโดยตรงกับบริษัททางอิเล็กทรอนิกส์" }],
  },
  {
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
  {
    // Real payload (Max Ten One 10/1) — kept without a Package on purpose, so the
    // "+ Add Package" picker has a real product to select (demonstrates both F2F+ONLINE
    // channels together, plus 2 unmapped channels: Direct Marketing and Telesale).
    planCode: "ENN001", nameTh: "แม็กซ์ เท็น วัน 10/1 ชนิดไม่มีเงินปันผล", nameEn: "Max Ten One 10/1",
    category: "ประกันแบบสะสมทรัพย์",
    productTypeCode: "PTY01", productTypeNameEn: "Ordinary Life Insurance",
    subProductTypeCode: "SPT03", subProductTypeNameEn: "Endowment",
    insuranceTypeCode: "INSTYPNRM", insuranceTypeNameEn: "Normal", hasSubPlan: false,
    startDate: "2020-09-10", endDate: null, additionalRiders: [],
    flags: { contractualPayouts: "Y", maturity: "Y", deathBenefit: "Y", cashSurrender: "Y", extendedTerm: "N", reducedPaidup: "N" },
    channels: [
      { code: "CHN01", nameEn: "Agent", nameTh: "ตัวแทนของบริษัท" },
      { code: "CHN02", nameEn: "Broker", nameTh: "นายหน้าประกันชีวิต" },
      { code: "CHN03", nameEn: "Bancassurance", nameTh: "ธนาคาร" },
      { code: "CHN04", nameEn: "Direct Online", nameTh: "ลูกค้าติดต่อโดยตรงกับบริษัททางอิเล็กทรอนิกส์" },
      { code: "CHN05", nameEn: "Direct Marketing", nameTh: "ขายตรง" },
      { code: "CHN06", nameEn: "Work Site", nameTh: "การขายผ่านองค์กร" },
      { code: "CHN07", nameEn: "Agent Online", nameTh: "ตัวแทนของบริษัท (ขายช่องทางออนไลน์)" },
      // The ENN001 payload itself called CHN10 "Online", but Master data.xlsx (the
      // authoritative distribution_channel export) says CHN10 = "Telesale" — going with
      // the master file. Telesale isn't clearly F2F or Online, so it's left UNMAPPED.
      { code: "CHN10", nameEn: "Telesale", nameTh: "ติดต่อลูกค้าผ่านทางโทรศัพท์" },
    ],
  },
  {
    // Synthetic placeholder (not from a real TESLA_MASTER payload) —
    // kept without a Package so the "+ Add Package" picker has something to select.
    planCode: "PA0231", nameTh: "คิดส์ พีเอ", nameEn: "Kids PA",
    category: "อุบัติเหตุ",
    productTypeCode: "PTY02", productTypeNameEn: "Personal Accident",
    subProductTypeCode: "SPT05", subProductTypeNameEn: "Personal Accident",
    insuranceTypeCode: "INSTYPNRM", insuranceTypeNameEn: "Normal", hasSubPlan: false,
    startDate: "2023-01-01", endDate: null, additionalRiders: [],
    flags: { contractualPayouts: "N", maturity: "N", deathBenefit: "Y", cashSurrender: "N", extendedTerm: "N", reducedPaidup: "N" },
    channels: [{ code: "CHN04", nameEn: "Direct Online", nameTh: "ลูกค้าติดต่อโดยตรงกับบริษัททางอิเล็กทรอนิกส์" }],
  },
];

const insertProduct = db.prepare(`
  INSERT INTO products (plan_code, name_th, name_en, category, product_type_code, product_type_name_en,
    sub_product_type_code, sub_product_type_name_en, insurance_type_code, insurance_type_name_en,
    has_sub_plan, start_date, end_date, additional_riders, contractual_payouts_flag, maturity_flag,
    death_benefit_flag, cash_surrender_value_flag, extended_term_flag, reduced_paidup_flag, channel_codes)
  VALUES (@planCode, @nameTh, @nameEn, @category, @productTypeCode, @productTypeNameEn,
    @subProductTypeCode, @subProductTypeNameEn, @insuranceTypeCode, @insuranceTypeNameEn,
    @hasSubPlan, @startDate, @endDate, @additionalRiders, @contractualPayouts, @maturity,
    @deathBenefit, @cashSurrender, @extendedTerm, @reducedPaidup, @channelCodes)
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
  });
}

// ---------------------------------------------------------------------------
// 3. Packages + per-channel content, derived from each product's channel groups
//    (packages were already cleared above, before products, to respect the FK)
// ---------------------------------------------------------------------------
const insertFeature = db.prepare(
  `INSERT INTO key_features (id, channel_content_id, sort_order, icon, topic, value, highlight) VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertAdvCard = db.prepare(
  `INSERT INTO key_advantage_cards (id, channel_content_id, sort_order, title, subtitle) VALUES (?, ?, ?, ?, ?)`
);
const insertInfoItem = db.prepare(
  `INSERT INTO product_info_items (id, channel_content_id, group_type, sort_order, label) VALUES (?, ?, ?, ?, ?)`
);
const insertRecommend = db.prepare(
  `INSERT INTO package_recommends (channel_content_id, recommended_plan_code, sort_order) VALUES (?, ?, ?)`
);
function createPackage(planCode: string, status: string) {
  // packageFactory logs its own "created" + "unmapped channel" audit entries with datetime('now');
  // that's fine for seed data — exact seed timestamps aren't load-bearing for the demo.
  return createPackageForProduct(planCode, status, "Phil (BA)");
}

// --- ENN019: Online-only, rich content (reused from the original prototype) ---
{
  const { channelContentIds } = createPackage("ENN019", "active");
  const online = channelContentIds.ONLINE!;
  db.prepare(`
    UPDATE package_channel_content SET
      thumbnail_c1 = ?, thumbnail_c2 = ?, thumbnail_c3 = ?,
      banner_title = ?, banner_subtitle = ?,
      icon_asset = ?, contractual_payout_value = ?, contractual_payout_active = 1,
      key_advantages_enabled = 1, key_advantages_header = ?
    WHERE id = ?
  `).run(
    "ผลประโยชน์บริวารตลอดสัญญา 1100%", "คุ้มครองยาวนาน 10 ปี", "ลดหย่อนภาษีสูงสุด 100,000 บาท",
    "แบ่งเบาภาระวันนี้ เพื่อวันข้างหน้าที่มั่นคง", "ประกันออมทรัพย์ 10/10 เอ็กซ์ตร้า พลัส",
    "myxtra-logo", "10%",
    "ทำไมต้องแม็กซ์ เก็น เก็น 10/10 เอ็กซ์ตร้า พลัส",
    online
  );
  const features: Array<[string, string, string, boolean]> = [
    ["sum-assured", "ทุนประกันภัยสูงสุด", "1,000,000 บาท", false],
    ["clock", "ระยะเวลาคุ้มครอง", "10 ปี", false],
    ["calendar", "ระยะเวลาชำระเบี้ย", "10 ปี", true],
    ["tax", "ลดหย่อนภาษีได้สูงสุด", "100,000 บาท/ปี", false],
    ["refund", "เงินคืนระหว่างสัญญา", "2% ทุกปีกรมธรรม์", false],
    ["maturity", "เงินครบกำหนดสัญญา", "110% ของทุนประกัน", false],
    ["death", "ผลประโยชน์กรณีเสียชีวิต", "100% ของทุนประกัน", false],
  ];
  features.forEach(([icon, topic, value, highlight], i) => insertFeature.run(nanoid(10), online, i, icon, topic, value, highlight ? 1 : 0));

  const advantages: Array<[string, string]> = [
    ["คุ้มครองชีวิตยาวนาน", "รับความคุ้มครองเต็ม 10 ปี อุ่นใจได้นานขึ้น"],
    ["ลดหย่อนภาษีได้สูงสุด", "สูงสุด 100,000 บาทต่อปี ตามเกณฑ์กรมสรรพากร"],
    ["รับเงินคืนระหว่างทาง", "2% ทุกปีกรมธรรม์ เสริมสภาพคล่องให้ครอบครัว"],
    ["จ่ายเบี้ยสั้น คุ้มครองยาว", "ชำระเบี้ย 10 ปี คุ้มครอง 10 ปี บริหารเงินง่ายขึ้น"],
  ];
  advantages.forEach(([title, subtitle], i) => insertAdvCard.run(nanoid(10), online, i, title, subtitle));

  ["WLN001", "ENN002"].forEach((code, i) => insertRecommend.run(online, code, i));

  db.prepare(`UPDATE package_channel_content SET document_filename = ?, document_uploaded_at = datetime('now') WHERE id = ?`)
    .run("Tax_Fighter_10_10_TC.pdf", online);
}

// --- WLN001: F2F-only, Partnership (CHN09) unmapped ---
{
  const { channelContentIds } = createPackage("WLN001", "draft");
  const f2f = channelContentIds.F2F!;
  db.prepare(`UPDATE package_channel_content SET product_type = 'Normal' WHERE id = ?`).run(f2f);

  const features: Array<[string, string]> = [
    ["อายุรับประกัน", "15 วัน - 65 ปี"],
    ["ระยะเวลาคุ้มครอง", "ถึงอายุ 90 ปี (ตลอดชีพ)"],
    ["ระยะเวลาชำระเบี้ย", "20 ปี"],
    ["การลดหย่อนภาษี", "ลดหย่อนได้ตามเงื่อนไขกรมสรรพากร (LIFE_COND)"],
  ];
  features.forEach(([topic, value], i) => insertFeature.run(nanoid(10), f2f, i, "shield", topic, value, 0));

  ["ประกันชีวิตตลอดชีพ"].forEach((label, i) => insertInfoItem.run(nanoid(10), f2f, "insurance_type", i, label));
  ["ประกันภัยอุบัติเหตุ", "ประกันโรคร้ายแรง", "ค่าชดเชยรายวัน (HB)"].forEach((label, i) =>
    insertInfoItem.run(nanoid(10), f2f, "additional_coverage", i, label)
  );
}

// --- ENN002: both F2F and Online, Direct Marketing (CHN05) unmapped ---
{
  const { channelContentIds } = createPackage("ENN002", "pending_approval");
  const f2f = channelContentIds.F2F!;
  const online = channelContentIds.ONLINE!;

  db.prepare(`UPDATE package_channel_content SET product_type = 'Normal' WHERE id = ?`).run(f2f);
  [
    ["อายุรับประกัน", "1 - 65 ปี"],
    ["ระยะเวลาชำระเบี้ย", "ชำระครั้งเดียว (Single Premium)"],
    ["ทุนประกันภัย", "5,000 - 10,000,000 บาท"],
    ["ส่วนลดเบี้ยประกันสูงสุด", "10%"],
  ].forEach(([topic, value], i) => insertFeature.run(nanoid(10), f2f, i, "shield", topic, value, 0));
  ["ประกันแบบสะสมทรัพย์"].forEach((label, i) => insertInfoItem.run(nanoid(10), f2f, "insurance_type", i, label));

  db.prepare(`
    UPDATE package_channel_content SET
      banner_title = ?, banner_subtitle = ?, contractual_payout_value = '100%', contractual_payout_active = 1,
      key_advantages_enabled = 1, key_advantages_header = ?
    WHERE id = ?
  `).run("จ่ายครั้งเดียว คุ้มครองครบ 1 ปี", "แม็กซ์ เท็น วัน 10/1 เอ็กซ์ตร้า", "สั้น คุ้ม จบใน 1 ปี", online);
  [
    ["shield", "ทุนประกันภัย", "5,000 - 10,000,000 บาท", false],
    ["calendar", "ระยะเวลาชำระเบี้ย", "ชำระครั้งเดียว", true],
    ["refund", "ส่วนลดเบี้ยประกันสูงสุด", "10%", false],
  ].forEach(([icon, topic, value, highlight], i) =>
    insertFeature.run(nanoid(10), online, i, icon as string, topic as string, value as string, highlight ? 1 : 0)
  );
  [["จบไว ไม่ผูกมัดยาว", "จ่ายเบี้ยครั้งเดียว คุ้มครอง 1 ปีเต็ม"]].forEach(([title, subtitle], i) =>
    insertAdvCard.run(nanoid(10), online, i, title, subtitle)
  );
  insertRecommend.run(online, "ENN019", 0);
}

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

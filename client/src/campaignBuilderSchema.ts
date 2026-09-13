// Data-driven schema for the Campaign Builder wizard — transcribed from the design handoff at
// _mockups_extracted/design_handoff_package_configuration/README-campaign-builder.md ("Campaign
// Builder (TESLA CONFIG)"). One schema serves all ten promotion types; adding an eleventh is a data
// change, not a new form component.

export type FieldKind = "text" | "num" | "select" | "radio" | "textarea";

export interface FieldSchema {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  unit?: string;
  default?: string;
  span?: 1 | 2 | 4;
  hint?: string;
  placeholder?: string;
}

export interface SectionSchema {
  title: string;
  fields: FieldSchema[];
}

export interface PreviewRow {
  label: string;
  key: string;
}

export interface PromotionType {
  id: string;
  name: string;
  th: string;
  status: "in-use" | "proposed";
  description: string;
  sections: SectionSchema[];
  previewRows: PreviewRow[];
  notes: string[];
  head: (val: (key: string) => string) => string;
  headSub: (val: (key: string) => string) => string;
  // Budget-impact unit cost model (placeholder — README flags these as needing real
  // actuarial/finance figures before this ships): unitCost(vals) x maxRedemptions vs budget.
  unitCost: (val: (key: string) => string) => number;
}

function n(v: string): number {
  const cleaned = v.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

export const PROMOTION_TYPES: PromotionType[] = [
  {
    id: "voucher",
    name: "Voucher",
    th: "คูปอง / e-Voucher",
    status: "in-use",
    description: "Partner or in-house voucher issued after a qualifying event.",
    sections: [
      {
        title: "Voucher details",
        fields: [
          { key: "vtype", label: "Voucher type", kind: "select", required: true, options: ["E-Voucher", "Physical voucher", "Partner code"], default: "E-Voucher" },
          { key: "provider", label: "Voucher provider", kind: "select", required: true, options: ["Central", "Lotus's", "Grab", "Starbucks", "Other partner"], default: "Central" },
          { key: "vname", label: "Voucher name", kind: "text", required: true, default: "Central e-Voucher 500 THB", span: 2 },
          { key: "value", label: "Voucher value", kind: "num", required: true, unit: "THB", default: "500", hint: "Face value per voucher" },
          { key: "qty", label: "Quantity", kind: "num", required: true, unit: "vouchers", default: "5,000", hint: "Total prepared for the campaign" },
          { key: "per", label: "Per customer", kind: "num", required: true, unit: "vouchers", default: "1" },
          { key: "expiry", label: "Expiry after issue", kind: "num", required: true, unit: "days", default: "90" },
        ],
      },
      {
        title: "Delivery",
        fields: [
          { key: "dmethod", label: "Delivery method", kind: "radio", required: true, options: ["Email", "SMS", "Both"], default: "Email", span: 2 },
          { key: "dtiming", label: "Delivery timing", kind: "select", required: true, options: ["Immediately on issue", "After policy effective", "After first premium paid"], default: "After policy effective" },
          { key: "dday", label: "Delivery day after effective", kind: "num", unit: "days", default: "7" },
        ],
      },
      { title: "Terms & conditions", fields: [{ key: "terms", label: "Shown to the customer", kind: "textarea", span: 4 }] },
    ],
    previewRows: [
      { label: "Provider", key: "provider" },
      { label: "Voucher value", key: "value" },
      { label: "Total quantity", key: "qty" },
      { label: "Per customer", key: "per" },
      { label: "Expiry period", key: "expiry" },
      { label: "Delivery", key: "dmethod" },
      { label: "Delivery timing", key: "dtiming" },
    ],
    notes: [
      "Confirm stock with the partner before the campaign opens.",
      "Voucher count is decremented at policy issue, not at quote.",
      "The promotion closes automatically when stock runs out.",
    ],
    head: (val) => `฿${val("value")} ${val("vtype")}`,
    headSub: (val) => `${val("provider")} · valid ${val("expiry")} days from issue`,
    unitCost: (val) => n(val("value")),
  },
  {
    id: "discount",
    name: "Discount",
    th: "ส่วนลดเบี้ยประกัน",
    status: "in-use",
    description: "Premium reduction applied at quotation, percentage or fixed amount.",
    sections: [
      {
        title: "Discount details",
        fields: [
          { key: "dtype", label: "Discount type", kind: "radio", required: true, options: ["Percentage", "Fixed amount", "Buy X get Y", "Other"], default: "Percentage", span: 4 },
          { key: "dvalue", label: "Discount value", kind: "num", required: true, unit: "%", default: "20", hint: "1–100" },
          { key: "dmax", label: "Maximum discount", kind: "num", unit: "THB", default: "10,000", hint: "Blank = unlimited" },
          { key: "applyon", label: "Apply discount on", kind: "select", required: true, options: ["First year premium", "Total premium", "Rider premium only"], default: "First year premium" },
          { key: "round", label: "Rounding rule", kind: "select", options: ["Round down", "Round up", "Nearest baht"], default: "Round down" },
        ],
      },
      {
        title: "Discount conditions",
        fields: [
          { key: "minprem", label: "Minimum premium", kind: "num", unit: "THB", default: "10,000" },
          { key: "maxprem", label: "Maximum premium", kind: "num", placeholder: "Unlimited" },
          { key: "minyear", label: "Minimum policy year", kind: "select", options: ["1", "2", "3", "5"], default: "1" },
          { key: "maxyear", label: "Maximum policy year", kind: "num", placeholder: "Unlimited" },
        ],
      },
      {
        title: "Discount limit",
        fields: [
          { key: "percust", label: "Per customer limit", kind: "select", options: ["1", "2", "3", "Unlimited"], default: "1" },
          { key: "perpolicy", label: "Limit per policy", kind: "select", options: ["1", "2", "Unlimited"], default: "1" },
          { key: "total", label: "Total usage limit", kind: "num", placeholder: "Unlimited" },
        ],
      },
    ],
    previewRows: [
      { label: "Discount type", key: "dtype" },
      { label: "Discount value", key: "dvalue" },
      { label: "Maximum discount", key: "dmax" },
      { label: "Apply on", key: "applyon" },
      { label: "Minimum premium", key: "minprem" },
      { label: "Per customer limit", key: "percust" },
    ],
    notes: [
      "Discount is calculated after eligibility passes, before tax.",
      "Cannot be converted to cash.",
      "Set a maximum discount to keep the campaign inside budget.",
    ],
    head: (val) => `${val("dvalue")}% off first-year premium`,
    headSub: (val) => `capped at ฿${val("dmax")}`,
    unitCost: (val) => n(val("dmax")),
  },
  {
    id: "cashback",
    name: "Cashback",
    th: "เงินคืน",
    status: "in-use",
    description: "Money returned after the policy is in force.",
    sections: [
      {
        title: "Cashback calculation",
        fields: [
          { key: "basis", label: "Calculation basis", kind: "radio", required: true, options: ["By percentage", "By fixed amount", "By tier"], default: "By percentage", span: 4 },
          { key: "from", label: "Calculate from", kind: "select", required: true, options: ["First year premium", "Total premium", "Premium after discount"], default: "First year premium" },
          { key: "cvalue", label: "Cashback value", kind: "num", required: true, unit: "%", default: "5" },
          { key: "cmax", label: "Maximum cashback", kind: "num", unit: "THB", default: "5,000", hint: "Blank = unlimited" },
          { key: "round", label: "Rounding rule", kind: "select", options: ["Round down", "Round up", "Nearest baht"], default: "Round down" },
        ],
      },
      {
        title: "Cashback payment",
        fields: [
          { key: "pmethod", label: "Payment method", kind: "select", required: true, options: ["Bank transfer", "Premium credit", "e-Wallet"], default: "Bank transfer" },
          { key: "ptiming", label: "Payment timing", kind: "select", required: true, options: ["After policy effective", "After free-look period", "After first renewal"], default: "After policy effective" },
          { key: "pday", label: "Payment day after effective", kind: "num", unit: "days", default: "30" },
        ],
      },
      {
        title: "Cashback conditions",
        fields: [
          { key: "minprem", label: "Minimum premium", kind: "num", unit: "THB", default: "10,000" },
          { key: "maxprem", label: "Maximum premium", kind: "num", placeholder: "Unlimited" },
          { key: "minyear", label: "Minimum policy year", kind: "select", options: ["1", "2", "3"], default: "1" },
          { key: "clawback", label: "Clawback on early lapse", kind: "radio", options: ["Yes", "No"], default: "Yes" },
        ],
      },
    ],
    previewRows: [
      { label: "Calculation", key: "basis" },
      { label: "Calculate from", key: "from" },
      { label: "Cashback rate", key: "cvalue" },
      { label: "Maximum limit", key: "cmax" },
      { label: "Payment method", key: "pmethod" },
      { label: "Payment timing", key: "ptiming" },
    ],
    notes: [
      "Cashback is transferred by the method the customer selected.",
      "No entitlement if the policy lapses before the qualifying date.",
      "Calculated on premium after discount and tax.",
    ],
    head: (val) => `${val("cvalue")}% cashback`,
    headSub: (val) => `paid ${val("pday")} days after policy effective`,
    unitCost: (val) => n(val("cmax")),
  },
  {
    id: "gift",
    name: "Free gift",
    th: "ของแถม",
    status: "in-use",
    description: "Physical or digital gift delivered to the customer.",
    sections: [
      {
        title: "Gift details",
        fields: [
          { key: "gtype", label: "Gift type", kind: "select", required: true, options: ["Physical gift", "Digital gift", "Service voucher"], default: "Physical gift" },
          { key: "gcat", label: "Gift category", kind: "select", required: true, options: ["Lifestyle", "Health", "Home", "Travel", "Electronics"], default: "Lifestyle" },
          { key: "gname", label: "Gift name", kind: "text", required: true, default: "Stainless steel tumbler", span: 2 },
          { key: "gdesc", label: "Gift description", kind: "textarea", span: 4 },
          { key: "gvalue", label: "Gift value", kind: "num", unit: "THB", default: "590" },
          { key: "gqty", label: "Quantity", kind: "num", required: true, unit: "pieces", default: "5,000" },
          { key: "gper", label: "Per customer", kind: "num", required: true, unit: "pieces", default: "1" },
        ],
      },
      {
        title: "Gift delivery",
        fields: [
          { key: "gmethod", label: "Delivery method", kind: "radio", required: true, options: ["By post", "Branch pickup", "e-Voucher"], default: "By post", span: 2 },
          { key: "gtiming", label: "Delivery timing", kind: "select", required: true, options: ["After policy effective", "After free-look period", "On request"], default: "After policy effective" },
          { key: "gday", label: "Delivery day after effective", kind: "num", unit: "days", default: "30" },
        ],
      },
      { title: "Gift terms & conditions", fields: [{ key: "gterms", label: "Shown to the customer", kind: "textarea", span: 4 }] },
    ],
    previewRows: [
      { label: "Gift type", key: "gtype" },
      { label: "Category", key: "gcat" },
      { label: "Gift value", key: "gvalue" },
      { label: "Total quantity", key: "gqty" },
      { label: "Per customer", key: "gper" },
      { label: "Delivery", key: "gmethod" },
      { label: "Delivery timing", key: "gtiming" },
    ],
    notes: [
      "Check warehouse stock before the campaign opens.",
      "Stock is decremented on policy issue.",
      "The campaign closes automatically when stock runs out.",
    ],
    head: (val) => `${val("gname")}`,
    headSub: (val) => `value ฿${val("gvalue")} · delivered by post`,
    unitCost: (val) => n(val("gvalue")),
  },
  {
    id: "installment",
    name: "Installment",
    th: "ผ่อนชำระ",
    status: "in-use",
    description: "Instalment payment plan for the premium, with or without interest.",
    sections: [
      {
        title: "Instalment plan",
        fields: [
          { key: "plan", label: "Plan type", kind: "radio", required: true, options: ["0% interest", "Subsidised interest", "Extended term"], default: "0% interest", span: 4 },
          { key: "months", label: "Instalment term", kind: "select", required: true, options: ["3 months", "6 months", "10 months", "12 months"], default: "10 months" },
          { key: "bank", label: "Partner banks", kind: "select", required: true, options: ["All partner banks", "KBank, SCB", "KBank, SCB, BBL, KTC", "Single bank"], default: "KBank, SCB, BBL, KTC" },
          { key: "minprem", label: "Minimum premium", kind: "num", required: true, unit: "THB", default: "20,000" },
          { key: "cards", label: "Eligible payment methods", kind: "select", options: ["Credit card only", "Credit and debit card"], default: "Credit card only" },
        ],
      },
      {
        title: "Fees & settlement",
        fields: [
          { key: "fee", label: "Merchant fee", kind: "num", unit: "%", default: "1.8" },
          { key: "feeby", label: "Fee borne by", kind: "select", required: true, options: ["Company", "Partner bank", "Shared 50/50"], default: "Company" },
          { key: "cycle", label: "Settlement cycle", kind: "select", options: ["Monthly", "Twice monthly", "Per transaction"], default: "Monthly" },
        ],
      },
      {
        title: "Conditions",
        fields: [
          { key: "percust", label: "Per customer limit", kind: "select", options: ["1 policy", "2 policies", "Unlimited"], default: "1 policy" },
          { key: "iterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Plan type", key: "plan" },
      { label: "Term", key: "months" },
      { label: "Partner banks", key: "bank" },
      { label: "Minimum premium", key: "minprem" },
      { label: "Merchant fee", key: "fee" },
      { label: "Fee borne by", key: "feeby" },
    ],
    notes: [
      "Instalment cost must be included in the campaign budget as merchant fee.",
      "Approval is the issuing bank's decision, not ours.",
      "Flag the plan on the quote screen so agents can explain it.",
    ],
    head: (val) => `${val("plan")} for ${val("months")}`,
    headSub: (val) => `${val("bank")} · min ฿${val("minprem")}`,
    unitCost: (val) => n(val("minprem")) * 0.018,
  },
  {
    id: "points",
    name: "Reward points",
    th: "สะสมแต้ม",
    status: "proposed",
    description: "Points earned on premium paid, redeemable in the rewards catalogue.",
    sections: [
      {
        title: "Earning rule",
        fields: [
          { key: "rate", label: "Points per 100 THB", kind: "num", required: true, unit: "points", default: "2" },
          { key: "from", label: "Calculate from", kind: "select", required: true, options: ["First year premium", "Every premium paid", "Renewal premium only"], default: "Every premium paid" },
          { key: "cap", label: "Maximum points per policy", kind: "num", default: "5,000", placeholder: "Unlimited" },
          { key: "expiry", label: "Points expiry", kind: "num", unit: "months", default: "24" },
        ],
      },
      {
        title: "Redemption",
        fields: [
          { key: "catalogue", label: "Redemption catalogue", kind: "select", options: ["Standard rewards", "Premium rewards", "Partner catalogue"], default: "Standard rewards" },
          { key: "minredeem", label: "Minimum points to redeem", kind: "num", default: "500" },
          { key: "pterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Earning rate", key: "rate" },
      { label: "Calculate from", key: "from" },
      { label: "Cap per policy", key: "cap" },
      { label: "Points expiry", key: "expiry" },
      { label: "Catalogue", key: "catalogue" },
    ],
    notes: [
      "Needs a points ledger per customer — check with the loyalty platform team.",
      "Expiring points must trigger a reminder 60 days ahead.",
    ],
    head: (val) => `${val("rate")} points per ฿100`,
    headSub: (val) => `points valid ${val("expiry")} months`,
    unitCost: (val) => n(val("cap")) * 0.1,
  },
  {
    id: "referral",
    name: "Referral",
    th: "แนะนำเพื่อน",
    status: "proposed",
    description: "Reward both the referring customer and the new customer.",
    sections: [
      {
        title: "Reward split",
        fields: [
          { key: "rtype", label: "Reward type", kind: "radio", required: true, options: ["Voucher", "Cashback", "Reward points"], default: "Voucher", span: 2 },
          { key: "referrer", label: "Reward for the referrer", kind: "num", required: true, unit: "THB", default: "500" },
          { key: "referee", label: "Reward for the new customer", kind: "num", required: true, unit: "THB", default: "500" },
          { key: "maxref", label: "Maximum referrals per customer", kind: "num", default: "5" },
          { key: "event", label: "Qualifying event", kind: "select", required: true, options: ["Policy issued", "First premium paid", "After free-look period"], default: "First premium paid" },
        ],
      },
      {
        title: "Conditions",
        fields: [
          { key: "minprem", label: "Minimum premium of the referred policy", kind: "num", unit: "THB", default: "15,000", span: 2 },
          { key: "rterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Reward type", key: "rtype" },
      { label: "Referrer reward", key: "referrer" },
      { label: "New customer reward", key: "referee" },
      { label: "Max referrals", key: "maxref" },
      { label: "Qualifying event", key: "event" },
    ],
    notes: [
      "Needs a referral code per customer and an attribution rule for duplicates.",
      "Consider a fraud check on high-volume referrers.",
    ],
    head: (val) => `฿${val("referrer")} for each side`,
    headSub: () => "paid when the referred policy is issued",
    unitCost: (val) => n(val("referrer")) * 2,
  },
  {
    id: "bundle",
    name: "Bundle discount",
    th: "ซื้อคู่ลดเพิ่ม",
    status: "proposed",
    description: "Extra discount when the customer buys two or more products together.",
    sections: [
      {
        title: "Bundle rule",
        fields: [
          { key: "products", label: "Products in the bundle", kind: "select", required: true, options: ["Life + Health", "Life + Critical illness", "Any two products", "Any three products"], default: "Life + Health", span: 2 },
          { key: "bvalue", label: "Extra discount", kind: "num", required: true, unit: "%", default: "5" },
          { key: "applyon", label: "Apply discount on", kind: "select", required: true, options: ["Second policy premium", "Total bundle premium", "Cheaper policy"], default: "Second policy premium" },
          { key: "window", label: "Both policies within", kind: "num", unit: "days", default: "30", hint: "Time allowed between the two applications" },
        ],
      },
      {
        title: "Conditions",
        fields: [
          { key: "minprem", label: "Minimum total premium", kind: "num", unit: "THB", default: "30,000" },
          { key: "bterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Bundle", key: "products" },
      { label: "Extra discount", key: "bvalue" },
      { label: "Apply on", key: "applyon" },
      { label: "Purchase window", key: "window" },
      { label: "Minimum total premium", key: "minprem" },
    ],
    notes: [
      "Recalculation on cancellation needs a clear finance rule.",
      "Agents need a bundle quote view to sell this.",
    ],
    head: (val) => `Extra ${val("bvalue")}% on the second policy`,
    headSub: (val) => `${val("products")} bought together`,
    unitCost: (val) => n(val("minprem")) * 0.05,
  },
  {
    id: "rider",
    name: "Free add-on cover",
    th: "ความคุ้มครองเพิ่มฟรี",
    status: "proposed",
    description: "A rider given free for a fixed period instead of a monetary reward.",
    sections: [
      {
        title: "Cover",
        fields: [
          { key: "rider", label: "Rider", kind: "select", required: true, options: ["Accident cover", "Critical illness top-up", "Hospital income", "Dental"], default: "Accident cover" },
          { key: "amount", label: "Cover amount", kind: "num", required: true, unit: "THB", default: "100,000" },
          { key: "period", label: "Free period", kind: "num", required: true, unit: "months", default: "12" },
          { key: "renew", label: "After the free period", kind: "radio", required: true, options: ["Auto-renew chargeable", "Ends automatically"], default: "Ends automatically", span: 2 },
        ],
      },
      {
        title: "Conditions",
        fields: [
          { key: "age", label: "Age range", kind: "text", default: "20–55 years" },
          { key: "minprem", label: "Minimum premium", kind: "num", unit: "THB", default: "15,000" },
          { key: "rterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Rider", key: "rider" },
      { label: "Cover amount", key: "amount" },
      { label: "Free period", key: "period" },
      { label: "After free period", key: "renew" },
      { label: "Age range", key: "age" },
    ],
    notes: [
      "Actuarial sign-off needed on the cost of the free rider.",
      "Auto-renew must be disclosed clearly at the point of sale.",
    ],
    head: (val) => `Free ${val("rider")}`,
    headSub: (val) => `฿${val("amount")} cover, first ${val("period")} months`,
    unitCost: (val) => n(val("amount")) * 0.02,
  },
  {
    id: "draw",
    name: "Lucky draw",
    th: "ลุ้นรับรางวัล",
    status: "proposed",
    description: "Prize draw entries earned by buying during the campaign period.",
    sections: [
      {
        title: "Prize",
        fields: [
          { key: "prize", label: "Prize", kind: "text", required: true, default: "Gold necklace 1 baht", span: 2 },
          { key: "pvalue", label: "Prize value", kind: "num", required: true, unit: "THB", default: "42,000" },
          { key: "count", label: "Number of prizes", kind: "num", required: true, unit: "prizes", default: "10" },
          { key: "entries", label: "Entries per policy", kind: "num", required: true, unit: "entries", default: "1" },
          { key: "drawdate", label: "Draw date", kind: "text", required: true, default: "15/05/2026" },
        ],
      },
      {
        title: "Conditions",
        fields: [
          { key: "minprem", label: "Minimum premium per entry", kind: "num", unit: "THB", default: "20,000" },
          { key: "dterms", label: "Terms & conditions", kind: "textarea", span: 4 },
        ],
      },
    ],
    previewRows: [
      { label: "Prize", key: "prize" },
      { label: "Prize value", key: "pvalue" },
      { label: "Number of prizes", key: "count" },
      { label: "Entries per policy", key: "entries" },
      { label: "Draw date", key: "drawdate" },
    ],
    notes: [
      "A prize draw needs a permit from the local authority before launch.",
      "Withholding tax on prizes must be stated in the terms.",
    ],
    head: (val) => `Lucky draw · ${val("count")} prizes`,
    headSub: (val) => `draw ${val("drawdate")}`,
    unitCost: (val) => n(val("pvalue")) * 0.01,
  },
];

export function getPromotionType(id: string | null): PromotionType | null {
  return PROMOTION_TYPES.find((t) => t.id === id) ?? null;
}

// Step 3 — shared eligibility schema, identical for all ten types.
export const ELIGIBILITY_SECTIONS: SectionSchema[] = [
  {
    title: "Products in scope",
    fields: [
      { key: "family", label: "Product families", kind: "select", required: true, options: ["All families", "Tax Fighter", "Health series", "Retirement", "Savings"], default: "Tax Fighter" },
      { key: "packages", label: "Specific packages", kind: "text", span: 2, hint: "Blank = every package in the family", placeholder: "ENN019, HFP204" },
      { key: "term", label: "Policy term", kind: "select", options: ["Any", "10/10 only", "15/25 only"], default: "Any" },
    ],
  },
  {
    title: "Customer eligibility",
    fields: [
      { key: "segment", label: "Customer segment", kind: "select", required: true, options: ["All customers", "New customers only", "Existing customers", "Lapsed customers", "VIP"], default: "New customers only" },
      { key: "agemin", label: "Minimum age", kind: "num", unit: "years", default: "20" },
      { key: "agemax", label: "Maximum age", kind: "num", unit: "years", default: "60" },
      { key: "sa", label: "Minimum sum assured", kind: "num", unit: "THB", default: "500,000" },
    ],
  },
  {
    title: "Channels & period",
    fields: [
      { key: "channels", label: "Channels", kind: "radio", required: true, options: ["All channels", "Online only", "Agent only", "Online + Agent"], default: "Online + Agent", span: 4 },
      { key: "start", label: "Start", kind: "text", required: true, default: "01/04/2026 00:00" },
      { key: "end", label: "End", kind: "text", required: true, default: "30/04/2026 23:59" },
      { key: "blackout", label: "Blackout dates", kind: "text", span: 2, placeholder: "e.g. 13–15/04/2026" },
    ],
  },
  {
    title: "Budget & usage cap",
    fields: [
      { key: "budget", label: "Campaign budget", kind: "num", required: true, unit: "THB", default: "3,000,000" },
      { key: "maxredeem", label: "Maximum redemptions", kind: "num", default: "5,000" },
      { key: "percust", label: "Per customer cap", kind: "num", default: "1" },
      { key: "stack", label: "Stacking rule", kind: "radio", required: true, options: ["Cannot combine", "Combine with discount only", "Combine with anything"], default: "Cannot combine", span: 4 },
    ],
  },
];

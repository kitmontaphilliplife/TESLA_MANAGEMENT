export type ChannelType = "F2F" | "ONLINE";
export type ChannelGroup = "F2F" | "ONLINE" | "UNMAPPED";

export interface KeyFeature {
  id: string;
  icon: string;
  iconImage: string | null;
  topic: string;
  value: string;
  highlight: boolean;
}

export interface KeyAdvantageCard {
  id: string;
  image: string | null;
  title: string;
  subtitle: string;
}

export const DOCUMENT_TYPES = ["Terms & Conditions", "Benefit Table", "Other"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface PackageDocument {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  documentType: DocumentType;
  uploadedAt: string;
}

export interface ProductInfoItem {
  id: string;
  label: string;
}

export interface RecommendedPackage {
  code: string;
  nameTh: string;
  nameEn: string;
  category: string;
}

export const CAMPAIGN_CHANNELS = ["Web", "Agent app", "LINE OA", "Call centre"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_TYPES = ["Voucher", "Cashback", "Discount", "Gift", "Installment"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// "Gift" is the stored value (kept for continuity with existing data) but the dashboard's
// own mockup labels it "Free gift" — every other type displays under its own name as-is.
export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  Voucher: "Voucher",
  Cashback: "Cashback",
  Discount: "Discount",
  Gift: "Free gift",
  Installment: "Installment",
};

export interface Campaign {
  id: string;
  code: string;
  type: CampaignType;
  name: string;
  startDate: string;
  endDate: string;
  discountLabel: string;
  channels: CampaignChannel[];
  budget: number;
  budgetUsed: number;
  redemptions: number;
}

// One package/channel a Campaign is attached to.
export interface CampaignAttachment {
  channelType: ChannelType;
  planCode: string;
  packageNameEn: string;
  packageNameTh: string;
}

// A Campaign plus every package/channel it's currently attached to (zero, one, or many).
export interface CampaignListItem extends Campaign {
  attachments: CampaignAttachment[];
}

// Dashboard summary for one date range — stat cards, promotion mix, and the schedule strip.
export interface CampaignSummary {
  campaignsCount: number;
  liveNowCount: number;
  budgetCommitted: number;
  budgetUsed: number;
  redemptions: number;
  redemptionsDeltaPct: number | null;
  costPerPolicy: number;
  annualBudgetPlan: number;
  costPerPolicyTarget: number;
  usageVolumeTarget: number;
  mixByType: { type: CampaignType; pct: number }[];
  schedule: { id: string; name: string; startDate: string; endDate: string }[];
}

export interface CampaignSettings {
  annualBudgetPlan: number;
  costPerPolicyTarget: number;
  usageVolumeTarget: number;
}

// One package's channel contents and the campaigns scheduled on each — the Campaign builder screen.
export interface PackageChannelCampaigns {
  channelType: ChannelType;
  campaigns: Campaign[];
}

export interface AuditEntry {
  message: string;
  created_at: string;
}

export interface ApprovalStep {
  id: string;
  role: "Submitted" | "Marketing lead" | "Compliance" | "Publish";
  person: string;
  state: "done" | "active" | "todo";
  note: string;
  decidedAt: string | null;
}

export interface PackageComment {
  id: string;
  sectionId: string;
  sectionLabel: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
}

// One row in the Approval queue's overview table.
export interface ApprovalQueueItem {
  planCode: string;
  nameTh: string;
  nameEn: string;
  category: string;
  status: PackageDetail["status"];
  updatedAt: string;
  updatedBy: string;
  currentStep: ApprovalStep["role"] | null;
  openComments: number;
}

// One package's approval chain + comments + audit log — the Approval detail screen.
export interface ApprovalDetail {
  planCode: string;
  status: PackageDetail["status"];
  updatedAt: string;
  updatedBy: string;
  chain: ApprovalStep[];
  comments: PackageComment[];
  auditLog: AuditEntry[];
}

// One content set for one distribution-channel group (TESLA-B = F2F, TESLA-C = ONLINE).
// ONLINE-only and F2F-only fields are null on the channel they don't apply to.
export interface ChannelContent {
  channelContentId: string;
  channelType: ChannelType;
  thumbnail: { image: string | null; captions: [string, string, string] };
  banner: { desktopImage: string | null; mobileImage: string | null; title: string; subtitle: string };
  keyFeatures: KeyFeature[];

  iconAsset: string | null; // ONLINE only
  contractualPayout: { value: string; active: boolean } | null; // ONLINE only
  keyAdvantages: { enabled: boolean; header: string; cards: KeyAdvantageCard[] } | null; // ONLINE only
  recommends: RecommendedPackage[] | null; // ONLINE only

  productType: "Normal" | "Takaful" | null; // F2F only
  productInformation: {
    insuranceTypes: ProductInfoItem[];
    additionalCoverages: ProductInfoItem[];
    highlights: ProductInfoItem[];
  } | null; // F2F only

  document: { legalText: string | null };
  documents: PackageDocument[];
  campaign: Campaign | null;
}

export interface ProductChannel {
  code: string;
  nameEn: string;
  nameTh: string;
  group: ChannelGroup;
}

// TESLA_MASTER product — read-only reference inside TESLA_Management.
export interface Product {
  planCode: string;
  nameTh: string;
  nameEn: string;
  category: string;
  insuranceTypeCode: string;
  insuranceTypeNameEn: string;
  hasSubPlan: boolean;
  startDate: string | null;
  endDate: string | null;
  additionalRiders: string[];
  flags: {
    contractualPayouts: boolean;
    maturity: boolean;
    deathBenefit: boolean;
    cashSurrender: boolean;
    extendedTerm: boolean;
    reducedPaidup: boolean;
  };
  channels: ProductChannel[];
}

export interface PackageDetail {
  packageId: string;
  status: "draft" | "pending_approval" | "active" | "inactive";
  updatedAt: string;
  updatedBy: string;
  product: Product;
  channelContents: ChannelContent[]; // 1-2 entries, derived from product.channels
  unmappedChannels: { channelCode: string; nameEn: string }[];
  auditLog: AuditEntry[];
}

export interface PackageSummary {
  planCode: string;
  nameTh: string;
  nameEn: string;
  category: string;
  channelGroups: ("F2F" | "ONLINE")[];
  status: PackageDetail["status"];
  updatedAt: string;
  updatedBy: string;
}

// Master Setup — generic reference-code tables, modeled on GIO's Product Setup screen.
export const MASTER_CODE_CATEGORIES = [
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
export type MasterCodeCategory = (typeof MASTER_CODE_CATEGORIES)[number];

export const MASTER_CODE_CATEGORY_LABEL: Record<MasterCodeCategory, string> = {
  class_of_business: "Class of Business",
  line_of_business: "Line of Business",
  coverage_type: "Coverage Type",
  product_type: "Product Type",
  sub_product_type: "Sub Product Type",
  occupation_class: "Occupation Class",
  occupation_group: "Occupation Group",
  occupation_position: "Occupation Position",
  occupation: "Occupation",
  distribution_channel: "Distribution Channel",
  payment_mode: "Payment Mode",
  payment_method: "Payment Method",
};

export interface MasterCode {
  id: string;
  category: MasterCodeCategory;
  codeId: string;
  nameEn: string;
  nameTh: string;
  parentName: string | null; // e.g. Sub Product Type "Whole Life" -> parentName "Ordinary Life Insurance"
  channelGroup: ChannelGroup | null; // only used for category === "distribution_channel"
  updatedAt: string;
  updatedBy: string;
}

// Master Setup > Key Features — reference catalog of Key Feature topics/values, one entry
// per F2F or ONLINE template. feature/detailFeature are manual for now (payload-sourced later).
export const KEY_FEATURE_SECTIONS = ["key_features", "key_advantages"] as const;
export type KeyFeatureSection = (typeof KEY_FEATURE_SECTIONS)[number];
export const KEY_FEATURE_SECTION_LABEL: Record<KeyFeatureSection, string> = {
  key_features: "Key Features",
  key_advantages: "Key Advantages",
};

export interface KeyFeatureMaster {
  id: string;
  codeId: string;
  iconImage: string | null;
  feature: string;
  detailFeature: string;
  section: KeyFeatureSection;
  system: "F2F" | "ONLINE";
  updatedAt: string;
  updatedBy: string;
}

// TESLA_MASTER product, as browsed from the "+ Add Package" picker (not yet a Package).
export interface ProductListItem {
  planCode: string;
  nameTh: string;
  nameEn: string;
  category: string;
  productTypeNameEn: string;
  subProductTypeNameEn: string;
  startDate: string | null;
  channels: { code: string; nameEn: string; group: ChannelGroup }[];
  channelGroups: ChannelGroup[];
  hasPackage: boolean;
  hasRawPayload: boolean;
}

// Full original TESLA_MASTER payload, as given by the business — loosely typed since it's
// a pass-through of whatever the master API returns, not our own normalized shape.
export interface RawProductPayload {
  plan_Code: string;
  plan_Name_En: string;
  plan_Name_Th: string;
  description: string | null;
  class_Of_Business_Name_En: string;
  class_Of_Business_Name_Th: string;
  line_Of_Business_Name_En: string;
  line_Of_Business_Name_Th: string;
  coverage_Type_Name_En: string;
  coverage_Type_Name_Th: string;
  product_Type_Name_En: string;
  product_Type_Name_Th: string;
  sub_Product_Type_Name_En: string;
  sub_Product_Type_Name_Th: string;
  insurance_Type_Name_En: string;
  insurance_Type_Name_Th: string;
  type_Of_Rider_Name_En: string | null;
  currency_Code: string;
  country_Code: string;
  start_Date: string;
  end_Date: string | null;
  participation_Flag: string;
  free_Look_Flag: string;
  client_Coverage_Type_Code: string;
  min_Sum_Assurance: number;
  max_Sum_Assurance: number;
  plan_Channel_Code: { channel_Code: string; name_En: string; name_Th: string }[];
  coverage_Duration_Method_Code: string;
  coverage_Duration_Value: number | null;
  premium_Duration_Method_Code: string;
  premium_Duration_Value: number | null;
  tax_Exempts: {
    gender_Name_En: string; min_Age: number; max_Age: number;
    min_Sum_Assurance: number; max_Sum_Assurance: number;
    occupation_Class_Name_En: string | null; tax_Percent: number;
  }[];
  waiting_Period: number | null;
  plan_Additional_Rider: { product_Type_Name_En: string; product_Type_Name_Th: string }[];
  plan_Coverage_Benefit: Record<string, unknown>[];
  min_Issue_Age_Method_Code: string;
  min_Issue_Age_Value: number;
  max_Issue_Age_Method_Code: string;
  max_Issue_Age_Value: number;
  plan_Gender_Code: { name_En: string; name_Th: string }[];
  plan_Occupation_Class_Code: { name_En: string; name_Th: string }[];
  plan_Type_Of_Underwrite_Code: { name_En: string; name_Th: string }[];
  plan_Payment_Modes: { name_En: string; name_Th: string; premium_Interest_Factor: number }[];
  plan_Payment_Method_Code: { payment_Collection_Code: string; payment_Collection_Name_En: string; payment_Method_Name_En: string; payment_Method_Name_Th: string }[];
  policy_Grace_Period: number | null;
  premium_Cal_Method_Code: string;
  age_Cal_Method_Code: string;
  csV_Cal_Method_Code: string | null;
  premium_Max_Discount: number;
  premium_Rate_Per_Unit: number;
  interest_Rate: number;
  loan_Interest_Rate: number;
  apL_Interest_Rate: number;
  oiC_Approval_No: string;
  oiC_Approval_Date: string;
  oiC_Expired_Date: string;
  status_Name_En: string;
}

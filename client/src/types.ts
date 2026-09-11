export type ChannelType = "F2F" | "ONLINE";
export type ChannelGroup = "F2F" | "ONLINE" | "UNMAPPED";

export interface KeyFeature {
  id: string;
  icon: string;
  topic: string;
  value: string;
  highlight: boolean;
}

export interface KeyAdvantageCard {
  id: string;
  title: string;
  subtitle: string;
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

export interface Campaign {
  id: string;
  type: "Coupon" | "Cashback" | "Discount" | "Gift";
  name: string;
  startDate: string;
  endDate: string;
  discountLabel: string;
}

export interface AuditEntry {
  message: string;
  created_at: string;
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

  document: { filename: string | null; uploadedAt: string | null; legalText: string | null };
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
}

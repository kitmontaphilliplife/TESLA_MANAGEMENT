import type {
  ApprovalDetail,
  ApprovalQueueItem,
  Campaign,
  CampaignListItem,
  CampaignSettings,
  CampaignSummary,
  ChannelType,
  DocumentType,
  KeyFeatureMaster,
  KeyFeatureSection,
  MasterCode,
  MasterCodeCategory,
  PackageChannelCampaigns,
  PackageComment,
  PackageDetail,
  PackageSummary,
  ProductListItem,
  RawProductPayload,
  RecommendedPackage,
} from "./types";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request_failed_${res.status}`);
  }
  return res.json();
}

async function reqUpload<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(fields ?? {})) form.append(key, value);
  const res = await fetch(path, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `upload_failed_${res.status}`);
  }
  return res.json();
}

// --- service-tesla-admin (TeslaAdminApi) integration -------------------------
// The real backend wraps every payload in an ApiResponse<T> envelope and lives under
// PathBase /tesla-admin (proxied to :5277 in vite.config.ts). Endpoints migrated off the
// prototype Express server go through reqTesla, which unwraps data.result and surfaces the
// envelope's message on failure. Prototype-shaped endpoints below still use req()/`/api`.
const TESLA_BASE = "/tesla-admin/api/v1";

interface ApiEnvelope<T> {
  statusCode: string;
  messageType: string; // "S" = success; "E"/"W" otherwise
  message: string;
  data: { result: T } | null;
}

async function reqTesla<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${TESLA_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || body.messageType === "E" || !body.data) {
    throw new Error(body?.message ?? `request_failed_${res.status}`);
  }
  return body.data.result;
}

// TeslaAdminApi status_code (DRAFT/PENDING/APPROVED/PUBLISHED/INACTIVE) → the prototype's
// 4-state model. NOTE: the prototype has no dedicated "approved" state, so APPROVED is
// folded into "active" for now — revisit if the FE grows a fifth status.
function mapTeslaStatus(statusCode: string | null | undefined): PackageSummary["status"] {
  switch ((statusCode ?? "").trim().toUpperCase()) {
    case "DRAFT":
      return "draft";
    case "PENDING":
      return "pending_approval";
    case "APPROVED":
    case "PUBLISHED":
      return "active";
    case "INACTIVE":
      return "inactive";
    default:
      return "draft";
  }
}

// 1 package = 1 channel in TeslaAdminApi. Classify its CHN code into the prototype's
// F2F / ONLINE grouping (online channels render the TESLA-C template).
const ONLINE_CHANNEL_CODES = new Set(["CHN04", "CHN07", "CHN08"]);
function classifyTeslaChannel(code: string | null | undefined, nameTh: string | null | undefined): "F2F" | "ONLINE" {
  if (ONLINE_CHANNEL_CODES.has((code ?? "").trim().toUpperCase())) return "ONLINE";
  if (/ออนไลน์|online/i.test(nameTh ?? "")) return "ONLINE";
  return "F2F";
}

interface TeslaListItem {
  versionId: number;
  packageCode: string;
  packageNameTh: string | null;
  packageNameEn: string | null;
  subProductTypeCode: string | null;
  subProductTypeNameTh: string | null;
  channelCode: string | null;
  channelNameTh: string | null;
  statusCode: string | null;
  updatedBy: string | null;
  updatedDate: string | null;
  createdBy: string | null;
  createdDate: string | null;
}
interface TeslaListPaged {
  items: TeslaListItem[];
  totalCount: number;
}

function mapTeslaListItem(it: TeslaListItem): PackageSummary {
  const updated = it.updatedDate ?? it.createdDate ?? "";
  return {
    planCode: it.packageCode,
    nameTh: it.packageNameTh ?? "",
    nameEn: it.packageNameEn ?? "",
    category: it.subProductTypeNameTh ?? it.subProductTypeCode ?? "",
    channelGroups: [classifyTeslaChannel(it.channelCode, it.channelNameTh)],
    status: mapTeslaStatus(it.statusCode),
    updatedAt: updated ? updated.slice(0, 10) : "",
    updatedBy: it.updatedBy ?? it.createdBy ?? "",
  };
}

// --- Admin detail (Edit / View) — ContentAdminDetail_Results → PackageDetail ---------
// TeslaAdminApi keys detail by versionId; the FE opens by packageCode, so getPackage first
// resolves packageCode → versionId via the list, then fetches /marketing-content/{versionId}.
// Model note: TeslaAdminApi is 1 package = 1 channel, so the FE's PackageDetail (which can hold
// F2F + ONLINE together) gets exactly ONE channelContent — the package's own channel.
interface TeslaTag { id: number; code: string; nameTh: string | null; }
interface TeslaThumb { isMain: boolean; url: string | null; caption1Th: string | null; caption2Th: string | null; caption3Th: string | null; }
interface TeslaBanner { langCode: string | null; desktopUrl: string | null; mobileUrl: string | null; titleTh: string | null; subtitleTh: string | null; }
interface TeslaKeyFeatureItem { id: number | null; topicNameTh: string | null; valueTh: string | null; iconUrl: string | null; }
interface TeslaKeyAdvantageItem { id: number | null; titleTh: string | null; descriptionTh: string | null; imageUrl: string | null; }
interface TeslaTcDoc { id: number | null; filename: string | null; url: string | null; sizeBytes: number | null; }
interface TeslaRecommendItem { recommendPackageCode: string; packageNameTh: string | null; }
interface TeslaRiderItem { riderPackageCode: string; }
interface TeslaApprovalHistItem { action: string; fromStatus: string | null; toStatus: string; actorUsername: string; actionDate: string; reason: string | null; }

interface TeslaAdminDetail {
  versionId: number;
  contentId: number;
  packageCode: string;
  packageNameTh: string | null;
  packageNameEn: string | null;
  channelCode: string | null;
  channelNameTh: string | null;
  statusCode: string;
  effectiveDate: string | null;
  endDate: string | null;
  titleTh: string | null;
  subtitleTh: string | null;
  productIconUrl: string | null;
  productTypeCode: string | null;
  productTypeNameTh: string | null;
  takafulFlagCode: string | null;
  legalTextTh: string | null;
  keyAdvantageHeaderTh: string | null;
  thumbnails: TeslaThumb[] | null;
  banners: TeslaBanner[] | null;
  insuranceTypes: TeslaTag[] | null;
  coverageTypes: TeslaTag[] | null;
  featureTags: TeslaTag[] | null;
  keyFeatures: TeslaKeyFeatureItem[] | null;
  keyAdvantages: TeslaKeyAdvantageItem[] | null;
  tcDocuments: TeslaTcDoc[] | null;
  packageRecommends: TeslaRecommendItem[] | null;
  riders: TeslaRiderItem[] | null;
  approvalHistory: TeslaApprovalHistItem[] | null;
  createdBy: string | null;
  createdDate: string | null;
  updatedBy: string | null;
  updatedDate: string | null;
}

async function resolveVersionId(planCode: string): Promise<number> {
  const r = await reqTesla<TeslaListPaged>(
    `/marketing-content/list?packageCode=${encodeURIComponent(planCode)}&page=1&pageSize=1000`
  );
  const match = r.items.find((i) => i.packageCode === planCode) ?? r.items[0];
  if (!match) throw new Error(`request_failed_404`);
  return match.versionId;
}

function mapAdminDetail(d: TeslaAdminDetail): PackageDetail {
  const group = classifyTeslaChannel(d.channelCode, d.channelNameTh);
  const isOnline = group === "ONLINE";
  const th = (d.thumbnails ?? []).find((t) => t.isMain) ?? (d.thumbnails ?? [])[0];
  const bn = (d.banners ?? []).find((b) => (b.langCode ?? "TH").toUpperCase() === "TH") ?? (d.banners ?? [])[0];
  const kaCards = (d.keyAdvantages ?? []).map((a, i) => ({
    id: String(a.id ?? `ka-${i}`),
    image: a.imageUrl ?? null,
    title: a.titleTh ?? "",
    subtitle: a.descriptionTh ?? "",
  }));

  return {
    packageId: String(d.versionId),
    status: mapTeslaStatus(d.statusCode),
    updatedAt: (d.updatedDate ?? d.createdDate ?? "").slice(0, 10),
    updatedBy: d.updatedBy ?? d.createdBy ?? "",
    product: {
      planCode: d.packageCode,
      nameTh: d.packageNameTh ?? "",
      nameEn: d.packageNameEn ?? "",
      category: d.productTypeNameTh ?? d.productTypeCode ?? "",
      insuranceTypeCode: "",
      insuranceTypeNameEn: "",
      hasSubPlan: false,
      startDate: d.effectiveDate,
      endDate: d.endDate,
      additionalRiders: (d.riders ?? []).map((r) => r.riderPackageCode),
      flags: {
        contractualPayouts: false,
        maturity: false,
        deathBenefit: false,
        cashSurrender: false,
        extendedTerm: false,
        reducedPaidup: false,
      },
      channels: [{ code: d.channelCode ?? "", nameEn: d.channelCode ?? "", nameTh: d.channelNameTh ?? "", group }],
    },
    channelContents: [
      {
        channelContentId: String(d.contentId),
        channelType: group,
        thumbnail: {
          image: th?.url ?? null,
          captions: [th?.caption1Th ?? "", th?.caption2Th ?? "", th?.caption3Th ?? ""],
        },
        banner: {
          desktopImage: bn?.desktopUrl ?? null,
          mobileImage: bn?.mobileUrl ?? null,
          title: bn?.titleTh ?? d.titleTh ?? "",
          subtitle: bn?.subtitleTh ?? d.subtitleTh ?? "",
        },
        keyFeatures: (d.keyFeatures ?? []).map((f, i) => ({
          id: String(f.id ?? `kf-${i}`),
          icon: "shield",
          iconImage: f.iconUrl ?? null,
          topic: f.topicNameTh ?? "",
          value: f.valueTh ?? "",
          highlight: false,
        })),
        iconAsset: isOnline ? d.productIconUrl ?? null : null,
        contractualPayout: null,
        keyAdvantages: isOnline ? { enabled: kaCards.length > 0, header: d.keyAdvantageHeaderTh ?? "", cards: kaCards } : null,
        recommends: isOnline
          ? (d.packageRecommends ?? []).map((r) => ({ code: r.recommendPackageCode, nameTh: r.packageNameTh ?? "", nameEn: "", category: "" }))
          : null,
        productType: isOnline ? null : /takaful|tkf/i.test(d.takafulFlagCode ?? "") ? "Takaful" : "Normal",
        productInformation: isOnline
          ? null
          : {
              insuranceTypes: (d.insuranceTypes ?? []).map((t) => ({ id: String(t.id), label: t.nameTh ?? t.code })),
              additionalCoverages: (d.coverageTypes ?? []).map((t) => ({ id: String(t.id), label: t.nameTh ?? t.code })),
              highlights: (d.featureTags ?? []).map((t) => ({ id: String(t.id), label: t.nameTh ?? t.code })),
            },
        document: { legalText: d.legalTextTh ?? null },
        documents: (d.tcDocuments ?? []).map((doc, i) => ({
          id: String(doc.id ?? `doc-${i}`),
          filename: doc.filename ?? "",
          originalName: doc.filename ?? "",
          fileSize: doc.sizeBytes ?? 0,
          documentType: "Terms & Conditions" as const,
          uploadedAt: "",
        })),
        campaign: null,
      },
    ],
    unmappedChannels: [],
    auditLog: (d.approvalHistory ?? []).map((h) => ({
      message: `${h.action}: ${h.fromStatus ?? "-"} → ${h.toStatus}${h.reason ? ` (${h.reason})` : ""} — ${h.actorUsername}`,
      created_at: h.actionDate,
    })),
  };
}

// --- Add Package modal cascade — PackageSelection_Results → ProductListItem -----------
// master/packages returns every GIO-synced package with its channel / product type /
// sub product type classification + alreadyHasContent, so the modal drives its cascading
// dropdowns client-side exactly as it did against the prototype's listProducts().
interface TeslaPackageSelection {
  packageCode: string;
  packageNameTh: string | null;
  packageNameEn: string | null;
  saleStartDate: string | null;
  channelCode: string | null;
  channelNameTh: string | null;
  channelNameEn: string | null;
  productTypeCode: string | null;
  productTypeNameTh: string | null;
  productTypeNameEn: string | null;
  subProductTypeCode: string | null;
  subProductTypeNameTh: string | null;
  subProductTypeNameEn: string | null;
  alreadyHasContent: boolean;
}

function mapPackageSelection(p: TeslaPackageSelection): ProductListItem {
  const group = classifyTeslaChannel(p.channelCode, p.channelNameTh);
  return {
    planCode: p.packageCode,
    nameTh: p.packageNameTh ?? "",
    nameEn: p.packageNameEn ?? "",
    category: p.subProductTypeNameTh ?? p.subProductTypeCode ?? "",
    productTypeCode: p.productTypeCode ?? "",
    subProductTypeCode: p.subProductTypeCode ?? "",
    productTypeNameEn: p.productTypeNameEn ?? p.productTypeNameTh ?? p.productTypeCode ?? "",
    subProductTypeNameEn: p.subProductTypeNameEn ?? p.subProductTypeNameTh ?? p.subProductTypeCode ?? "",
    startDate: p.saleStartDate ? p.saleStartDate.slice(0, 10) : null,
    channels: [{ code: p.channelCode ?? "", nameEn: p.channelNameEn ?? p.channelNameTh ?? p.channelCode ?? "", group }],
    channelGroups: [group],
    hasPackage: p.alreadyHasContent,
    hasRawPayload: false,
  };
}

export const api = {
  // Fetch all rows in one page — the FE computes KPI counts and paginates client-side.
  listPackages: () =>
    reqTesla<TeslaListPaged>("/marketing-content/list?page=1&pageSize=1000").then((r) => r.items.map(mapTeslaListItem)),
  getPackage: async (planCode: string): Promise<PackageDetail> => {
    const versionId = await resolveVersionId(planCode);
    const detail = await reqTesla<TeslaAdminDetail>(`/marketing-content/${versionId}`);
    return mapAdminDetail(detail);
  },
  // Add Package modal → create a DRAFT content for this package + channel. Returns the new
  // versionId (the FE only awaits success, then reopens the package for editing).
  createPackage: (planCode: string, channelCode: string) =>
    reqTesla<{ versionId: number }>(`/marketing-content/create`, {
      method: "POST",
      body: JSON.stringify({ packageCode: planCode, channelCode }),
    }),
  // Delete a package's DRAFT/PENDING content and free the package (Package List row Delete).
  deletePackage: async (planCode: string) => {
    const versionId = await resolveVersionId(planCode);
    return reqTesla<{ deleted: boolean }>(`/marketing-content/${versionId}`, { method: "DELETE" });
  },
  // Add Package cascade source — packages filtered SERVER-SIDE by the first three dropdowns
  // (channel + GIO product type + GIO sub product type). All args optional.
  listProducts: (channelCode?: string, productTypeCode?: string, subProductTypeCode?: string, includeAllStatuses?: boolean) => {
    const qs = new URLSearchParams();
    if (channelCode) qs.set("channelCode", channelCode);
    if (productTypeCode) qs.set("productTypeCode", productTypeCode);
    if (subProductTypeCode) qs.set("subProductTypeCode", subProductTypeCode);
    if (includeAllStatuses) qs.set("includeAllStatuses", "true");
    const q = qs.toString();
    return reqTesla<TeslaPackageSelection[]>(`/marketing-content/master/packages${q ? `?${q}` : ""}`).then((rows) =>
      rows.map(mapPackageSelection)
    );
  },
  // Distribution Channel dropdown (Add Package) — full channel master (CHN01..CHN10).
  listChannels: () =>
    reqTesla<{ code: string; nameTh: string | null; nameEn: string | null }[]>(`/marketing-content/master/channels`).then((rows) =>
      rows.map((c) => ({ code: c.code, nameEn: c.nameEn ?? c.nameTh ?? c.code }))
    ),
  // Product Type dropdown (Add Package) — GIO product types from master (synced from GIO).
  listGioProductTypes: () =>
    reqTesla<{ code: string; nameTh: string | null; nameEn: string | null }[]>(`/marketing-content/master/product-types`).then((rows) =>
      rows.map((t) => ({ code: t.code, nameEn: t.nameEn ?? t.nameTh ?? t.code }))
    ),
  // Sub Product Type dropdown (Add Package) — GIO sub types, filtered by parent product type.
  listSubProductTypes: (productTypeCode: string) =>
    reqTesla<{ code: string; productTypeCode: string; nameTh: string | null; nameEn: string | null }[]>(
      `/marketing-content/master/sub-product-types?productTypeCode=${encodeURIComponent(productTypeCode)}`
    ).then((rows) => rows.map((t) => ({ code: t.code, nameEn: t.nameEn ?? t.nameTh ?? t.code }))),
  createProductFromPayload: (payload: unknown) =>
    req<{ planCode: string }>("/api/products", { method: "POST", body: JSON.stringify({ payload }) }),
  updateProductPayload: (planCode: string, payload: unknown) =>
    req<{ planCode: string }>(`/api/products/${planCode}`, { method: "PUT", body: JSON.stringify({ payload }) }),
  deleteProduct: (planCode: string) => req<{ ok: true }>(`/api/products/${planCode}`, { method: "DELETE" }),

  updateContent: (
    planCode: string,
    channel: ChannelType,
    patch: { thumbnail?: { captions?: [string, string, string] }; banner?: { title?: string; subtitle?: string } }
  ) => req<PackageDetail>(`/api/packages/${planCode}/${channel}/content`, { method: "PATCH", body: JSON.stringify(patch) }),

  addKeyFeature: (planCode: string, channel: ChannelType) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/key-features`, {
      method: "POST",
      body: JSON.stringify({ topic: "หัวข้อใหม่", value: "ระบุค่า", icon: "shield", highlight: false }),
    }),
  updateKeyFeature: (
    planCode: string,
    channel: ChannelType,
    id: string,
    patch: Partial<{ topic: string; value: string; highlight: boolean; iconImage: string | null }>
  ) => req<PackageDetail>(`/api/packages/${planCode}/${channel}/key-features/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeKeyFeature: (planCode: string, channel: ChannelType, id: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/key-features/${id}`, { method: "DELETE" }),

  toggleKeyAdvantages: (planCode: string, enabled: boolean) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  updateKeyAdvantagesHeader: (planCode: string, header: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages`, { method: "PATCH", body: JSON.stringify({ header }) }),
  updateKeyAdvantageCard: (planCode: string, id: string, patch: Partial<{ title: string; subtitle: string; image: string | null }>) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  uploadKeyAdvantageImage: (planCode: string, id: string, file: File) =>
    reqUpload<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages/${id}/image`, file),
  removeKeyAdvantageImage: (planCode: string, id: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages/${id}/image`, { method: "DELETE" }),

  setContractualPayout: (planCode: string, patch: Partial<{ value: string; active: boolean }>) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/contractual-payout`, { method: "PATCH", body: JSON.stringify(patch) }),

  searchProducts: (planCode: string, q: string, group?: string) =>
    req<RecommendedPackage[]>(
      `/api/packages/search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(planCode)}${group ? `&group=${encodeURIComponent(group)}` : ""}`
    ),
  setRecommends: (planCode: string, codes: string[]) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/recommends`, { method: "PUT", body: JSON.stringify({ codes }) }),

  setProductType: (planCode: string, productType: "Normal" | "Takaful") =>
    req<PackageDetail>(`/api/packages/${planCode}/F2F/product-type`, { method: "PATCH", body: JSON.stringify({ productType }) }),
  addProductInfoItem: (planCode: string, groupType: "insurance_type" | "additional_coverage" | "highlight", label = "ระบุรายการ") =>
    req<PackageDetail>(`/api/packages/${planCode}/F2F/product-info-items`, { method: "POST", body: JSON.stringify({ groupType, label }) }),
  updateProductInfoItem: (planCode: string, id: string, label: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/F2F/product-info-items/${id}`, { method: "PATCH", body: JSON.stringify({ label }) }),
  removeProductInfoItem: (planCode: string, id: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/F2F/product-info-items/${id}`, { method: "DELETE" }),

  uploadDocument: (planCode: string, channel: ChannelType, file: File, documentType: DocumentType) =>
    reqUpload<PackageDetail>(`/api/packages/${planCode}/${channel}/documents`, file, { documentType }),
  updateDocumentType: (planCode: string, channel: ChannelType, id: string, documentType: DocumentType) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/documents/${id}`, { method: "PATCH", body: JSON.stringify({ documentType }) }),
  deleteDocument: (planCode: string, channel: ChannelType, id: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/documents/${id}`, { method: "DELETE" }),

  uploadThumbnailImage: (planCode: string, channel: ChannelType, file: File) =>
    reqUpload<PackageDetail>(`/api/packages/${planCode}/${channel}/thumbnail-image`, file),
  removeThumbnailImage: (planCode: string, channel: ChannelType) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/thumbnail-image`, { method: "DELETE" }),

  uploadIconAsset: (planCode: string, channel: ChannelType, file: File) =>
    reqUpload<PackageDetail>(`/api/packages/${planCode}/${channel}/icon-asset`, file),
  removeIconAsset: (planCode: string, channel: ChannelType) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/icon-asset`, { method: "DELETE" }),

  uploadBannerImage: (planCode: string, channel: ChannelType, slot: "desktop" | "mobile", file: File) =>
    reqUpload<PackageDetail>(`/api/packages/${planCode}/${channel}/banner-image/${slot}`, file),
  removeBannerImage: (planCode: string, channel: ChannelType, slot: "desktop" | "mobile") =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/banner-image/${slot}`, { method: "DELETE" }),

  setStatus: (planCode: string, status: PackageDetail["status"] | "pending_approval") =>
    req<PackageDetail>(`/api/packages/${planCode}/status`, { method: "POST", body: JSON.stringify({ status }) }),

  getProductRaw: (planCode: string) =>
    req<{ planCode: string; nameTh: string; nameEn: string; payload: RawProductPayload }>(`/api/products/${planCode}/raw`),

  listMasterCodes: (category: MasterCodeCategory) => req<MasterCode[]>(`/api/master-codes/${category}`),
  createMasterCode: (
    category: MasterCodeCategory,
    data: { codeId: string; nameEn: string; nameTh: string; channelGroup?: string }
  ) => req<MasterCode>(`/api/master-codes/${category}`, { method: "POST", body: JSON.stringify(data) }),
  updateMasterCode: (
    category: MasterCodeCategory,
    id: string,
    data: Partial<{ nameEn: string; nameTh: string; channelGroup: string }>
  ) => req<MasterCode>(`/api/master-codes/${category}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMasterCode: (category: MasterCodeCategory, id: string) =>
    req<{ ok: true }>(`/api/master-codes/${category}/${id}`, { method: "DELETE" }),

  listCampaigns: () => req<CampaignListItem[]>("/api/campaigns"),
  getCampaign: (id: string) => req<CampaignListItem>(`/api/campaigns/${id}`),
  getCampaignSummary: (from: string, to: string) =>
    req<CampaignSummary>(`/api/campaigns/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  getCampaignSettings: () => req<CampaignSettings>("/api/campaigns/settings"),
  updateCampaignSettings: (patch: Partial<CampaignSettings>) =>
    req<CampaignSettings>("/api/campaigns/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  listCampaignsForPackage: (planCode: string) => req<PackageChannelCampaigns[]>(`/api/campaigns/package/${planCode}`),
  createCampaign: (data: {
    type: Campaign["type"];
    name: string;
    startDate: string;
    endDate: string;
    discountLabel: string;
    channels: string[];
    budget: number;
  }) => req<CampaignListItem>("/api/campaigns", { method: "POST", body: JSON.stringify(data) }),
  updateCampaign: (
    id: string,
    patch: Partial<{
      type: Campaign["type"];
      name: string;
      startDate: string;
      endDate: string;
      discountLabel: string;
      channels: string[];
      budget: number;
      budgetUsed: number;
      redemptions: number;
    }>
  ) => req<CampaignListItem>(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCampaign: (id: string) => req<{ ok: true }>(`/api/campaigns/${id}`, { method: "DELETE" }),
  attachCampaign: (id: string, target: { planCode: string; channelType: ChannelType }) =>
    req<CampaignListItem>(`/api/campaigns/${id}/attachments`, { method: "POST", body: JSON.stringify(target) }),
  detachCampaign: (id: string, target: { planCode: string; channelType: ChannelType }) =>
    req<CampaignListItem>(`/api/campaigns/${id}/attachments`, { method: "DELETE", body: JSON.stringify(target) }),

  listApprovals: () => req<ApprovalQueueItem[]>("/api/approvals"),
  getApproval: (planCode: string) => req<ApprovalDetail>(`/api/approvals/${planCode}`),
  postApprovalDecision: (planCode: string, decision: "approve" | "changes") =>
    req<{ ok: true }>(`/api/approvals/${planCode}/decision`, { method: "POST", body: JSON.stringify({ decision }) }),
  addApprovalComment: (planCode: string, data: { sectionId: string; sectionLabel: string; body: string }) =>
    req<PackageComment>(`/api/approvals/${planCode}/comments`, { method: "POST", body: JSON.stringify(data) }),
  toggleCommentResolved: (planCode: string, id: string, resolved: boolean) =>
    req<{ ok: true }>(`/api/approvals/${planCode}/comments/${id}`, { method: "PATCH", body: JSON.stringify({ resolved }) }),

  // Key Feature master — GIO/Tesla key feature topics from the DB (M_MARKETING_KEY_FEATURE_TOPIC).
  listKeyFeatureMasters: () =>
    reqTesla<{ id: number; code: string; nameTh: string | null; nameEn: string | null; displayOrder: number }[]>(
      "/marketing-content/master/key-feature-topics"
    ).then((rows) =>
      rows.map(
        (t): KeyFeatureMaster => ({
          id: String(t.id),
          codeId: t.code,
          iconImage: null,
          feature: t.nameTh ?? t.nameEn ?? t.code,
          detailFeature: t.nameEn ?? "",
          section: "key_features",
          system: "ONLINE",
          updatedAt: "",
          updatedBy: "",
        })
      )
    ),
  createKeyFeatureMaster: (data: { feature: string; detailFeature: string; section: KeyFeatureSection; system: "F2F" | "ONLINE" }) =>
    req<KeyFeatureMaster>("/api/master-key-features", { method: "POST", body: JSON.stringify(data) }),
  updateKeyFeatureMaster: (
    id: string,
    patch: Partial<{ feature: string; detailFeature: string; section: KeyFeatureSection; system: "F2F" | "ONLINE" }>
  ) => req<KeyFeatureMaster>(`/api/master-key-features/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteKeyFeatureMaster: (id: string) => req<{ ok: true }>(`/api/master-key-features/${id}`, { method: "DELETE" }),
  uploadKeyFeatureIcon: (id: string, file: File) => reqUpload<KeyFeatureMaster>(`/api/master-key-features/${id}/icon`, file),
  removeKeyFeatureIcon: (id: string) => req<KeyFeatureMaster>(`/api/master-key-features/${id}/icon`, { method: "DELETE" }),
};

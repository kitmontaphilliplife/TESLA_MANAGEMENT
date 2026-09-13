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

export const api = {
  listPackages: () => req<PackageSummary[]>("/api/packages"),
  getPackage: (planCode: string) => req<PackageDetail>(`/api/packages/${planCode}`),
  createPackage: (planCode: string) => req<PackageDetail>(`/api/packages`, { method: "POST", body: JSON.stringify({ planCode }) }),
  deletePackage: (planCode: string) => req<{ ok: true }>(`/api/packages/${planCode}`, { method: "DELETE" }),
  listProducts: () => req<ProductListItem[]>("/api/products"),
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

  listKeyFeatureMasters: () => req<KeyFeatureMaster[]>("/api/master-key-features"),
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

import type { ChannelType, MasterCode, MasterCodeCategory, PackageDetail, PackageSummary, ProductListItem, RawProductPayload, RecommendedPackage } from "./types";

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

export const api = {
  listPackages: () => req<PackageSummary[]>("/api/packages"),
  getPackage: (planCode: string) => req<PackageDetail>(`/api/packages/${planCode}`),
  createPackage: (planCode: string) => req<PackageDetail>(`/api/packages`, { method: "POST", body: JSON.stringify({ planCode }) }),
  listProducts: () => req<ProductListItem[]>("/api/products"),

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
  updateKeyFeature: (planCode: string, channel: ChannelType, id: string, patch: Partial<{ topic: string; value: string; highlight: boolean }>) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/key-features/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeKeyFeature: (planCode: string, channel: ChannelType, id: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/${channel}/key-features/${id}`, { method: "DELETE" }),

  toggleKeyAdvantages: (planCode: string, enabled: boolean) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  updateKeyAdvantagesHeader: (planCode: string, header: string) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages`, { method: "PATCH", body: JSON.stringify({ header }) }),
  updateKeyAdvantageCard: (planCode: string, id: string, patch: Partial<{ title: string; subtitle: string }>) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/key-advantages/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  setContractualPayout: (planCode: string, patch: Partial<{ value: string; active: boolean }>) =>
    req<PackageDetail>(`/api/packages/${planCode}/ONLINE/contractual-payout`, { method: "PATCH", body: JSON.stringify(patch) }),

  searchProducts: (planCode: string, q: string) =>
    req<RecommendedPackage[]>(`/api/packages/search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(planCode)}`),
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

  uploadDocument: async (planCode: string, channel: ChannelType, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/packages/${planCode}/${channel}/document`, { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
    return (await res.json()) as PackageDetail;
  },

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
};

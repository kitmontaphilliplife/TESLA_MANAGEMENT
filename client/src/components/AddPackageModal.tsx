import { useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from "primereact/button";
import type { ProductListItem } from "../types";
import { api } from "../api";
import { IconClose, IconRefresh, IconSave, IconPackage, IconClock } from "../icons";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function AddPackageModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (planCode: string) => void;
}) {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [channels, setChannels] = useState<{ code: string; nameEn: string }[] | null>(null);
  // Product Type / Sub Product Type dropdowns are driven by GIO master data (synced from GIO),
  // not derived from the available packages — so the full GIO taxonomy is filterable.
  const [productTypes, setProductTypes] = useState<{ code: string; nameEn: string }[]>([]);
  const [subProductTypes, setSubProductTypes] = useState<{ code: string; nameEn: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // channelCode / productType / subProductType hold GIO CODES (not display names).
  const [channelCode, setChannelCode] = useState("");
  const [productType, setProductType] = useState("");
  const [subProductType, setSubProductType] = useState("");
  const [planCode, setPlanCode] = useState("");

  useEffect(() => {
    api.listChannels().then(setChannels).catch((e) => setError(String(e.message ?? e)));
    api.listGioProductTypes().then(setProductTypes).catch((e) => setError(String(e.message ?? e)));
  }, []);

  // Sub product types cascade from the selected product type (GIO master).
  useEffect(() => {
    if (!productType) {
      setSubProductTypes([]);
      return;
    }
    api.listSubProductTypes(productType).then(setSubProductTypes).catch((e) => setError(String(e.message ?? e)));
  }, [productType]);

  // Packages are fetched SERVER-SIDE filtered by all three dropdowns — only once all are chosen.
  useEffect(() => {
    if (!channelCode || !productType || !subProductType) {
      setProducts([]);
      return;
    }
    api.listProducts(channelCode, productType, subProductType).then(setProducts).catch((e) => setError(String(e.message ?? e)));
  }, [channelCode, productType, subProductType]);

  const available = useMemo(() => (products ?? []).filter((p) => !p.hasPackage), [products]);

  // The full Distribution Channel reference list from Master Setup — not just the
  // channels that happen to appear on products still available to add a package for.
  const channelOptions = useMemo(() => (channels ?? []).map((c) => ({ code: c.code, nameEn: c.nameEn })), [channels]);

  // Package dropdown narrows to the chosen channel + product type + sub product type (by CODE).
  const afterSubProductType = useMemo(
    () =>
      available.filter(
        (p) =>
          (!channelCode || p.channels.some((c) => c.code === channelCode)) &&
          (!productType || p.productTypeCode === productType) &&
          (!subProductType || p.subProductTypeCode === subProductType)
      ),
    [available, channelCode, productType, subProductType]
  );

  const allThreeSelected = Boolean(channelCode && productType && subProductType);
  const selectedProduct = afterSubProductType.find((p) => p.planCode === planCode) ?? null;
  const previewChannel = selectedProduct?.channels.find((c) => c.code === channelCode) ?? selectedProduct?.channels[0] ?? null;

  function handleReset() {
    setChannelCode("");
    setProductType("");
    setSubProductType("");
    setPlanCode("");
    setError(null);
  }

  async function handleSave() {
    if (!planCode) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPackage(planCode, channelCode);
      onCreated(planCode);
    } catch (e: any) {
      setError(String(e.message ?? e));
      setSaving(false);
    }
  }

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconPackage /> Add Package
        </span>
      }
      style={{ width: 600 }}
      footer={
        <>
          <Button label="Cancel" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />
          <Button label="Reset" icon={<IconRefresh />} outlined severity="secondary" onClick={handleReset} />
          <Button label={saving ? "กำลังบันทึก…" : "Save"} icon={<IconSave />} disabled={!planCode || saving} onClick={handleSave} />
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {channels === null && !error && <div className="search-empty">กำลังโหลด…</div>}
        {channels === null && error && <div className="readonly-note">{error}</div>}

        {channels !== null && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <FloatLabel>
                <Dropdown
                  inputId="addpkg-channel"
                  className="select"
                  style={{ width: "100%" }}
                  value={channelCode}
                  options={channelOptions.map((c) => ({ label: c.nameEn, value: c.code }))}
                  onChange={(e) => {
                    setChannelCode(e.value);
                    setProductType("");
                    setSubProductType("");
                    setPlanCode("");
                  }}
                />
                <label htmlFor="addpkg-channel">Distribution Channel *</label>
              </FloatLabel>
              <FloatLabel>
                <Dropdown
                  inputId="addpkg-producttype"
                  className="select"
                  style={{ width: "100%" }}
                  value={productType}
                  options={productTypes.map((t) => ({ label: t.nameEn, value: t.code }))}
                  onChange={(e) => {
                    setProductType(e.value);
                    setSubProductType("");
                    setPlanCode("");
                  }}
                  disabled={!channelCode}
                  placeholder={channelCode ? undefined : "เลือก Distribution Channel ก่อน"}
                />
                <label htmlFor="addpkg-producttype">Product Type *</label>
              </FloatLabel>
              <FloatLabel>
                <Dropdown
                  inputId="addpkg-subproducttype"
                  className="select"
                  style={{ width: "100%" }}
                  value={subProductType}
                  options={subProductTypes.map((t) => ({ label: t.nameEn, value: t.code }))}
                  onChange={(e) => {
                    setSubProductType(e.value);
                    setPlanCode("");
                  }}
                  disabled={!productType}
                  placeholder={productType ? undefined : "เลือก Product Type ก่อน"}
                />
                <label htmlFor="addpkg-subproducttype">Sub Product Type *</label>
              </FloatLabel>
            </div>

            <div className="field" style={{ border: "1px solid var(--gray-200)", borderRadius: 12, padding: 16 }}>
              <FloatLabel>
                <Dropdown
                  inputId="addpkg-package"
                  className="select"
                  style={{ width: "100%" }}
                  value={planCode}
                  options={allThreeSelected ? afterSubProductType.map((p) => ({ label: `${p.nameEn} (${p.planCode})`, value: p.planCode })) : []}
                  onChange={(e) => setPlanCode(e.value)}
                  disabled={!allThreeSelected || afterSubProductType.length === 0}
                  placeholder={
                    !allThreeSelected
                      ? "เลือก Distribution Channel, Product Type, Sub Product Type ก่อน"
                      : afterSubProductType.length === 0
                      ? "ไม่พบ Package ที่ตรงเงื่อนไข"
                      : undefined
                  }
                />
                <label htmlFor="addpkg-package">Package *</label>
              </FloatLabel>

              {selectedProduct && (
                <div className="package-preview">
                  {channelCode && (
                    <span className="package-preview-badge">
                      {channelOptions.find((c) => c.code === channelCode)?.nameEn ?? previewChannel?.nameEn ?? channelCode}
                    </span>
                  )}
                  <span className="chip package-preview-code">Package code : {selectedProduct.planCode}</span>
                  <div className="package-preview-title">{selectedProduct.nameEn}</div>
                  <div className="upload-sub">{selectedProduct.nameTh}</div>
                  <div className="upload-sub" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <IconClock /> Sale start date : {formatDate(selectedProduct.startDate)}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="readonly-note">{error}</div>}
          </>
        )}
      </div>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { MasterCode, ProductListItem } from "../types";
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
  const [channels, setChannels] = useState<MasterCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [channelCode, setChannelCode] = useState("");
  const [productType, setProductType] = useState("");
  const [subProductType, setSubProductType] = useState("");
  const [planCode, setPlanCode] = useState("");

  useEffect(() => {
    api.listProducts().then(setProducts).catch((e) => setError(String(e.message ?? e)));
    api.listMasterCodes("distribution_channel").then(setChannels).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const available = useMemo(() => (products ?? []).filter((p) => !p.hasPackage), [products]);

  // The full Distribution Channel reference list from Master Setup — not just the
  // channels that happen to appear on products still available to add a package for.
  const channelOptions = useMemo(() => (channels ?? []).map((c) => ({ code: c.codeId, nameEn: c.nameEn })), [channels]);

  const afterChannel = useMemo(
    () => (channelCode ? available.filter((p) => p.channels.some((c) => c.code === channelCode)) : available),
    [available, channelCode]
  );

  const productTypeOptions = useMemo(
    () => Array.from(new Set(afterChannel.map((p) => p.productTypeNameEn))),
    [afterChannel]
  );

  const afterProductType = useMemo(
    () => (productType ? afterChannel.filter((p) => p.productTypeNameEn === productType) : afterChannel),
    [afterChannel, productType]
  );

  const subProductTypeOptions = useMemo(
    () => Array.from(new Set(afterProductType.map((p) => p.subProductTypeNameEn))),
    [afterProductType]
  );

  const afterSubProductType = useMemo(
    () => (subProductType ? afterProductType.filter((p) => p.subProductTypeNameEn === subProductType) : afterProductType),
    [afterProductType, subProductType]
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
      await api.createPackage(planCode);
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
        {(products === null || channels === null) && !error && <div className="search-empty">กำลังโหลด…</div>}
        {(products === null || channels === null) && error && <div className="readonly-note">{error}</div>}

        {products !== null && channels !== null && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Dropdown
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
                placeholder="Distribution Channel *"
              />
              <Dropdown
                className="select"
                style={{ width: "100%" }}
                value={productType}
                options={productTypeOptions.map((t) => ({ label: t, value: t }))}
                onChange={(e) => {
                  setProductType(e.value);
                  setSubProductType("");
                  setPlanCode("");
                }}
                disabled={!channelCode}
                placeholder={channelCode ? "Product Type *" : "เลือก Distribution Channel ก่อน"}
              />
              <Dropdown
                className="select"
                style={{ width: "100%" }}
                value={subProductType}
                options={subProductTypeOptions.map((t) => ({ label: t, value: t }))}
                onChange={(e) => {
                  setSubProductType(e.value);
                  setPlanCode("");
                }}
                disabled={!productType}
                placeholder={productType ? "Sub Product Type *" : "เลือก Product Type ก่อน"}
              />
            </div>

            <div className="field" style={{ border: "1px solid var(--gray-200)", borderRadius: 12, padding: 16 }}>
              <label className="label" style={{ color: "var(--navy)", fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                Package
              </label>
              <Dropdown
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
                    : "Package *"
                }
              />

              {selectedProduct && (
                <div className="package-preview">
                  {previewChannel && <span className="package-preview-badge">{previewChannel.nameEn}</span>}
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

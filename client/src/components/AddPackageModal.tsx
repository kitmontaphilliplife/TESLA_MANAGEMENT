import { useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import type { ProductListItem } from "../types";
import { api } from "../api";
import { IconClose, IconRefresh, IconSave, IconPackage } from "../icons";

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [channelCode, setChannelCode] = useState("");
  const [productType, setProductType] = useState("");
  const [subProductType, setSubProductType] = useState("");
  const [planCode, setPlanCode] = useState("");

  useEffect(() => {
    api.listProducts().then(setProducts).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const available = useMemo(() => (products ?? []).filter((p) => !p.hasPackage), [products]);

  // Distinct channels across all products still available to add.
  const channelOptions = useMemo(() => {
    const map = new Map<string, string>();
    available.forEach((p) => p.channels.forEach((c) => map.set(c.code, c.nameEn)));
    return Array.from(map.entries()).map(([code, nameEn]) => ({ code, nameEn }));
  }, [available]);

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
        {products === null && <div className="search-empty">กำลังโหลด…</div>}

        {products !== null && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field-row">
                <label className="label">Distribution Channel *</label>
                <Dropdown
                  className="select"
                  value={channelCode}
                  options={channelOptions.map((c) => ({ label: c.nameEn, value: c.code }))}
                  onChange={(e) => {
                    setChannelCode(e.value);
                    setProductType("");
                    setSubProductType("");
                    setPlanCode("");
                  }}
                  placeholder="เลือก Distribution Channel"
                  showClear
                />
              </div>
              <div className="field-row">
                <label className="label">Product Type *</label>
                <Dropdown
                  className="select"
                  value={productType}
                  options={productTypeOptions.map((t) => ({ label: t, value: t }))}
                  onChange={(e) => {
                    setProductType(e.value);
                    setSubProductType("");
                    setPlanCode("");
                  }}
                  placeholder="เลือก Product Type"
                  showClear
                />
              </div>
              <div className="field-row">
                <label className="label">Sub Product Type *</label>
                <Dropdown
                  className="select"
                  value={subProductType}
                  options={subProductTypeOptions.map((t) => ({ label: t, value: t }))}
                  onChange={(e) => {
                    setSubProductType(e.value);
                    setPlanCode("");
                  }}
                  placeholder="เลือก Sub Product Type"
                  showClear
                />
              </div>
            </div>

            <div className="field" style={{ border: "1px solid var(--gray-200)", borderRadius: 12, padding: 16 }}>
              <label className="label" style={{ color: "var(--navy)", fontSize: 13, marginBottom: 6 }}>
                Package
              </label>
              <Dropdown
                className="select"
                value={planCode}
                options={afterSubProductType.map((p) => ({ label: `${p.nameEn} (${p.planCode})`, value: p.planCode }))}
                onChange={(e) => setPlanCode(e.value)}
                disabled={afterSubProductType.length === 0}
                placeholder={afterSubProductType.length === 0 ? "ไม่พบ Package ที่ตรงเงื่อนไข" : "เลือก Package"}
              />

              {selectedProduct && (
                <div className="package-preview">
                  {previewChannel && <Tag value={previewChannel.nameEn} className="package-preview-badge" />}
                  <Tag value={`Package code : ${selectedProduct.planCode}`} severity="secondary" style={{ width: "fit-content" }} />
                  <div className="package-preview-title">{selectedProduct.nameEn}</div>
                  <div className="upload-sub">{selectedProduct.nameTh}</div>
                  <div className="upload-sub">Sale start date : {formatDate(selectedProduct.startDate)}</div>
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

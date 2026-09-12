import { useEffect, useMemo, useState } from "react";
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title"><IconPackage /> Add Package</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="ปิด">
            <IconClose />
          </button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {products === null && <div className="search-empty">กำลังโหลด…</div>}

          {products !== null && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field-row">
                  <label className="label">Distribution Channel *</label>
                  <select
                    className="select"
                    value={channelCode}
                    onChange={(e) => {
                      setChannelCode(e.target.value);
                      setProductType("");
                      setSubProductType("");
                      setPlanCode("");
                    }}
                  >
                    <option value="">เลือก Distribution Channel</option>
                    {channelOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-row">
                  <label className="label">Product Type *</label>
                  <select
                    className="select"
                    value={productType}
                    onChange={(e) => {
                      setProductType(e.target.value);
                      setSubProductType("");
                      setPlanCode("");
                    }}
                  >
                    <option value="">เลือก Product Type</option>
                    {productTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-row">
                  <label className="label">Sub Product Type *</label>
                  <select
                    className="select"
                    value={subProductType}
                    onChange={(e) => {
                      setSubProductType(e.target.value);
                      setPlanCode("");
                    }}
                  >
                    <option value="">เลือก Sub Product Type</option>
                    {subProductTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field" style={{ border: "1px solid var(--gray-200)", borderRadius: 12, padding: 16 }}>
                <label className="label" style={{ color: "var(--navy)", fontSize: 13, marginBottom: 6 }}>
                  Package
                </label>
                <select
                  className="select"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  disabled={afterSubProductType.length === 0}
                >
                  <option value="">
                    {afterSubProductType.length === 0 ? "ไม่พบ Package ที่ตรงเงื่อนไข" : "เลือก Package"}
                  </option>
                  {afterSubProductType.map((p) => (
                    <option key={p.planCode} value={p.planCode}>
                      {p.nameEn} ({p.planCode})
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <div className="package-preview">
                    {previewChannel && <span className="badge badge-blue package-preview-badge">{previewChannel.nameEn}</span>}
                    <span className="badge badge-gray" style={{ width: "fit-content" }}>
                      Package code : {selectedProduct.planCode}
                    </span>
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
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            <IconClose /> Cancel
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            <IconRefresh /> Reset
          </button>
          <button className="btn btn-primary" disabled={!planCode || saving} onClick={handleSave}>
            <IconSave /> {saving ? "กำลังบันทึก…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

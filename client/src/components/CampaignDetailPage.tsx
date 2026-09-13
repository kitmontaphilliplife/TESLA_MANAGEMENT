import { useEffect, useMemo, useState } from "react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import type { Campaign, CampaignAttachment, CampaignChannel, CampaignListItem, ChannelType, PackageDetail, PackageSummary } from "../types";
import { CAMPAIGN_CHANNELS, CAMPAIGN_TYPES, CAMPAIGN_TYPE_LABEL } from "../types";
import { api } from "../api";
import { campaignStatus, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_SEVERITY } from "../campaignStatus";
import { CampaignCardPreview } from "./CampaignCardPreview";
import { IconArrowLeft, IconClose, IconPlus, IconSave, IconSearch, IconTrash } from "../icons";

interface FormState {
  type: Campaign["type"];
  name: string;
  startDate: string;
  endDate: string;
  discountLabel: string;
  channels: CampaignChannel[];
  budget: number;
  budgetUsed: number;
  redemptions: number;
}

function blankForm(): FormState {
  return { type: "Discount", name: "", startDate: "", endDate: "", discountLabel: "", channels: [], budget: 0, budgetUsed: 0, redemptions: 0 };
}

export function CampaignDetailPage({
  campaignId,
  onBack,
  onCreated,
}: {
  campaignId: string | null;
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const isNew = campaignId === null;
  const [campaign, setCampaign] = useState<CampaignListItem | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [previewPkg, setPreviewPkg] = useState<PackageDetail | null>(null);

  function reload() {
    if (!campaignId) {
      setCampaign(null);
      setForm(blankForm());
      return;
    }
    api.getCampaign(campaignId).then((c) => {
      setCampaign(c);
      setForm({
        type: c.type,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        discountLabel: c.discountLabel,
        channels: c.channels,
        budget: c.budget,
        budgetUsed: c.budgetUsed,
        redemptions: c.redemptions,
      });
    });
  }
  useEffect(reload, [campaignId]);

  const firstAttachment = campaign?.attachments[0] ?? null;
  useEffect(() => {
    if (firstAttachment) api.getPackage(firstAttachment.planCode).then(setPreviewPkg).catch(() => setPreviewPkg(null));
    else setPreviewPkg(null);
  }, [firstAttachment?.planCode]);

  function toggleChannel(ch: CampaignChannel) {
    setForm((f) => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch] }));
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
      setError("กรอก Campaign name, Start date, End date ให้ครบ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await api.createCampaign({ ...form });
        onCreated(created.id);
      } else {
        const updated = await api.updateCampaign(campaignId!, { ...form });
        setCampaign(updated);
      }
    } catch (e: any) {
      const code = String(e.message ?? e);
      setError(
        code === "campaign_overlap"
          ? "ช่วงวันที่นี้ทับซ้อนกับ Campaign อื่นที่ผูกกับ Package/Channel เดียวกันอยู่"
          : code === "invalid_date_range"
          ? "Start date ต้องมาก่อน End date"
          : code
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!campaignId) return;
    if (!confirm(`ลบ Campaign นี้? Package ที่ผูกอยู่ (${campaign?.attachments.length ?? 0}) จะถูกถอดออกด้วย`)) return;
    try {
      await api.deleteCampaign(campaignId);
      onBack();
    } catch (e: any) {
      const code = String(e.message ?? e);
      setError(code === "campaign_already_started" ? "Campaign นี้เริ่มใช้งานแล้ว ลบไม่ได้" : code);
    }
  }

  async function handleDetach(a: CampaignAttachment) {
    if (!campaignId) return;
    if (!confirm(`ถอด Campaign นี้ออกจาก ${a.planCode} · ${a.channelType}?`)) return;
    await api.detachCampaign(campaignId, { planCode: a.planCode, channelType: a.channelType });
    reload();
  }

  if (!isNew && !campaign) return <div className="loading-screen">กำลังโหลดข้อมูล…</div>;

  return (
    <div className="list-page">
      <div className="list-page-head">
        <div className="page-title-row">
          <Button icon={<IconArrowLeft />} outlined severity="secondary" rounded onClick={onBack} title="กลับไป Campaign" />
          <div>
            <div className="title">{isNew ? "New campaign" : form.name || "Campaign"}</div>
            <div className="card-sub">Time-boxed offers ที่ผูกกับ Package ได้หลายรายการพร้อมกัน</div>
          </div>
        </div>
      </div>

      <div className="campaign-form-grid">
        <div className="card">
          <div className="card-head">
            <div className="card-head-left">
              <div className="card-title">{isNew ? "New campaign" : "Edit campaign"} · {form.name || "untitled"}</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <label className="label">Campaign name *</label>
              <InputText className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Songkran double bonus" />
            </div>
            <div className="field-grid-3">
              <div className="field">
                <label className="label">Type</label>
                <Dropdown
                  className="select"
                  style={{ width: "100%" }}
                  value={form.type}
                  options={CAMPAIGN_TYPES.map((t) => ({ label: CAMPAIGN_TYPE_LABEL[t], value: t }))}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.value }))}
                />
              </div>
              <div className="field">
                <label className="label">Start date *</label>
                <InputText className="input" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">End date *</label>
                <InputText className="input" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label className="label">Ribbon text on the package card</label>
              <InputText className="input" value={form.discountLabel} onChange={(e) => setForm((f) => ({ ...f, discountLabel: e.target.value }))} placeholder="Extra 2% first-year bonus" />
            </div>
            <div className="field">
              <label className="label">Where it shows</label>
              <div className="channel-pill-row">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button key={ch} className={`channel-pill ${form.channels.includes(ch) ? "active" : ""}`} onClick={() => toggleChannel(ch)}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-grid-3">
              <div className="field">
                <label className="label">Budget committed (฿)</label>
                <InputText
                  className="input"
                  type="number"
                  min={0}
                  value={String(form.budget)}
                  onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="field">
                <label className="label">Budget used (฿)</label>
                <InputText
                  className="input"
                  type="number"
                  min={0}
                  value={String(form.budgetUsed)}
                  onChange={(e) => setForm((f) => ({ ...f, budgetUsed: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="field">
                <label className="label">Redemptions</label>
                <InputText
                  className="input"
                  type="number"
                  min={0}
                  value={String(form.redemptions)}
                  onChange={(e) => setForm((f) => ({ ...f, redemptions: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {error && <div className="readonly-note">{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <Button label={saving ? "กำลังบันทึก…" : isNew ? "Create campaign" : "Save campaign"} icon={<IconSave />} disabled={saving} onClick={handleSave} />
              {!isNew && campaign && (
                <Button
                  label="Delete"
                  icon={<IconTrash />}
                  outlined
                  severity="danger"
                  style={{ marginLeft: "auto" }}
                  onClick={handleDelete}
                  disabled={campaignStatus(campaign.startDate, campaign.endDate) !== "scheduled"}
                  title={campaignStatus(campaign.startDate, campaign.endDate) !== "scheduled" ? "Campaign ที่เริ่มใช้งานแล้วลบไม่ได้" : undefined}
                />
              )}
            </div>
          </div>
        </div>

        <CampaignCardPreview
          packageTitle={previewPkg?.product.nameEn ?? "ยังไม่ผูก Package"}
          packageCode={previewPkg?.product.planCode ?? "-"}
          category={previewPkg?.product.category ?? ""}
          ribbonText={form.discountLabel}
        />
      </div>

      {!isNew && campaign && (
        <div className="card">
          <div className="card-head">
            <div className="card-head-left">
              <div className="card-title">Attached packages</div>
              <div className="card-sub">Package/Channel ที่ Campaign นี้ถูกนำไปใช้ — ผูกได้พร้อมกันหลายรายการ</div>
            </div>
            <Button label="Attach package" icon={<IconPlus />} onClick={() => setShowAttach(true)} />
          </div>
          <div className="card-body">
            {campaign.attachments.length === 0 && <div className="search-empty">ยังไม่ได้ผูกกับ Package ไหน</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {campaign.attachments.map((a) => {
                const s = campaignStatus(campaign.startDate, campaign.endDate);
                return (
                  <div key={`${a.planCode}-${a.channelType}`} className="doc-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {a.packageNameTh} <span className="upload-sub">({a.planCode})</span>
                      </div>
                      <div className="upload-sub">
                        {a.packageNameEn} · {a.channelType}
                      </div>
                    </div>
                    <Tag severity={CAMPAIGN_STATUS_SEVERITY[s]} value={CAMPAIGN_STATUS_LABEL[s]} />
                    <Button icon={<IconTrash />} outlined severity="danger" rounded onClick={() => handleDetach(a)} title="ถอดออกจาก Package นี้" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showAttach && campaign && (
        <AttachPackageDialog campaign={campaign} onClose={() => setShowAttach(false)} onAttached={() => { setShowAttach(false); reload(); }} />
      )}
    </div>
  );
}

function AttachPackageDialog({
  campaign,
  onClose,
  onAttached,
}: {
  campaign: CampaignListItem;
  onClose: () => void;
  onAttached: () => void;
}) {
  const [packages, setPackages] = useState<PackageSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.listPackages().then(setPackages);
  }, []);

  const filtered = useMemo(() => {
    if (!packages) return [];
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => p.nameTh.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.planCode.toLowerCase().includes(q));
  }, [packages, query]);

  function isAttached(planCode: string, channelType: ChannelType) {
    return campaign.attachments.some((a) => a.planCode === planCode && a.channelType === channelType);
  }

  async function attach(planCode: string, channelType: ChannelType) {
    const key = `${planCode}-${channelType}`;
    setBusyKey(key);
    setErr(null);
    try {
      await api.attachCampaign(campaign.id, { planCode, channelType });
      onAttached();
    } catch (e: any) {
      const code = String(e.message ?? e);
      setErr(code === "campaign_overlap" ? "ช่วงวันที่ของ Campaign นี้ทับซ้อนกับ Campaign อื่นบน Package/Channel นี้อยู่" : code);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Dialog
      visible
      onHide={onClose}
      header={`Attach package — ${campaign.name}`}
      style={{ width: 520 }}
      footer={<Button label="ปิด" icon={<IconClose />} outlined severity="secondary" onClick={onClose} />}
    >
      <div className="search-box" style={{ marginBottom: 12 }}>
        <div className="search-inner">
          <IconSearch />
          <input placeholder="ค้นหาชื่อ Package หรือรหัสสินค้า…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </div>
      </div>
      {err && <div className="readonly-note" style={{ marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
        {packages === null && <div className="search-empty">กำลังโหลด…</div>}
        {packages !== null && filtered.length === 0 && <div className="search-empty">ไม่พบ Package</div>}
        {filtered.map((p) => (
          <div key={p.planCode} style={{ border: "1px solid var(--gray-200)", borderRadius: 9, padding: "9px 12px" }}>
            <b>
              {p.nameTh} <span>({p.planCode})</span>
            </b>
            <div className="upload-sub" style={{ marginBottom: 6 }}>{p.nameEn}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.channelGroups.map((ch) => {
                const attached = isAttached(p.planCode, ch);
                return (
                  <button
                    key={ch}
                    className={`channel-pill ${attached ? "active" : ""}`}
                    disabled={attached || busyKey === `${p.planCode}-${ch}`}
                    onClick={() => attach(p.planCode, ch)}
                  >
                    {attached ? `${ch} ✓` : ch}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

import { Fragment, useState } from "react";
import { Button } from "primereact/button";
import {
  ELIGIBILITY_SECTIONS,
  PROMOTION_TYPES,
  getPromotionType,
  type FieldSchema,
  type PromotionType,
  type SectionSchema,
} from "../campaignBuilderSchema";
import { CampaignFieldRenderer } from "./CampaignFieldRenderer";
import {
  IconArrowLeft,
  IconCalendar,
  IconCashback,
  IconCheck,
  IconDoc,
  IconGroup,
  IconInstallment,
  IconInventory,
  IconLiveTv,
  IconRedeem,
  IconRewardPoints,
  IconSave,
  IconShieldOutline,
  IconTag,
  IconTrophy,
  IconVoucher,
} from "../icons";

// The top-level "Create Campaign" wizard: Campaign Type is its own gate page; once confirmed, the
// remaining five topics render as one continuous scrollable page (like Package Configuration's own
// sections-rail pattern) — the step bar's other labels just scroll to their anchor, they don't
// switch views. Each still gets its own checkmark once its required fields are actually filled in.
const WIZARD_STEPS = ["Campaign Type", "Campaign Information", "Period & Budget", "Eligibility", "Delivery", "Document"];

const TYPE_ICONS: Record<string, () => JSX.Element> = {
  voucher: IconVoucher,
  discount: IconTag,
  cashback: IconCashback,
  gift: IconRedeem,
  installment: IconInstallment,
  points: IconRewardPoints,
  referral: IconGroup,
  bundle: IconInventory,
  rider: IconShieldOutline,
  draw: IconTrophy,
};

// Screenshot 1 shows exactly these nine — "Free add-on cover" (rider) isn't part of the flat grid.
const FLAT_TYPES = PROMOTION_TYPES.filter((t) => t.id !== "rider");

function n(v: string): number {
  const cleaned = (v || "").replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}
function fmt(v: number): string {
  return v.toLocaleString("en-US");
}

export function CreateCampaignPage({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"type" | "form">("type");
  const [ctype, setCtype] = useState<string | null>(null);
  const [cname, setCname] = useState("Songkran double bonus");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [docFile, setDocFile] = useState<File | null>(null);

  const selectedType = getPromotionType(ctype);

  function val(scope: string, key: string): string {
    return vals[`${scope}:${key}`] ?? "";
  }
  function setVal(scope: string, key: string, v: string) {
    setVals((prev) => ({ ...prev, [`${scope}:${key}`]: v }));
  }
  function fieldDefault(scope: string, key: string, fallback: string): string {
    return vals[`${scope}:${key}`] || fallback;
  }
  function selectType(t: PromotionType) {
    setCtype(t.id);
    setVals({}); // schemas differ across types — carrying values over would be wrong
  }
  function typeVal(t: PromotionType, key: string): string {
    const field = t.sections.flatMap((s) => s.fields).find((f) => f.key === key);
    return fieldDefault(t.id, key, field?.default ?? "");
  }
  const eligVal = (key: string) => {
    const field = ELIGIBILITY_SECTIONS.flatMap((s) => s.fields).find((f) => f.key === key);
    return fieldDefault("elig", key, field?.default ?? "");
  };

  // A topic's checkmark reflects real data, not just visited-or-not: every field the schema marks
  // required must actually have been typed in (raw vals, not the display-only schema default).
  function requiredFilled(fields: FieldSchema[], scope: string): boolean {
    return fields.filter((f) => f.required).every((f) => Boolean(vals[`${scope}:${f.key}`]));
  }

  const startDate = eligVal("start");
  const endDate = eligVal("end");
  const budget = n(eligVal("budget"));
  const maxRedeem = n(eligVal("maxredeem"));
  const unitCost = selectedType ? selectedType.unitCost((k) => typeVal(selectedType, k)) : 0;
  const worstCase = unitCost * maxRedeem;
  const overBudget = budget > 0 && worstCase > budget;
  const budgetPct = budget > 0 ? Math.min(100, (worstCase / budget) * 100) : 0;

  const doneMap = [
    phase === "form",
    selectedType ? requiredFilled(selectedType.sections[0].fields, selectedType.id) : false,
    requiredFilled([...ELIGIBILITY_SECTIONS[2].fields, ...ELIGIBILITY_SECTIONS[3].fields], "elig"),
    requiredFilled([...ELIGIBILITY_SECTIONS[0].fields, ...ELIGIBILITY_SECTIONS[1].fields], "elig"),
    selectedType ? requiredFilled(selectedType.sections.slice(1).flatMap((s) => s.fields), selectedType.id) : false,
    Boolean(docFile),
  ];

  function scrollToSection(i: number) {
    document.getElementById(`cc-anchor-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSections(sections: SectionSchema[], scope: string) {
    return sections.map((section) => (
      <div className="card cf-section" key={section.title}>
        <div className="card-body">
          <div className="cf-section-title">{section.title}</div>
          <div className="cf-field-grid">
            {section.fields.map((f) => (
              <CampaignFieldRenderer key={f.key} field={f} value={val(scope, f.key)} onChange={(v) => setVal(scope, f.key, v)} />
            ))}
          </div>
        </div>
      </div>
    ));
  }

  return (
    <div className="list-page">
      <div className="cc-subheader">
        <button className="icon-btn" onClick={onBack} title="กลับไป Campaign">
          <IconArrowLeft />
        </button>
        <div className="cc-title-block">
          <input className="cc-title-input" value={cname} onChange={(e) => setCname(e.target.value)} />
          <div className="cc-meta">
            <IconCalendar /> Eff Date : {startDate || "-"} &nbsp;|&nbsp; Exp Date : {endDate || "-"}
          </div>
        </div>
        <div className="cc-actions">
          <Button label="Preview" icon={<IconLiveTv />} outlined severity="secondary" disabled />
          <Button label="Save & Close" icon={<IconSave />} outlined severity="secondary" onClick={onBack} />
          <Button label="Save" icon={<IconSave />} outlined severity="secondary" onClick={onBack} />
          <Button label="Submit" disabled={phase !== "form"} onClick={onBack} />
        </div>
      </div>

      <div className="cc-stepper">
        {WIZARD_STEPS.map((label, i) => (
          <Fragment key={label}>
            <div
              className={`cc-step ${doneMap[i] ? "done" : ""}`}
              onClick={() => (i === 0 ? setPhase("type") : phase === "form" && scrollToSection(i))}
            >
              <span className="cc-step-dot">{doneMap[i] && <IconCheck />}</span>
              <span className="cc-step-label">{label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <span className="cc-step-connector" />}
          </Fragment>
        ))}
      </div>

      {phase === "type" && (
        <div className="cc-body-grid">
          <div className="cc-form-col">
            <div className="card">
              <div className="card-body">
                <div className="card-title" style={{ marginBottom: 20 }}>
                  Campaign Type
                </div>
                <div className="cc-type-grid">
                  {FLAT_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t.id];
                    return (
                      <div key={t.id} className={`cc-type-card ${ctype === t.id ? "selected" : ""}`} onClick={() => selectType(t)}>
                        <div className="cc-type-text">
                          <div className="cc-type-label">{t.name}</div>
                          <div className="cc-type-desc">{t.th}</div>
                        </div>
                        <div className="cc-type-icon">
                          <Icon />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cc-footer">
                  <Button label="Continue" disabled={!selectedType} onClick={() => setPhase("form")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "form" && selectedType && (
        <div className="cc-body-grid with-panel">
          <div className="cc-form-col">
            <div id="cc-anchor-1" className="cc-section-group">
              <div className="wizard-step-heading">Campaign Information</div>
              <div className="wizard-step-blurb">{selectedType.description}</div>
              {renderSections([selectedType.sections[0]], selectedType.id)}
            </div>

            <div id="cc-anchor-2" className="cc-section-group">
              <div className="wizard-step-heading">Period & Budget</div>
              <div className="wizard-step-blurb">When this campaign runs, which channels, and the budget it can spend.</div>
              {renderSections(ELIGIBILITY_SECTIONS.slice(2, 4), "elig")}
            </div>

            <div id="cc-anchor-3" className="cc-section-group">
              <div className="wizard-step-heading">Eligibility</div>
              <div className="wizard-step-blurb">Who qualifies, and on which products.</div>
              {renderSections(ELIGIBILITY_SECTIONS.slice(0, 2), "elig")}
            </div>

            <div id="cc-anchor-4" className="cc-section-group">
              <div className="wizard-step-heading">Delivery</div>
              <div className="wizard-step-blurb">How the {selectedType.name.toLowerCase()} reaches the customer.</div>
              {selectedType.sections.length > 1 ? (
                renderSections(selectedType.sections.slice(1), selectedType.id)
              ) : (
                <div className="search-empty">ประเภทนี้ไม่มีการตั้งค่าการนำส่งเพิ่มเติม</div>
              )}
            </div>

            <div id="cc-anchor-5" className="cc-section-group">
              <div className="wizard-step-heading">Document</div>
              <div className="wizard-step-blurb">Documents shown to the customer for this campaign.</div>
              <div className="card cf-section">
                <div className="card-body">
                  <label className="upload-box" style={{ minHeight: 140, cursor: "pointer" }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    />
                    <IconDoc />
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {docFile ? docFile.name : "คลิกเพื่ออัปโหลดเอกสาร หรือลากไฟล์มาวาง"}
                    </div>
                    <div className="upload-sub">PDF เท่านั้น · สูงสุด 10MB</div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="wizard-side-panel">
            <div className="wizard-side-card wizard-side-preview">
              <div className="wizard-side-title">What the customer gets</div>
              <div className="wizard-side-head-row">
                <div className="wizard-side-glyph">{(() => { const Icon = TYPE_ICONS[selectedType.id]; return <Icon />; })()}</div>
                <div>
                  <div className="wizard-side-head">{selectedType.head((k) => typeVal(selectedType, k))}</div>
                  <div className="wizard-side-headsub">{selectedType.headSub((k) => typeVal(selectedType, k))}</div>
                </div>
              </div>
              <div className="wizard-side-divider" />
              <div className="wizard-side-rows">
                {selectedType.previewRows.map((r) => (
                  <div className="wizard-side-row" key={r.key}>
                    <span>{r.label}</span>
                    <span>{typeVal(selectedType, r.key) || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wizard-side-card">
              <div className="wizard-side-title">Budget impact</div>
              <div className="wizard-side-rows">
                <div className="wizard-side-row"><span>Campaign budget</span><span>฿{fmt(budget)}</span></div>
                <div className="wizard-side-row"><span>Maximum redemptions</span><span>{fmt(maxRedeem)}</span></div>
                <div className="wizard-side-row"><span>Cost per redemption</span><span>฿{fmt(unitCost)}</span></div>
                <div className="wizard-side-row"><span>Worst-case spend</span><span>฿{fmt(worstCase)}</span></div>
              </div>
              <div className="wizard-budget-bar">
                <i className={overBudget ? "over" : ""} style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="wizard-budget-impact-note">
                {overBudget
                  ? "Worst case exceeds the budget. Lower the cap or the reward value."
                  : `Worst case uses ${budget > 0 ? Math.round((worstCase / budget) * 100) : 0}% of the campaign budget.`}
              </div>
            </div>

            <div className="wizard-side-card">
              <div className="wizard-side-title">Before you activate</div>
              <ul className="wizard-notes-list">
                {selectedType.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

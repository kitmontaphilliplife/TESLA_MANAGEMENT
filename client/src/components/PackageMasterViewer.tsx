import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import type { ProductListItem, RawProductPayload } from "../types";
import { api } from "../api";
import { IconArrowLeft, IconPackage, IconPlus } from "../icons";
import { RowActionsMenu } from "./RowActionsMenu";
import { PayloadModal } from "./PayloadModal";

const TABS = [
  { key: "main", label: "Main Info" },
  { key: "rider", label: "Rider & Endorsement" },
  { key: "coverage", label: "Coverage & Benefits" },
  { key: "eligibility", label: "Eligibility" },
  { key: "premium", label: "Premium & Pricing" },
  { key: "commission", label: "Commission" },
  { key: "attachment", label: "Attachment" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value ?? "-"}</div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">{title}</div>
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function MainInfoTab({ p }: { p: RawProductPayload }) {
  return (
    <>
      <Section title="Classification">
        <div className="detail-grid">
          <Field label="Class of Business" value={p.class_Of_Business_Name_En} />
          <Field label="Line of Business" value={p.line_Of_Business_Name_En} />
          <Field label="Product Type" value={p.product_Type_Name_En} />
          <Field label="Sub Product Type" value={p.sub_Product_Type_Name_En} />
          <Field label="Insurance Type" value={p.insurance_Type_Name_En} />
          <Field label="Coverage Type" value={p.coverage_Type_Name_En} />
          <Field label="Rider Type" value={p.type_Of_Rider_Name_En} />
        </div>
      </Section>

      <Section title="Product Information">
        <div className="detail-grid">
          <Field label="Product Name TH" value={p.plan_Name_Th} />
          <Field label="Product Name EN" value={p.plan_Name_En} />
        </div>
        <div className="detail-field" style={{ marginTop: 12 }}>
          <div className="detail-field-label">Description</div>
          <div className="detail-field-value">{p.description || "-"}</div>
        </div>
        <div className="detail-grid" style={{ marginTop: 12 }}>
          <Field label="Sale Start Date" value={formatDate(p.start_Date)} />
          <Field label="Sale End Date" value={formatDate(p.end_Date)} />
          <Field label="Country Location" value={p.country_Code} />
          <Field label="Currency" value={p.currency_Code} />
        </div>
      </Section>

      <Section title="Distribution Channel">
        <div className="chip-row">
          {p.plan_Channel_Code.map((c) => (
            <span className="chip" key={c.channel_Code}>
              {c.name_En}
            </span>
          ))}
        </div>
      </Section>

      <div className="field-grid-3" style={{ marginBottom: 16 }}>
        <Section title="Free Look">
          <Tag value={p.free_Look_Flag === "Y" ? "Yes" : "No"} severity={p.free_Look_Flag === "Y" ? "success" : "secondary"} />
        </Section>
        <Section title="Participation">
          <Tag value={p.participation_Flag === "Y" ? "Yes" : "No"} severity={p.participation_Flag === "Y" ? "success" : "secondary"} />
        </Section>
        <Section title="Client Coverage Type">
          <Tag value={p.client_Coverage_Type_Code} severity="info" />
        </Section>
      </div>

      <div className="field-grid" style={{ marginBottom: 16 }}>
        <Section title="Coverage Period / Renewal Maximum Period">
          <div className="detail-grid">
            <Field label="Coverage Duration Method" value={p.coverage_Duration_Method_Code} />
            <Field label="Coverage Duration Value" value={p.coverage_Duration_Value ?? "-"} />
          </div>
        </Section>
        <Section title="Payment Term / Renewal Maximum Period">
          <div className="detail-grid">
            <Field label="Premium Payment Duration Method" value={p.premium_Duration_Method_Code} />
            <Field label="Premium Payment Duration Value" value={p.premium_Duration_Value ?? "-"} />
          </div>
        </Section>
      </div>

      <Section title="Tax Deductible Conditions">
        {p.tax_Exempts.length === 0 ? (
          <div className="search-empty">ไม่มีข้อมูลใน payload นี้</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gender</th>
                  <th>Min Issued Age</th>
                  <th>Max Issued Age</th>
                  <th>Min Sum Assured</th>
                  <th>Max Sum Assured</th>
                  <th>Occupation Class</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {p.tax_Exempts.map((t, i) => (
                  <tr key={i}>
                    <td>{t.gender_Name_En}</td>
                    <td>{t.min_Age} Year</td>
                    <td>{t.max_Age} Year</td>
                    <td>{t.min_Sum_Assurance.toLocaleString()} Baht</td>
                    <td>{t.max_Sum_Assurance.toLocaleString()} Baht</td>
                    <td>{t.occupation_Class_Name_En ?? "-"}</td>
                    <td>{t.tax_Percent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

function RiderTab({ p }: { p: RawProductPayload }) {
  if (p.plan_Additional_Rider.length === 0) {
    return <div className="search-empty">Product นี้ไม่มี Rider/Endorsement ใน payload</div>;
  }
  return (
    <div className="field-grid">
      {p.plan_Additional_Rider.map((r, i) => (
        <div className="kf-row" key={i}>
          <div className="kf-body">
            <div className="kf-value-input">{r.product_Type_Name_En}</div>
            <div className="upload-sub">{r.product_Type_Name_Th}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverageTab({ p }: { p: RawProductPayload }) {
  if (p.plan_Coverage_Benefit.length === 0) {
    return <div className="search-empty">ไม่มีข้อมูล Coverage Benefit ใน payload</div>;
  }
  const columns = Array.from(new Set(p.plan_Coverage_Benefit.flatMap((row) => Object.keys(row)))).filter(
    (c) => !["id", "uuid", "plan_UUID", "plan_Coverage_UUID", "sub_Plan_Uuid"].includes(c)
  );
  return (
    <div>
      <p className="upload-sub" style={{ marginBottom: 10 }}>
        payload ไม่มี label หมวดหมู่ความคุ้มครอง (เช่น "Health"/"Accident") มาด้วย เลยแสดงเป็นตาราง field ทั้งหมดตรง ๆ
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.plan_Coverage_Benefit.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String((row as any)[c] ?? "-")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EligibilityTab({ p }: { p: RawProductPayload }) {
  const byCollection = new Map<string, typeof p.plan_Payment_Method_Code>();
  p.plan_Payment_Method_Code.forEach((m) => {
    const list = byCollection.get(m.payment_Collection_Code) ?? [];
    list.push(m);
    byCollection.set(m.payment_Collection_Code, list);
  });

  return (
    <>
      <div className="field-grid" style={{ marginBottom: 16 }}>
        <Section title="Gender">
          <div className="chip-row">
            {p.plan_Gender_Code.map((g, i) => (
              <span className="chip" key={i}>
                {g.name_En}
              </span>
            ))}
          </div>
        </Section>
        <Section title="Occupation Class">
          <div className="chip-row">
            {p.plan_Occupation_Class_Code.map((o, i) => (
              <span className="chip" key={i}>
                {o.name_En}
              </span>
            ))}
          </div>
        </Section>
      </div>
      <div className="field-grid" style={{ marginBottom: 16 }}>
        <Section title="Sum Assured">
          <div className="detail-grid">
            <Field label="Minimum Sum Assured" value={`${p.min_Sum_Assurance.toLocaleString()} Baht`} />
            <Field label="Maximum Sum Assured" value={`${p.max_Sum_Assurance.toLocaleString()} Baht`} />
          </div>
        </Section>
        <Section title="Issue Age">
          <div className="detail-grid">
            <Field label="Minimum Issue Age" value={`${p.min_Issue_Age_Value} (${p.min_Issue_Age_Method_Code})`} />
            <Field label="Maximum Issue Age" value={`${p.max_Issue_Age_Value} (${p.max_Issue_Age_Method_Code})`} />
          </div>
        </Section>
      </div>
      <div className="field-grid" style={{ marginBottom: 16 }}>
        <Section title="Underwriting Type">
          <div className="chip-row">
            {p.plan_Type_Of_Underwrite_Code.map((u, i) => (
              <span className="chip" key={i}>
                {u.name_En}
              </span>
            ))}
          </div>
        </Section>
        <Section title="Waiting Period">
          <Field label="Waiting Period" value={p.waiting_Period != null ? `${p.waiting_Period} Day` : "-"} />
        </Section>
      </div>
      <Section title="Premium Payment Mode">
        <div className="chip-row">
          {p.plan_Payment_Modes.map((m, i) => (
            <span className="chip" key={i}>
              {m.name_En} (x{m.premium_Interest_Factor})
            </span>
          ))}
        </div>
      </Section>
      <Section title="Premium Payment Method">
        {Array.from(byCollection.entries()).map(([collection, methods]) => (
          <div key={collection} style={{ marginBottom: 10 }}>
            <div className="label" style={{ marginBottom: 6 }}>
              {methods[0]?.payment_Collection_Name_En ?? collection}
            </div>
            <div className="chip-row">
              {methods.map((m, i) => (
                <span className="chip" key={i}>
                  {m.payment_Method_Name_En}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

function PremiumTab({ p }: { p: RawProductPayload }) {
  return (
    <Section title="Premium & Pricing">
      <div className="detail-grid">
        <Field label="Premium Calculation Method" value={p.premium_Cal_Method_Code} />
        <Field label="Age Calculation Method" value={p.age_Cal_Method_Code} />
        <Field label="CSV Calculation Method" value={p.csV_Cal_Method_Code} />
        <Field label="Premium Max Discount" value={`${p.premium_Max_Discount}%`} />
        <Field label="Premium Rate Per Unit" value={p.premium_Rate_Per_Unit.toLocaleString()} />
        <Field label="Interest Rate" value={`${p.interest_Rate}%`} />
        <Field label="Loan Interest Rate" value={`${p.loan_Interest_Rate}%`} />
        <Field label="APL Interest Rate" value={`${p.apL_Interest_Rate}%`} />
        <Field label="Policy Grace Period" value={p.policy_Grace_Period != null ? `${p.policy_Grace_Period} Day` : "-"} />
        <Field label="OIC Approval No." value={p.oiC_Approval_No} />
        <Field label="OIC Approval Date" value={formatDate(p.oiC_Approval_Date)} />
        <Field label="OIC Expired Date" value={formatDate(p.oiC_Expired_Date)} />
      </div>
    </Section>
  );
}

export function PackageMasterViewer() {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ planCode: string; nameTh: string; nameEn: string; payload: RawProductPayload } | null>(null);
  const [tab, setTab] = useState<TabKey>("main");
  const [payloadModal, setPayloadModal] = useState<{ mode: "add" | "edit"; planCode?: string; initialText: string } | null>(null);

  function reload() {
    // Approved (APP) packages only — same set as the Add Package cascade.
    api.listProducts().then(setProducts).catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(reload, []);

  async function handleEdit(p: ProductListItem) {
    if (!p.hasRawPayload) {
      setPayloadModal({ mode: "edit", planCode: p.planCode, initialText: "" });
      return;
    }
    try {
      const raw = await api.getProductRaw(p.planCode);
      setPayloadModal({ mode: "edit", planCode: p.planCode, initialText: JSON.stringify(raw.payload, null, 2) });
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  async function handleDelete(p: ProductListItem) {
    if (!confirm(`ลบ Product ${p.planCode} — ${p.nameEn} ?`)) return;
    try {
      await api.deleteProduct(p.planCode);
      reload();
    } catch (e: any) {
      const msg = String(e.message ?? e);
      setError(msg === "has_package" ? `ลบไม่ได้ — ${p.planCode} มี Package อยู่แล้ว กรุณาลบ Package ก่อน` : msg);
    }
  }

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setTab("main");
    api
      .getProductRaw(selected)
      .then(setDetail)
      .catch((e) => setError(String(e.message ?? e)));
  }, [selected]);

  const filtered = useMemo(() => (products ?? []).slice(0, 25), [products]);

  if (selected) {
    return (
      <div>
        <div className="list-page-table card" style={{ margin: "0 0 16px 0", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button label="กลับ" icon={<IconArrowLeft />} outlined severity="secondary" onClick={() => setSelected(null)} />
            <Tag severity="info" value={`Product Code ${selected} ${detail ? `| ${detail.nameEn}` : ""}`} />
            {detail && <Tag severity="success" value={detail.payload.status_Name_En} />}
          </div>
        </div>

        {!detail && !error && <div className="search-empty">กำลังโหลด…</div>}
        {error && <div className="readonly-note">{error}</div>}

        {detail && (
          <>
            <div className="wizard-tabs">
              {TABS.map((t) => (
                <button key={t.key} className={`wizard-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "main" && <MainInfoTab p={detail.payload} />}
            {tab === "rider" && <RiderTab p={detail.payload} />}
            {tab === "coverage" && <CoverageTab p={detail.payload} />}
            {tab === "eligibility" && <EligibilityTab p={detail.payload} />}
            {tab === "premium" && <PremiumTab p={detail.payload} />}
            {tab === "commission" && <div className="search-empty">ไม่มีข้อมูล Commission ใน payload นี้ (master ยังไม่ส่งมาให้)</div>}
            {tab === "attachment" && <div className="search-empty">ไม่มีข้อมูลไฟล์แนบใน payload นี้ (master ยังไม่ส่งมาให้)</div>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="list-page-table card" style={{ margin: 0 }}>
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconPackage /> Package (TESLA_MASTER payload viewer)</div>
          <div className="card-sub">ดูข้อมูล payload เต็มของแต่ละ Product — เพิ่ม/แก้ไข ได้โดยวาง payload ใหม่</div>
        </div>
        <Button
          label="Add Package"
          icon={<IconPlus />}
          onClick={() => setPayloadModal({ mode: "add", initialText: "" })}
        />
      </div>
      {products === null && !error && <div className="search-empty" style={{ padding: 20 }}>กำลังโหลด…</div>}
      {error && <div className="readonly-note" style={{ margin: 16 }}>{error}</div>}
      {products !== null && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan Code</th>
                <th>Name</th>
                <th>Distribution</th>
                <th>Product</th>
                <th>Sub Product</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.planCode}>
                  <td>{p.planCode}</td>
                  <td>
                    <div>{p.nameTh}</div>
                    <div className="upload-sub">{p.nameEn}</div>
                  </td>
                  <td>{p.channels[0]?.nameEn ?? "-"}</td>
                  <td>{p.productTypeNameEn || "-"}</td>
                  <td>{p.subProductTypeNameEn || "-"}</td>
                  <td>
                    <RowActionsMenu
                      onView={() => setSelected(p.planCode)}
                      onEdit={() => handleEdit(p)}
                      onDelete={() => handleDelete(p)}
                      canDelete={!p.hasPackage}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payloadModal && (
        <PayloadModal
          mode={payloadModal.mode}
          planCode={payloadModal.planCode}
          initialText={payloadModal.initialText}
          onClose={() => setPayloadModal(null)}
          onSaved={() => {
            setPayloadModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

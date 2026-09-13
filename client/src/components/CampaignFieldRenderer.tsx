import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import type { FieldSchema } from "../campaignBuilderSchema";

// Renders one field from a promotion type's (or eligibility's) schema — the same five kinds
// (text/num/select/radio/textarea) serve every type, per the design handoff's generic form layer.
export function CampaignFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  const shown = value || field.default || "";

  return (
    <div className="cf-field" style={{ gridColumn: field.span && field.span > 1 ? `span ${field.span}` : undefined }}>
      <label className="cf-label">
        {field.label}
        {field.required && <span className="cf-required"> *</span>}
      </label>

      {field.kind === "text" && (
        <InputText className="cf-input" value={shown} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.kind === "num" &&
        (field.unit ? (
          <div className="cf-num-wrap">
            <InputText className="cf-input cf-num-input" value={shown} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
            <span className="cf-num-unit">{field.unit}</span>
          </div>
        ) : (
          <InputText className="cf-input" value={shown} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        ))}

      {field.kind === "select" && (
        <Dropdown
          className="cf-select"
          style={{ width: "100%" }}
          value={shown}
          options={(field.options ?? []).map((o) => ({ label: o, value: o }))}
          onChange={(e) => onChange(e.value)}
        />
      )}

      {field.kind === "radio" && (
        <div className="cf-radio-row">
          {(field.options ?? []).map((o) => (
            <button key={o} type="button" className={`cf-radio-pill ${shown === o ? "selected" : ""}`} onClick={() => onChange(o)}>
              <span className="cf-radio-dot" />
              {o}
            </button>
          ))}
        </div>
      )}

      {field.kind === "textarea" && (
        <textarea className="cf-textarea" rows={4} value={shown} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.hint && <div className="cf-hint">{field.hint}</div>}
    </div>
  );
}

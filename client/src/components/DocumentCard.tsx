import { useRef } from "react";
import { Dropdown } from "primereact/dropdown";
import type { DocumentType, PackageDocument } from "../types";
import { DOCUMENT_TYPES } from "../types";
import { IconDoc, IconTrash, IconEye } from "../icons";

function formatSize(bytes: number): string {
  if (bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentCard({
  documents,
  onUpload,
  onChangeType,
  onRemove,
}: {
  documents: PackageDocument[];
  onUpload: (file: File, documentType: DocumentType) => void;
  onChangeType: (id: string, documentType: DocumentType) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconDoc /> Document — General Terms &amp; Conditions</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          className="upload-box"
          style={{ height: 80, flexDirection: "row", gap: 12, justifyContent: "flex-start", paddingLeft: 18 }}
          onClick={() => inputRef.current?.click()}
        >
          <IconDoc />
          <div style={{ textAlign: "left" }}>
            <div className="upload-title">คลิกเพื่ออัปโหลดเอกสาร หรือลากไฟล์มาวาง</div>
            <div className="upload-sub">PDF เท่านั้น · สูงสุด 10MB · เพิ่มได้ถึง 10 ไฟล์</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, "Terms & Conditions");
              e.target.value = "";
            }}
          />
        </div>

        {documents.length > 0 && (
          <div className="doc-list">
            <div className="label" style={{ marginBottom: 6 }}>
              File Uploaded
            </div>
            {documents.map((d) => (
              <div className="doc-row" key={d.id}>
                <div className="doc-row-badge">PDF</div>
                <div className="doc-row-body">
                  <div className="doc-row-name">{d.originalName}</div>
                  <div className="upload-sub">
                    {formatSize(d.fileSize)} · อัปโหลดแล้ว {d.uploadedAt}
                  </div>
                </div>
                <Dropdown
                  className="select"
                  style={{ width: 180, flexShrink: 0 }}
                  value={d.documentType}
                  options={DOCUMENT_TYPES.map((t) => ({ label: t, value: t }))}
                  onChange={(e) => onChangeType(d.id, e.value)}
                />
                <button className="icon-btn" onClick={() => window.open(`/uploads/${d.filename}`, "_blank")} title="ดูไฟล์">
                  <IconEye />
                </button>
                <button className="icon-btn" onClick={() => onRemove(d.id)} title="ลบไฟล์">
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

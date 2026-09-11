import { useRef } from "react";
import type { ChannelContent } from "../types";
import { IconDoc, IconWarning } from "../icons";

export function DocumentCard({
  document,
  onUpload,
}: {
  document: ChannelContent["document"];
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">Document — General Terms &amp; Conditions</div>
          <div className="card-sub">เอกสารแนบและข้อความเงื่อนไขทั่วไป</div>
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
            <div className="upload-title">{document.filename ?? "ยังไม่ได้อัปโหลดเอกสาร — คลิกเพื่ออัปโหลด"}</div>
            {document.uploadedAt && <div className="upload-sub">อัปโหลดแล้ว · {document.uploadedAt}</div>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="readonly-note">
          <IconWarning />
          <p>
            {document.legalText
              ? document.legalText
              : "ข้อความ \"สรุปสาระสำคัญ/เงื่อนไขทั่วไป\" (ความสมบูรณ์ของสัญญา, กรณีไม่คุ้มครอง, หมายเหตุ, คำเตือน) อ้างอิงจาก Legal/Compliance — ไม่แก้ไขผ่านหน้านี้ (รอยืนยันขั้นสุดท้าย)"}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { IconUpload, IconClose } from "../icons";

export function ImageUploadBox({
  image,
  width,
  height,
  label,
  sublabel,
  onUpload,
  onRemove,
}: {
  image: string | null;
  width?: number;
  height: number;
  label?: string;
  sublabel: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      await onRemove();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: width ?? "100%", flexShrink: width ? 0 : undefined }}>
      <div
        className="upload-box"
        style={{ width: width ?? "100%", height, position: "relative", padding: image ? 0 : undefined, overflow: "hidden", cursor: busy ? "wait" : "pointer" }}
        onClick={() => !busy && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {image ? (
          <>
            <img src={`/uploads/${image}`} alt={label ?? "uploaded"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,23,68,.55)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 500,
                opacity: 0,
                transition: "opacity .12s",
              }}
              className="upload-box-hover"
            >
              คลิกเพื่อเปลี่ยนรูป
            </div>
            <button
              className="icon-btn"
              style={{ position: "absolute", top: 6, right: 6, background: "#fff" }}
              onClick={handleRemove}
              title="ลบรูป"
            >
              <IconClose />
            </button>
          </>
        ) : (
          <>
            <IconUpload />
            {label && <div className="upload-title">{busy ? "กำลังอัปโหลด…" : label}</div>}
            {!label && <div className="upload-sub">{busy ? "กำลังอัปโหลด…" : "Click to upload"}</div>}
            <div className="upload-sub">{sublabel}</div>
          </>
        )}
      </div>
      {error && <div className="upload-sub" style={{ color: "var(--red)" }}>{error}</div>}
    </div>
  );
}

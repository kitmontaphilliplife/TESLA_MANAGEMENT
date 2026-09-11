import type { ChannelContent } from "../types";
import { IconUpload } from "../icons";
import { DebouncedInput } from "./DebouncedInput";

export function ThumbnailCard({
  content,
  onCommit,
}: {
  content: ChannelContent;
  onCommit: (captions: [string, string, string]) => void;
}) {
  const [c1, c2, c3] = content.thumbnail.captions;

  function setCaption(index: 0 | 1 | 2, value: string) {
    const next: [string, string, string] = [c1, c2, c3];
    next[index] = value;
    onCommit(next);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">Thumbnail</div>
          <div className="card-sub">รูปและข้อความสรุปที่แสดงในการ์ดหน้ารายการสินค้า</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", gap: 16 }}>
        <div className="upload-box" style={{ width: 140, height: 120, flexShrink: 0 }}>
          <IconUpload />
          <div className="upload-sub">Click to upload Banner</div>
          <div className="upload-sub">Recommended 800x600px (JPG/PNG)</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label">1st Thumbnail</label>
            <DebouncedInput className="input" value={c1} onCommit={(v) => setCaption(0, v)} />
          </div>
          <div className="field">
            <label className="label">2nd Thumbnail</label>
            <DebouncedInput className="input" value={c2} onCommit={(v) => setCaption(1, v)} />
          </div>
          <div className="field">
            <label className="label">3rd Thumbnail</label>
            <DebouncedInput className="input" value={c3} onCommit={(v) => setCaption(2, v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

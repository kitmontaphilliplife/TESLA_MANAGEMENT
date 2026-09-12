import type { ChannelContent } from "../types";
import { IconUpload, IconImage } from "../icons";
import { DebouncedInput } from "./DebouncedInput";

export function BannerCard({
  content,
  onCommit,
}: {
  content: ChannelContent;
  onCommit: (patch: Partial<Pick<ChannelContent["banner"], "title" | "subtitle">>) => void;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconImage /> Banner display</div>
          <div className="card-sub">แบนเนอร์บนสุดของหน้าโปรดักส์</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field-grid">
          <div className="upload-box" style={{ height: 96 }}>
            <IconUpload />
            <div className="upload-title">Desktop Banner</div>
            <div className="upload-sub">แนะนำ 1600×520px</div>
          </div>
          <div className="upload-box" style={{ height: 96 }}>
            <IconUpload />
            <div className="upload-title">Mobile Banner</div>
            <div className="upload-sub">แนะนำ 750×900px</div>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="label">Title</label>
            <DebouncedInput className="input" value={content.banner.title} onCommit={(v) => onCommit({ title: v })} />
          </div>
          <div className="field">
            <label className="label">Subtitle</label>
            <DebouncedInput className="input" value={content.banner.subtitle} onCommit={(v) => onCommit({ subtitle: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

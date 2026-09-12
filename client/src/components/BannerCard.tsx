import type { ChannelContent } from "../types";
import { IconImage } from "../icons";
import { DebouncedInput } from "./DebouncedInput";
import { ImageUploadBox } from "./ImageUploadBox";

export function BannerCard({
  content,
  onCommit,
  onUploadImage,
  onRemoveImage,
}: {
  content: ChannelContent;
  onCommit: (patch: Partial<Pick<ChannelContent["banner"], "title" | "subtitle">>) => void;
  onUploadImage: (slot: "desktop" | "mobile", file: File) => Promise<void>;
  onRemoveImage: (slot: "desktop" | "mobile") => Promise<void>;
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
          <ImageUploadBox
            image={content.banner.desktopImage}
            height={96}
            label="Desktop Banner"
            sublabel="แนะนำ 1600×520px"
            onUpload={(file) => onUploadImage("desktop", file)}
            onRemove={() => onRemoveImage("desktop")}
          />
          <ImageUploadBox
            image={content.banner.mobileImage}
            height={96}
            label="Mobile Banner"
            sublabel="แนะนำ 750×900px"
            onUpload={(file) => onUploadImage("mobile", file)}
            onRemove={() => onRemoveImage("mobile")}
          />
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

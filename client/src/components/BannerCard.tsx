import type { ChannelContent } from "../types";
import { IconImage, IconLaptop, IconMobile } from "../icons";
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
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="banner-slot-label">
              <IconLaptop /> Desktop
            </div>
            <ImageUploadBox
              image={content.banner.desktopImage}
              height={200}
              label="Click to upload"
              sublabel="Recommended: 800x600px (JPG/PNG)"
              onUpload={(file) => onUploadImage("desktop", file)}
              onRemove={() => onRemoveImage("desktop")}
            />
            <label className="label">1st Text banner</label>
            <DebouncedInput className="input" value={content.banner.title} onCommit={(v) => onCommit({ title: v })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="banner-slot-label">
              <IconMobile /> Mobile
            </div>
            <ImageUploadBox
              image={content.banner.mobileImage}
              height={200}
              label="Click to upload"
              sublabel="Recommended: 800x600px (JPG/PNG)"
              onUpload={(file) => onUploadImage("mobile", file)}
              onRemove={() => onRemoveImage("mobile")}
            />
            <label className="label">2nd Text banner</label>
            <DebouncedInput className="input" value={content.banner.subtitle} onCommit={(v) => onCommit({ subtitle: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

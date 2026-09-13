import type { ChannelContent } from "../types";

export interface RailSection {
  id: string;
  label: string;
  ready: boolean;
}

// Section completion — real rules driving the sections rail, the progress bar, the
// Submit-for-approval gate, and (Phase 3) the Approval screen's comment-section picker.
export function sectionsForContent(content: ChannelContent): RailSection[] {
  const sections: RailSection[] = [
    { id: "thumbnail", label: "Thumbnail & Banner", ready: content.thumbnail.image !== null },
    { id: "key-features", label: "Key features", ready: content.keyFeatures.length > 0 },
  ];
  if (content.keyAdvantages) {
    sections.push({
      id: "key-advantages",
      label: "Key advantages",
      ready: !content.keyAdvantages.enabled || content.keyAdvantages.cards.some((c) => c.title.trim() !== ""),
    });
  }
  if (content.recommends) {
    sections.push({ id: "recommend", label: "Recommended packages", ready: content.recommends.length > 0 });
  }
  if (content.productInformation) {
    const info = content.productInformation;
    sections.push({
      id: "product-info",
      label: "Product information",
      ready: info.insuranceTypes.length > 0 || info.additionalCoverages.length > 0 || info.highlights.length > 0,
    });
  }
  sections.push({ id: "document", label: "Documents", ready: content.documents.length > 0 });
  sections.push({ id: "review", label: "Review & submit", ready: sections.every((s) => s.ready) });
  return sections;
}

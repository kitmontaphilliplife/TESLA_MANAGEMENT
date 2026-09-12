import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChannelType, PackageDetail } from "./types";
import { api } from "./api";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { InfoBar } from "./components/InfoBar";
import { ChannelTabs, UnmappedChannelsWarning } from "./components/ChannelTabs";
import { ThumbnailCard } from "./components/ThumbnailCard";
import { BannerCard } from "./components/BannerCard";
import { KeyFeaturesCard } from "./components/KeyFeaturesCard";
import { KeyAdvantagesCard } from "./components/KeyAdvantagesCard";
import { PackageRecommendCard } from "./components/PackageRecommendCard";
import { ProductInformationCard } from "./components/ProductInformationCard";
import { DocumentCard } from "./components/DocumentCard";
import { CampaignPanel, ApprovalHistoryPanel } from "./components/SidePanels";
import { PackageListPage } from "./components/PackageListPage";
import { MasterSetupPage } from "./components/MasterSetupPage";
import { SectionNav } from "./components/SectionNav";
import { IconArrowLeft, IconWarning, IconClose } from "./icons";
import { Button } from "primereact/button";

export default function App() {
  const [view, setView] = useState<"list" | "detail" | "master">("list");
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>("ONLINE");
  const [saving, setSaving] = useState(false);
  // loadError: the package failed to load at all — nothing to show, so it replaces the
  // whole page. saveError: one save/upload action failed — shown as a dismissible banner
  // above the (still fully intact) cards, since the rest of the page is still perfectly
  // usable and kicking the user back out to Package List over one failed request would
  // lose their place for no reason.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (view !== "detail" || !planCode) return;
    setPkg(null);
    api
      .getPackage(planCode)
      .then((detail) => {
        setPkg(detail);
        setActiveChannel(detail.channelContents[0]?.channelType ?? "ONLINE");
      })
      .catch((e) => setLoadError(String(e.message ?? e)));
  }, [view, planCode]);

  function openPackage(code: string, openMode: "view" | "edit" = "edit") {
    setPlanCode(code);
    setMode(openMode);
    setLoadError(null);
    setSaveError(null);
    setView("detail");
  }

  const withSaving = useCallback(async (fn: () => Promise<PackageDetail>) => {
    setSaving(true);
    try {
      const result = await fn();
      setPkg(result);
      setSaveError(null);
    } catch (e: any) {
      setSaveError(String(e.message ?? e));
    } finally {
      setSaving(false);
    }
  }, []);

  const content = useMemo(
    () => pkg?.channelContents.find((c) => c.channelType === activeChannel) ?? null,
    [pkg, activeChannel]
  );
  const availableChannels = useMemo(() => pkg?.channelContents.map((c) => c.channelType) ?? [], [pkg]);

  const sectionNavItems = useMemo(() => {
    if (!content) return [];
    return [
      { id: "sec-thumbnail", label: "Thumbnail" },
      { id: "sec-banner", label: "Banner" },
      content.productInformation && { id: "sec-product-info", label: "Product Information" },
      { id: "sec-key-features", label: "Key Features" },
      content.keyAdvantages && { id: "sec-key-advantages", label: "Key Advantages" },
      content.recommends && { id: "sec-recommend", label: "Recommend" },
      { id: "sec-document", label: "Document" },
    ].filter((x): x is { id: string; label: string } => Boolean(x));
  }, [content]);

  function backToList() {
    setView("list");
    setPkg(null);
    setPlanCode(null);
    setMode("edit");
    setLoadError(null);
    setSaveError(null);
  }

  return (
    <div className="app">
      <Sidebar
        active={view === "master" ? "master" : "package"}
        onSelectPackageSetting={backToList}
        onSelectMasterSetup={() => {
          setView("master");
          setPkg(null);
          setPlanCode(null);
          setLoadError(null);
          setSaveError(null);
        }}
      />
      <div className="main">
        <div className="content-col">
          {view === "master" && <MasterSetupPage />}

          {view === "list" && <PackageListPage onOpenPackage={openPackage} />}

          {view === "detail" && loadError && (
            <div className="loading-screen">
              เกิดข้อผิดพลาด: {loadError}{" "}
              <Button label="กลับไป Package List" icon={<IconArrowLeft />} outlined severity="secondary" onClick={backToList} />
            </div>
          )}

          {view === "detail" && !loadError && (!pkg || !content) && <div className="loading-screen">กำลังโหลดข้อมูล Package…</div>}

          {view === "detail" && !loadError && pkg && content && (
            <>
              <Topbar
                pkg={pkg}
                saving={saving}
                readOnly={mode === "view"}
                onBack={backToList}
                onSaveDraft={() => withSaving(() => api.setStatus(planCode!, "draft"))}
                onSubmit={() => withSaving(() => api.setStatus(planCode!, "pending_approval"))}
              />
              <ChannelTabs available={availableChannels} active={activeChannel} onSelect={setActiveChannel} />
              <SectionNav items={sectionNavItems} />
              <div className={`body-scroll ${mode === "view" ? "read-only-lock" : ""}`}>
                <div className="col-main">
                  <InfoBar pkg={pkg} />

                  {saveError && (
                    <div className="readonly-note">
                      <IconWarning />
                      <p>
                        บันทึกไม่สำเร็จ: {saveError}
                      </p>
                      <button className="icon-btn" style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => setSaveError(null)} title="ปิด">
                        <IconClose />
                      </button>
                    </div>
                  )}

                  <UnmappedChannelsWarning unmapped={pkg.unmappedChannels} />

                  <div id="sec-thumbnail" className="section-anchor">
                    <ThumbnailCard
                      content={content}
                      onCommit={(captions) => withSaving(() => api.updateContent(planCode!, activeChannel, { thumbnail: { captions } }))}
                      onUploadImage={(file) => withSaving(() => api.uploadThumbnailImage(planCode!, activeChannel, file))}
                      onRemoveImage={() => withSaving(() => api.removeThumbnailImage(planCode!, activeChannel))}
                    />
                  </div>

                  <div id="sec-banner" className="section-anchor">
                    <BannerCard
                      content={content}
                      onCommit={(patch) => withSaving(() => api.updateContent(planCode!, activeChannel, { banner: patch }))}
                      onUploadImage={(slot, file) => withSaving(() => api.uploadBannerImage(planCode!, activeChannel, slot, file))}
                      onRemoveImage={(slot) => withSaving(() => api.removeBannerImage(planCode!, activeChannel, slot))}
                    />
                  </div>

                  {content.productInformation && (
                    <div id="sec-product-info" className="section-anchor">
                      <ProductInformationCard
                        content={content}
                        onSetProductType={(t) => withSaving(() => api.setProductType(planCode!, t))}
                        onAddItem={(groupType) => withSaving(() => api.addProductInfoItem(planCode!, groupType))}
                        onEditItem={(id, label) => withSaving(() => api.updateProductInfoItem(planCode!, id, label))}
                        onRemoveItem={(id) => withSaving(() => api.removeProductInfoItem(planCode!, id))}
                      />
                    </div>
                  )}

                  <div id="sec-key-features" className="section-anchor">
                    <KeyFeaturesCard
                      content={content}
                      onAdd={() => withSaving(() => api.addKeyFeature(planCode!, activeChannel))}
                      onEdit={(id, patch) => withSaving(() => api.updateKeyFeature(planCode!, activeChannel, id, patch))}
                      onToggleHighlight={(id, highlight) => withSaving(() => api.updateKeyFeature(planCode!, activeChannel, id, { highlight }))}
                      onRemove={(id) => withSaving(() => api.removeKeyFeature(planCode!, activeChannel, id))}
                      onContractualPayoutChange={(patch) => withSaving(() => api.setContractualPayout(planCode!, patch))}
                    />
                  </div>

                  {content.keyAdvantages && (
                    <div id="sec-key-advantages" className="section-anchor">
                      <KeyAdvantagesCard
                        enabled={content.keyAdvantages.enabled}
                        header={content.keyAdvantages.header}
                        cards={content.keyAdvantages.cards}
                        onToggleEnabled={(enabled) => withSaving(() => api.toggleKeyAdvantages(planCode!, enabled))}
                        onHeaderCommit={(header) => withSaving(() => api.updateKeyAdvantagesHeader(planCode!, header))}
                        onCardCommit={(id, patch) => withSaving(() => api.updateKeyAdvantageCard(planCode!, id, patch))}
                      />
                    </div>
                  )}

                  {content.recommends && (
                    <div id="sec-recommend" className="section-anchor">
                      <PackageRecommendCard
                        code={planCode!}
                        recommends={content.recommends}
                        onChange={(codes) => withSaving(() => api.setRecommends(planCode!, codes))}
                      />
                    </div>
                  )}

                  <div id="sec-document" className="section-anchor">
                    <DocumentCard
                      document={content.document}
                      onUpload={(file) => withSaving(() => api.uploadDocument(planCode!, activeChannel, file))}
                    />
                  </div>
                </div>

                <div className="col-side">
                  <CampaignPanel campaign={content.campaign} />
                  <ApprovalHistoryPanel auditLog={pkg.auditLog} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

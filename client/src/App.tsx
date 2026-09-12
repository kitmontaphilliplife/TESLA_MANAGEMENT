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
import { IconArrowLeft } from "./icons";

export default function App() {
  const [view, setView] = useState<"list" | "detail" | "master">("list");
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>("ONLINE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (view !== "detail" || !planCode) return;
    setPkg(null);
    api
      .getPackage(planCode)
      .then((detail) => {
        setPkg(detail);
        setActiveChannel(detail.channelContents[0]?.channelType ?? "ONLINE");
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [view, planCode]);

  function openPackage(code: string, openMode: "view" | "edit" = "edit") {
    setPlanCode(code);
    setMode(openMode);
    setError(null);
    setView("detail");
  }

  const withSaving = useCallback(async (fn: () => Promise<PackageDetail>) => {
    setSaving(true);
    try {
      const result = await fn();
      setPkg(result);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setSaving(false);
    }
  }, []);

  const content = useMemo(
    () => pkg?.channelContents.find((c) => c.channelType === activeChannel) ?? null,
    [pkg, activeChannel]
  );
  const availableChannels = useMemo(() => pkg?.channelContents.map((c) => c.channelType) ?? [], [pkg]);

  function backToList() {
    setView("list");
    setPkg(null);
    setPlanCode(null);
    setMode("edit");
    setError(null);
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
          setError(null);
        }}
      />
      <div className="main">
        <div className="content-col">
          {view === "master" && <MasterSetupPage />}

          {view === "list" && <PackageListPage onOpenPackage={openPackage} />}

          {view === "detail" && error && (
            <div className="loading-screen">
              เกิดข้อผิดพลาด: {error}{" "}
              <button className="btn btn-secondary" onClick={backToList}>
                <IconArrowLeft /> กลับไป Package List
              </button>
            </div>
          )}

          {view === "detail" && !error && (!pkg || !content) && <div className="loading-screen">กำลังโหลดข้อมูล Package…</div>}

          {view === "detail" && !error && pkg && content && (
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
              <div className={`body-scroll ${mode === "view" ? "read-only-lock" : ""}`}>
                <div className="col-main">
                  <InfoBar pkg={pkg} />

                  <UnmappedChannelsWarning unmapped={pkg.unmappedChannels} />

                  <ThumbnailCard
                    content={content}
                    onCommit={(captions) => withSaving(() => api.updateContent(planCode!, activeChannel, { thumbnail: { captions } }))}
                  />

                  <BannerCard
                    content={content}
                    onCommit={(patch) => withSaving(() => api.updateContent(planCode!, activeChannel, { banner: patch }))}
                  />

                  {content.productInformation && (
                    <ProductInformationCard
                      content={content}
                      onSetProductType={(t) => withSaving(() => api.setProductType(planCode!, t))}
                      onAddItem={(groupType) => withSaving(() => api.addProductInfoItem(planCode!, groupType))}
                      onEditItem={(id, label) => withSaving(() => api.updateProductInfoItem(planCode!, id, label))}
                      onRemoveItem={(id) => withSaving(() => api.removeProductInfoItem(planCode!, id))}
                    />
                  )}

                  <KeyFeaturesCard
                    content={content}
                    onAdd={() => withSaving(() => api.addKeyFeature(planCode!, activeChannel))}
                    onEdit={(id, patch) => withSaving(() => api.updateKeyFeature(planCode!, activeChannel, id, patch))}
                    onToggleHighlight={(id, highlight) => withSaving(() => api.updateKeyFeature(planCode!, activeChannel, id, { highlight }))}
                    onRemove={(id) => withSaving(() => api.removeKeyFeature(planCode!, activeChannel, id))}
                    onContractualPayoutChange={(patch) => withSaving(() => api.setContractualPayout(planCode!, patch))}
                  />

                  {content.keyAdvantages && (
                    <KeyAdvantagesCard
                      enabled={content.keyAdvantages.enabled}
                      header={content.keyAdvantages.header}
                      cards={content.keyAdvantages.cards}
                      onToggleEnabled={(enabled) => withSaving(() => api.toggleKeyAdvantages(planCode!, enabled))}
                      onHeaderCommit={(header) => withSaving(() => api.updateKeyAdvantagesHeader(planCode!, header))}
                      onCardCommit={(id, patch) => withSaving(() => api.updateKeyAdvantageCard(planCode!, id, patch))}
                    />
                  )}

                  {content.recommends && (
                    <PackageRecommendCard
                      code={planCode!}
                      recommends={content.recommends}
                      onChange={(codes) => withSaving(() => api.setRecommends(planCode!, codes))}
                    />
                  )}

                  <DocumentCard
                    document={content.document}
                    onUpload={(file) => withSaving(() => api.uploadDocument(planCode!, activeChannel, file))}
                  />
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

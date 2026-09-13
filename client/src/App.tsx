import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChannelType, PackageDetail } from "./types";
import { api } from "./api";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { ChannelTabs, UnmappedChannelsWarning } from "./components/ChannelTabs";
import { ThumbnailCard } from "./components/ThumbnailCard";
import { BannerCard } from "./components/BannerCard";
import { KeyFeaturesCard } from "./components/KeyFeaturesCard";
import { KeyAdvantagesCard } from "./components/KeyAdvantagesCard";
import { PackageRecommendCard } from "./components/PackageRecommendCard";
import { ProductInformationCard } from "./components/ProductInformationCard";
import { DocumentCard } from "./components/DocumentCard";
import { sectionsForContent } from "./components/SectionsRail";
import { SectionStepper } from "./components/SectionStepper";
import { LivePreviewRail } from "./components/LivePreviewRail";
import { CampaignPanel } from "./components/SidePanels";
import { PackageListPage } from "./components/PackageListPage";
import { CampaignDashboardPage } from "./components/CampaignDashboardPage";
import { CampaignDetailPage } from "./components/CampaignDetailPage";
import { CreateCampaignPage } from "./components/CreateCampaignPage";
import { ApprovalQueuePage } from "./components/ApprovalQueuePage";
import { ApprovalDetailPage } from "./components/ApprovalDetailPage";
import { MasterSetupPage } from "./components/MasterSetupPage";
import { IconArrowLeft, IconWarning, IconClose } from "./icons";
import { Button } from "primereact/button";

const PREVIEW_BREAKPOINT = 1180;
const SCROLL_SPY_OFFSET = 150;

export default function App() {
  const [view, setView] = useState<
    "list" | "detail" | "master" | "campaign-list" | "campaign-detail" | "campaign-create" | "approval-list" | "approval-detail"
  >("list");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [approvalPlanCode, setApprovalPlanCode] = useState<string | null>(null);
  const [pendingScrollSection, setPendingScrollSection] = useState<string | null>(null);
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
  const [previewOn, setPreviewOn] = useState(false);
  const [vw, setVw] = useState(window.innerWidth);
  const [activeSectionId, setActiveSectionId] = useState("thumbnail");

  useEffect(() => {
    function onResize() {
      setVw(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  function openPackageAtSection(code: string, sectionId: string) {
    openPackage(code, "edit");
    setPendingScrollSection(sectionId);
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

  async function submitForApproval() {
    setSaving(true);
    try {
      const result = await api.setStatus(planCode!, "pending_approval");
      setPkg(result);
      setSaveError(null);
      setApprovalPlanCode(planCode);
      setView("approval-detail");
    } catch (e: any) {
      setSaveError(String(e.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function saveAndClose() {
    setSaving(true);
    try {
      await api.setStatus(planCode!, "draft");
      setSaveError(null);
      backToList();
    } catch (e: any) {
      setSaveError(String(e.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const content = useMemo(
    () => pkg?.channelContents.find((c) => c.channelType === activeChannel) ?? null,
    [pkg, activeChannel]
  );
  const availableChannels = useMemo(() => pkg?.channelContents.map((c) => c.channelType) ?? [], [pkg]);

  const sections = useMemo(() => (content ? sectionsForContent(content) : []), [content]);
  const reviewRowSections = useMemo(() => sections.slice(0, -1), [sections]);
  const allChannelsReady = useMemo(
    () => (pkg ? pkg.channelContents.every((c) => sectionsForContent(c).slice(0, -1).every((s) => s.ready)) : false),
    [pkg]
  );
  const submitDisabled = !allChannelsReady;

  useEffect(() => {
    if (sections.length === 0) return;
    function onScroll() {
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(`sec-${s.id}`);
        if (el && el.getBoundingClientRect().top - SCROLL_SPY_OFFSET <= 0) current = s.id;
      }
      setActiveSectionId(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  // Jump straight to a section after opening a package from an Approval comment's section pill.
  useEffect(() => {
    if (view !== "detail" || !pendingScrollSection || !content) return;
    const el = document.getElementById(`sec-${pendingScrollSection}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScrollSection(null);
  }, [view, pendingScrollSection, content]);

  function backToList() {
    setView("list");
    setPkg(null);
    setPlanCode(null);
    setMode("edit");
    setLoadError(null);
    setSaveError(null);
  }

  const previewAvailable = vw >= PREVIEW_BREAKPOINT;

  return (
    <div className="app">
      <Sidebar
        active={
          view === "master"
            ? "master"
            : view === "campaign-list"
            ? "campaign-list"
            : view === "campaign-detail"
            ? "campaign-detail"
            : view === "campaign-create"
            ? "campaign-create"
            : view === "approval-list" || view === "approval-detail"
            ? "approval"
            : "package"
        }
        onSelectPackageSetting={backToList}
        onSelectCampaignDashboard={() => {
          setView("campaign-list");
          setPkg(null);
          setPlanCode(null);
          setLoadError(null);
          setSaveError(null);
        }}
        onSelectAddCampaign={() => {
          setView("campaign-create");
          setPkg(null);
          setPlanCode(null);
          setLoadError(null);
          setSaveError(null);
        }}
        onSelectApproval={() => {
          setView("approval-list");
          setPkg(null);
          setPlanCode(null);
          setLoadError(null);
          setSaveError(null);
        }}
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

          {view === "campaign-list" && (
            <CampaignDashboardPage
              onOpenCampaign={(id) => {
                if (id === null) {
                  setView("campaign-create");
                } else {
                  setCampaignId(id);
                  setView("campaign-detail");
                }
              }}
            />
          )}

          {view === "campaign-detail" && (
            <CampaignDetailPage
              campaignId={campaignId}
              onBack={() => setView("campaign-list")}
              onCreated={(id) => setCampaignId(id)}
            />
          )}

          {view === "campaign-create" && <CreateCampaignPage onBack={() => setView("campaign-list")} />}

          {view === "approval-list" && (
            <ApprovalQueuePage
              onOpenPackage={(code) => {
                setApprovalPlanCode(code);
                setView("approval-detail");
              }}
            />
          )}

          {view === "approval-detail" && approvalPlanCode && (
            <ApprovalDetailPage
              planCode={approvalPlanCode}
              onBack={() => setView("approval-list")}
              onJumpToSection={(code, sectionId) => openPackageAtSection(code, sectionId)}
            />
          )}

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
                submitDisabled={submitDisabled}
                previewAvailable={previewAvailable}
                previewOn={previewOn}
                // Preview is being redesigned to match the real product page (pending field
                // mapping from the user) — icon stays visible but disabled for now.
                onTogglePreview={() => {}}
                onBack={backToList}
                onSaveDraft={() => withSaving(() => api.setStatus(planCode!, "draft"))}
                onSaveAndClose={saveAndClose}
                onSubmit={submitForApproval}
              />
              <ChannelTabs available={availableChannels} active={activeChannel} onSelect={setActiveChannel} />
              <SectionStepper sections={reviewRowSections} active={activeSectionId} />
              <div className={`body-scroll ${mode === "view" ? "read-only-lock" : ""}`}>
                <div className="col-main">
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

                  <div id="sec-key-features" className="section-anchor">
                    <KeyFeaturesCard
                      content={content}
                      onAdd={() => withSaving(() => api.addKeyFeature(planCode!, activeChannel))}
                      onEdit={(id, patch) => withSaving(() => api.updateKeyFeature(planCode!, activeChannel, id, patch))}
                      onRemove={(id) => withSaving(() => api.removeKeyFeature(planCode!, activeChannel, id))}
                      onContractualPayoutChange={(patch) => withSaving(() => api.setContractualPayout(planCode!, patch))}
                      onUploadIconAsset={(file) => withSaving(() => api.uploadIconAsset(planCode!, activeChannel, file))}
                      onRemoveIconAsset={() => withSaving(() => api.removeIconAsset(planCode!, activeChannel))}
                    />
                  </div>

                  {content.keyAdvantages && (
                    <div id="sec-key-advantages" className="section-anchor">
                      <KeyAdvantagesCard
                        header={content.keyAdvantages.header}
                        cards={content.keyAdvantages.cards}
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

                  <div id="sec-document" className="section-anchor">
                    <DocumentCard
                      documents={content.documents}
                      onUpload={(file, documentType) => withSaving(() => api.uploadDocument(planCode!, activeChannel, file, documentType))}
                      onChangeType={(id, documentType) => withSaving(() => api.updateDocumentType(planCode!, activeChannel, id, documentType))}
                      onRemove={(id) => withSaving(() => api.deleteDocument(planCode!, activeChannel, id))}
                    />
                  </div>

                </div>

                {previewAvailable && previewOn && (
                  <LivePreviewRail pkg={pkg} content={content} onClose={() => setPreviewOn(false)} />
                )}

                <div className="col-side">
                  <CampaignPanel
                    planCode={planCode!}
                    channelType={activeChannel}
                    onOpenCampaign={(id) => {
                      setCampaignId(id);
                      setView("campaign-detail");
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

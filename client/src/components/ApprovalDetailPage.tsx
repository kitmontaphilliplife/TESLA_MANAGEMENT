import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import type { ApprovalDetail, ChannelType, PackageDetail, PackageComment } from "../types";
import { api } from "../api";
import { ChannelTabs } from "./ChannelTabs";
import { sectionsForContent } from "./SectionsRail";
import { ApprovalChain } from "./ApprovalChain";
import { ApprovalHistoryPanel } from "./SidePanels";
import { IconArrowLeft, IconSend } from "../icons";

const STATUS_LABEL: Record<PackageDetail["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  inactive: "Inactive",
};
const STATUS_SEVERITY: Record<PackageDetail["status"], "secondary" | "warning" | "success"> = {
  draft: "secondary",
  pending_approval: "warning",
  active: "success",
  inactive: "secondary",
};

export function ApprovalDetailPage({
  planCode,
  onBack,
  onJumpToSection,
}: {
  planCode: string;
  onBack: () => void;
  onJumpToSection: (planCode: string, sectionId: string) => void;
}) {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>("ONLINE");
  const [commentSectionId, setCommentSectionId] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [resultNote, setResultNote] = useState<{ kind: "approved" | "changes"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    api.getApproval(planCode).then(setDetail).catch((e) => setError(String(e.message ?? e)));
    api.getPackage(planCode).then((p) => {
      setPkg(p);
      setActiveChannel((prev) => (p.channelContents.some((c) => c.channelType === prev) ? prev : p.channelContents[0]?.channelType ?? "ONLINE"));
    });
  }
  useEffect(reload, [planCode]);

  const availableChannels = useMemo(() => pkg?.channelContents.map((c) => c.channelType) ?? [], [pkg]);
  const activeContent = useMemo(() => pkg?.channelContents.find((c) => c.channelType === activeChannel) ?? null, [pkg, activeChannel]);
  const sectionOptions = useMemo(() => (activeContent ? sectionsForContent(activeContent) : []), [activeContent]);

  useEffect(() => {
    if (sectionOptions.length > 0 && !sectionOptions.some((s) => s.id === commentSectionId)) {
      setCommentSectionId(sectionOptions[0].id);
    }
  }, [sectionOptions, commentSectionId]);

  const activeStep = detail?.chain.find((s) => s.state === "active") ?? null;
  const openComments = detail?.comments.filter((c) => !c.resolved).length ?? 0;

  async function handlePostComment() {
    if (!commentBody.trim() || !commentSectionId) return;
    const section = sectionOptions.find((s) => s.id === commentSectionId);
    if (!section) return;
    setPosting(true);
    try {
      await api.addApprovalComment(planCode, { sectionId: section.id, sectionLabel: section.label, body: commentBody.trim() });
      setCommentBody("");
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolved(c: PackageComment) {
    await api.toggleCommentResolved(planCode, c.id, !c.resolved);
    reload();
  }

  async function handleDecision(decision: "approve" | "changes") {
    setDeciding(true);
    setError(null);
    try {
      await api.postApprovalDecision(planCode, decision);
      setResultNote(
        decision === "approve"
          ? { kind: "approved", text: activeStep?.role === "Compliance" ? "Approved. Package is now Active." : `Approved. Passed on to the next step.` }
          : { kind: "changes", text: `Sent back to the author with ${openComments} open comment${openComments === 1 ? "" : "s"}.` }
      );
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setDeciding(false);
    }
  }

  if (error) return <div className="loading-screen">เกิดข้อผิดพลาด: {error}</div>;
  if (!detail || !pkg) return <div className="loading-screen">กำลังโหลดข้อมูล…</div>;

  return (
    <div className="list-page">
      <div className="list-page-head">
        <div className="page-title-row">
          <Button icon={<IconArrowLeft />} outlined severity="secondary" rounded onClick={onBack} title="กลับไป Approval queue" />
          <div>
            <div className="title">
              Approval · {pkg.product.nameEn} <Tag severity={STATUS_SEVERITY[detail.status]} value={STATUS_LABEL[detail.status]} />
            </div>
            <div className="card-sub">
              Submitted {detail.updatedAt} by {detail.updatedBy}
            </div>
          </div>
        </div>
      </div>

      <div className="approval-grid">
        <div className="approval-main">
          <ApprovalChain chain={detail.chain} />

          <div className="card">
            <div className="card-head">
              <div className="card-head-left">
                <div className="card-title">Comments pinned to sections</div>
              </div>
              <Tag severity="warning" value={`${openComments} open`} />
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {availableChannels.length > 1 && <ChannelTabs available={availableChannels} active={activeChannel} onSelect={setActiveChannel} />}

              {detail.comments.length === 0 && <div className="search-empty">ยังไม่มี Comment</div>}
              {detail.comments.map((c) => (
                <div className="comment-thread" key={c.id}>
                  <div className="comment-thread-head">
                    <span className="comment-avatar">{c.author.slice(0, 1)}</span>
                    <span className="comment-author">{c.author}</span>
                    <span className="comment-time">{c.createdAt}</span>
                    <button className="review-row-link comment-section-pill" onClick={() => onJumpToSection(planCode, c.sectionId)}>
                      {c.sectionLabel} →
                    </button>
                  </div>
                  <div className="comment-body">{c.body}</div>
                  <button className="review-row-link" onClick={() => toggleResolved(c)}>
                    {c.resolved ? "Resolved" : "Mark resolved"}
                  </button>
                </div>
              ))}

              <div className="comment-composer">
                <Dropdown
                  className="select"
                  style={{ width: 220 }}
                  value={commentSectionId}
                  options={sectionOptions.map((s) => ({ label: s.label, value: s.id }))}
                  onChange={(e) => setCommentSectionId(e.value)}
                />
                <InputTextarea
                  className="textarea"
                  style={{ flex: 1 }}
                  rows={2}
                  placeholder="Add a comment for the author"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <Button icon={<IconSend />} label="Post" disabled={posting || !commentBody.trim()} onClick={handlePostComment} />
              </div>
            </div>
          </div>
        </div>

        <div className="approval-side">
          <div className="card">
            <div className="card-head">
              <div className="card-head-left">
                <div className="card-title">Your decision</div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="card-sub">
                {activeStep
                  ? `You are listed as ${activeStep.role} on this request. Approving passes it to the next step.`
                  : "This request has already been decided."}
              </div>
              <Button label="Approve and pass on" disabled={!activeStep || deciding} onClick={() => handleDecision("approve")} />
              <Button label="Request changes" outlined severity="danger" disabled={!activeStep || deciding} onClick={() => handleDecision("changes")} />
              {resultNote && <div className={`decision-result ${resultNote.kind}`}>{resultNote.text}</div>}
            </div>
          </div>

          <ApprovalHistoryPanel auditLog={detail.auditLog} />
        </div>
      </div>
    </div>
  );
}

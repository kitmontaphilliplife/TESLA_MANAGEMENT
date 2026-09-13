import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import type { ApprovalQueueItem, PackageDetail } from "../types";
import { api } from "../api";
import { IconCheckCircle } from "../icons";

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

export function ApprovalQueuePage({ onOpenPackage }: { onOpenPackage: (planCode: string) => void }) {
  const [items, setItems] = useState<ApprovalQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listApprovals().then(setItems).catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error) return <div className="loading-screen">เกิดข้อผิดพลาด: {error}</div>;
  if (!items) return <div className="loading-screen">กำลังโหลดข้อมูล…</div>;

  return (
    <div className="list-page">
      <div className="list-page-head">
        <div className="page-title-row">
          <div className="page-title-icon">
            <IconCheckCircle />
          </div>
          <div>
            <div className="title">Approval queue</div>
            <div className="card-sub">Package ที่ส่งขออนุมัติแล้ว — ตรวจสอบ, comment, และตัดสินใจ</div>
          </div>
        </div>
      </div>

      <div className="list-page-table card">
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title">Packages</div>
          </div>
        </div>
        <DataTable value={items} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} dataKey="planCode" emptyMessage="ยังไม่มี Package ที่ส่งขออนุมัติ" stripedRows scrollable>
          <Column
            header="Package"
            body={(r: ApprovalQueueItem) => (
              <div>
                <div>{r.nameTh}</div>
                <div className="upload-sub">
                  {r.planCode} · {r.category}
                </div>
              </div>
            )}
          />
          <Column header="Status" body={(r: ApprovalQueueItem) => <Tag severity={STATUS_SEVERITY[r.status]} value={STATUS_LABEL[r.status]} />} />
          <Column header="Current step" body={(r: ApprovalQueueItem) => r.currentStep ?? "-"} />
          <Column
            header="Updated"
            body={(r: ApprovalQueueItem) => (
              <div>
                <div>{r.updatedAt}</div>
                <div className="upload-sub">{r.updatedBy}</div>
              </div>
            )}
          />
          <Column header="Open comments" body={(r: ApprovalQueueItem) => (r.openComments > 0 ? <Tag severity="warning" value={r.openComments} /> : "-")} />
          <Column
            header="Action"
            body={(r: ApprovalQueueItem) => (
              <button className="review-row-link" onClick={() => onOpenPackage(r.planCode)}>
                Open →
              </button>
            )}
          />
        </DataTable>
      </div>
    </div>
  );
}

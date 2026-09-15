import { useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { PackageSummary } from "../types";
import { api } from "../api";
import { AddPackageModal } from "./AddPackageModal";
import { RowActionsMenu } from "./RowActionsMenu";
import { IconPackage, IconPlus, IconLayers, IconCheckCircle, IconEdit, IconClock, IconArchive, IconSend } from "../icons";

const STATUS_LABEL: Record<PackageSummary["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  inactive: "Inactive",
};
const STATUS_SEVERITY: Record<PackageSummary["status"], "secondary" | "warning" | "success"> = {
  draft: "secondary",
  pending_approval: "warning",
  active: "success",
  inactive: "secondary",
};

// PrimeReact's Dropdown treats a `null` option value ambiguously (it's also its own
// "nothing selected" sentinel), which made re-picking "ทั้งหมด" silently keep the previous
// filter instead of clearing it. Using a real sentinel string here and translating it to
// `null` ourselves in each onChange avoids that.
const ALL_VALUE = "__ALL__";
const CHANNEL_OPTIONS = [
  { label: "ทั้งหมด", value: ALL_VALUE },
  { label: "F2F", value: "F2F" },
  { label: "Online", value: "ONLINE" },
];
const STATUS_OPTIONS = [
  { label: "ทั้งหมด", value: ALL_VALUE },
  { label: "Draft", value: "draft" },
  { label: "Pending Approval", value: "pending_approval" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

interface PackageRow extends PackageSummary {
  searchName: string;
  channelGroupsStr: string;
}

export function PackageListPage({ onOpenPackage }: { onOpenPackage: (planCode: string, mode: "view" | "edit") => void }) {
  const [packages, setPackages] = useState<PackageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [filters, setFilters] = useState({
    planCode: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    searchName: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    category: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    channelGroupsStr: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null as string | null, matchMode: FilterMatchMode.EQUALS },
  });

  function reload() {
    api
      .listPackages()
      .then(setPackages)
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(reload, []);

  async function handleDelete(p: PackageSummary) {
    if (!confirm(`ลบ Package ${p.planCode} — ${p.nameEn} ?`)) return;
    try {
      await api.deletePackage(p.planCode);
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  async function handleSubmit(p: PackageSummary) {
    try {
      await api.setStatus(p.planCode, "pending_approval");
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  const rows: PackageRow[] = useMemo(
    () => (packages ?? []).map((p) => ({ ...p, searchName: `${p.nameTh} ${p.nameEn}`, channelGroupsStr: p.channelGroups.join(" ") })),
    [packages]
  );

  function selectStatus(status: PackageSummary["status"] | null) {
    setFilters((f) => ({ ...f, status: { ...f.status, value: status } }));
  }

  const counts = useMemo(() => {
    const base = { total: 0, active: 0, draft: 0, pending_approval: 0, inactive: 0 };
    (packages ?? []).forEach((p) => {
      base.total += 1;
      base[p.status] += 1;
    });
    return base;
  }, [packages]);

  if (error) return <div className="loading-screen">เกิดข้อผิดพลาด: {error}</div>;
  if (!packages) return <div className="loading-screen">กำลังโหลดข้อมูล…</div>;

  return (
    <div className="list-page package-list-page">
      <div className="list-page-head">
        <div className="page-title-row">
          <div className="page-title-icon">
            <IconPackage />
          </div>
          <div>
            <div className="title">
              Package List
            </div>
          </div>
        </div>
        <Button label="Add Package" icon={<IconPlus />} onClick={() => setShowAddModal(true)} />
      </div>

      <div className="stat-cards">
        <div
          className={`stat-card ${filters.status.value === null ? "stat-card-active" : ""}`}
          onClick={() => selectStatus(null)}
          role="button"
        >
          <div className="stat-icon"><IconLayers /></div>
          <div className="stat-body">
            <div className="stat-label">Total Package</div>
            <div className="stat-value">{counts.total}</div>
          </div>
        </div>
        <div
          className={`stat-card ${filters.status.value === "active" ? "stat-card-active" : ""}`}
          onClick={() => selectStatus("active")}
          role="button"
        >
          <div className="stat-icon"><IconCheckCircle /></div>
          <div className="stat-body">
            <div className="stat-label">Active</div>
            <div className="stat-value">{counts.active}</div>
          </div>
        </div>
        <div
          className={`stat-card ${filters.status.value === "draft" ? "stat-card-active" : ""}`}
          onClick={() => selectStatus("draft")}
          role="button"
        >
          <div className="stat-icon"><IconEdit /></div>
          <div className="stat-body">
            <div className="stat-label">Draft</div>
            <div className="stat-value">{counts.draft}</div>
          </div>
        </div>
        <div
          className={`stat-card ${filters.status.value === "pending_approval" ? "stat-card-active" : ""}`}
          onClick={() => selectStatus("pending_approval")}
          role="button"
        >
          <div className="stat-icon"><IconClock /></div>
          <div className="stat-body">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">{counts.pending_approval}</div>
          </div>
        </div>
        <div
          className={`stat-card ${filters.status.value === "inactive" ? "stat-card-active" : ""}`}
          onClick={() => selectStatus("inactive")}
          role="button"
        >
          <div className="stat-icon"><IconArchive /></div>
          <div className="stat-body">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{counts.inactive}</div>
          </div>
        </div>
      </div>

      <div className="list-page-table card">
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title">Package List</div>
          </div>
        </div>
        <DataTable
          value={rows}
          filters={filters}
          onFilter={(e) => setFilters(e.filters as typeof filters)}
          filterDisplay="row"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          removableSort
          sortField="updatedAt"
          sortOrder={-1}
          dataKey="planCode"
          emptyMessage="ไม่พบ Package ที่ตรงกับเงื่อนไข"
          stripedRows
        >
          <Column field="planCode" header="Plan Code" sortable filter filterPlaceholder="Search" showFilterMenu={false} style={{ width: "15%" }} />
          <Column
            field="searchName"
            header="Package name"
            sortable
            filter
            filterPlaceholder="Search"
            showFilterMenu={false}
            style={{ width: "28%" }}
            body={(p: PackageRow) => (
              <div>
                <div>{p.nameTh}</div>
                <div className="upload-sub">{p.nameEn}</div>
              </div>
            )}
          />
          <Column field="category" header="Category" sortable filter filterPlaceholder="Search" showFilterMenu={false} style={{ width: "20%" }} />
          <Column
            field="channelGroupsStr"
            header="Channel"
            filter
            showFilterMenu={false}
            style={{ width: "10%" }}
            body={(p: PackageRow) => p.channelGroups.join(" + ") || "-"}
            filterElement={(options) => (
              <FloatLabel>
                <Dropdown
                  inputId="filter-channel"
                  value={options.value ?? ALL_VALUE}
                  options={CHANNEL_OPTIONS}
                  onChange={(e) => options.filterApplyCallback(e.value === ALL_VALUE ? null : e.value)}
                  placeholder="ทั้งหมด"
                  style={{ minWidth: 110 }}
                />
                <label htmlFor="filter-channel">Channel</label>
              </FloatLabel>
            )}
          />
          <Column
            field="status"
            header="Status"
            sortable
            filter
            showFilterMenu={false}
            style={{ width: "10%" }}
            body={(p: PackageRow) => <Tag value={STATUS_LABEL[p.status]} severity={STATUS_SEVERITY[p.status]} />}
            filterElement={(options) => (
              <FloatLabel>
                <Dropdown
                  inputId="filter-status"
                  value={options.value ?? ALL_VALUE}
                  options={STATUS_OPTIONS}
                  onChange={(e) => options.filterApplyCallback(e.value === ALL_VALUE ? null : e.value)}
                  placeholder="ทั้งหมด"
                  style={{ minWidth: 140 }}
                />
                <label htmlFor="filter-status">Status</label>
              </FloatLabel>
            )}
          />
          <Column
            field="updatedAt"
            header="Updated"
            sortable
            style={{ width: "12%" }}
            body={(p: PackageRow) => (
              <div>
                <div>{p.updatedAt}</div>
                <div className="upload-sub">{p.updatedBy}</div>
              </div>
            )}
          />
          <Column
            header="Action"
            style={{ width: "5%" }}
            body={(p: PackageRow) => (
              <RowActionsMenu
                onView={() => onOpenPackage(p.planCode, "view")}
                onEdit={() => onOpenPackage(p.planCode, "edit")}
                onDelete={() => handleDelete(p)}
                canDelete={p.status === "draft" || p.status === "pending_approval" || p.status === "inactive"}
                extraActions={[
                  { label: "Submit", icon: <IconSend />, onClick: () => handleSubmit(p), disabled: p.status !== "draft" },
                ]}
              />
            )}
          />
        </DataTable>
      </div>

      {showAddModal && (
        <AddPackageModal
          onClose={() => setShowAddModal(false)}
          onCreated={(planCode) => {
            setShowAddModal(false);
            reload();
            onOpenPackage(planCode, "edit");
          }}
        />
      )}
    </div>
  );
}

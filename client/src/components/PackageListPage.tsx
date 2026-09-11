import { useEffect, useMemo, useState } from "react";
import type { PackageSummary } from "../types";
import { api } from "../api";
import { AddPackageModal } from "./AddPackageModal";

const STATUS_LABEL: Record<PackageSummary["status"], string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  inactive: "Inactive",
};
const STATUS_CLASS: Record<PackageSummary["status"], string> = {
  draft: "badge-gray",
  pending_approval: "badge-amber",
  active: "badge-green",
  inactive: "badge-gray",
};

type SortKey = "planCode" | "nameTh" | "category" | "status" | "updatedAt";

export function PackageListPage({ onOpenPackage }: { onOpenPackage: (planCode: string) => void }) {
  const [packages, setPackages] = useState<PackageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [filterCode, setFilterCode] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function reload() {
    api
      .listPackages()
      .then(setPackages)
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(reload, []);

  const filtered = useMemo(() => {
    if (!packages) return [];
    return packages.filter(
      (p) =>
        p.planCode.toLowerCase().includes(filterCode.toLowerCase()) &&
        (p.nameTh.includes(filterName) || p.nameEn.toLowerCase().includes(filterName.toLowerCase())) &&
        p.category.toLowerCase().includes(filterCategory.toLowerCase()) &&
        (!filterChannel || p.channelGroups.includes(filterChannel as "F2F" | "ONLINE")) &&
        (!filterStatus || p.status === filterStatus)
    );
  }, [packages, filterCode, filterName, filterCategory, filterChannel, filterStatus]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
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
    <div className="list-page">
      <div className="list-page-head">
        <div>
          <div className="title" style={{ fontSize: 22 }}>
            Package List
          </div>
          <div className="card-sub">รวม Package ที่เคย Set ไว้ทั้งหมด — Search / View / Create / Edit</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Package
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card stat-card-active">
          <div className="stat-label">Total Package</div>
          <div className="stat-value">{counts.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{counts.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Draft</div>
          <div className="stat-value">{counts.draft}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value">{counts.pending_approval}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactive</div>
          <div className="stat-value">{counts.inactive}</div>
        </div>
      </div>

      <div className="list-page-table card">
        <div className="card-head">
          <div className="card-head-left">
            <div className="card-title">Package List</div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("planCode")}>Plan Code {sortKey === "planCode" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => toggleSort("nameTh")}>Package name {sortKey === "nameTh" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => toggleSort("category")}>Category {sortKey === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th>Channel</th>
                <th onClick={() => toggleSort("status")}>Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => toggleSort("updatedAt")}>Updated {sortKey === "updatedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th>Action</th>
              </tr>
              <tr className="filter-row">
                <th>
                  <input className="input" placeholder="Search" value={filterCode} onChange={(e) => { setFilterCode(e.target.value); setPage(1); }} />
                </th>
                <th>
                  <input className="input" placeholder="Search" value={filterName} onChange={(e) => { setFilterName(e.target.value); setPage(1); }} />
                </th>
                <th>
                  <input className="input" placeholder="Search" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} />
                </th>
                <th>
                  <select className="select" value={filterChannel} onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}>
                    <option value="">ทั้งหมด</option>
                    <option value="F2F">F2F</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </th>
                <th>
                  <select className="select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="">ทั้งหมด</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.planCode}>
                  <td>{p.planCode}</td>
                  <td>
                    <div>{p.nameTh}</div>
                    <div className="upload-sub">{p.nameEn}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.channelGroups.join(" + ") || "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  </td>
                  <td>
                    <div>{p.updatedAt}</div>
                    <div className="upload-sub">{p.updatedBy}</div>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => onOpenPackage(p.planCode)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="search-empty" style={{ textAlign: "center", padding: 20 }}>
                    ไม่พบ Package ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <span className="upload-sub">
            แสดง {pageItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{(currentPage - 1) * pageSize + pageItems.length} จาก {sorted.length} รายการ
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              ‹
            </button>
            <span className="upload-sub">
              หน้า {currentPage} / {totalPages}
            </span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              ›
            </button>
            <select className="select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddPackageModal
          onClose={() => setShowAddModal(false)}
          onCreated={(planCode) => {
            setShowAddModal(false);
            reload();
            onOpenPackage(planCode);
          }}
        />
      )}
    </div>
  );
}

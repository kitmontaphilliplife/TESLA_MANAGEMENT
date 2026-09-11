import { useEffect, useMemo, useState } from "react";
import { MASTER_CODE_CATEGORIES, MASTER_CODE_CATEGORY_LABEL } from "../types";
import type { MasterCode, MasterCodeCategory } from "../types";
import { api } from "../api";
import { MasterCodeModal } from "./MasterCodeModal";
import { PackageMasterViewer } from "./PackageMasterViewer";
import { IconTrash } from "../icons";

type SidebarCategory = MasterCodeCategory | "package";

export function MasterSetupPage() {
  const [category, setCategory] = useState<SidebarCategory>("class_of_business");
  const [codes, setCodes] = useState<MasterCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterCode, setFilterCode] = useState("");
  const [filterNameEn, setFilterNameEn] = useState("");
  const [filterNameTh, setFilterNameTh] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterCode | null>(null);

  function reload() {
    if (category === "package") return;
    api
      .listMasterCodes(category)
      .then(setCodes)
      .catch((e) => setError(String(e.message ?? e)));
  }

  useEffect(() => {
    setCodes(null);
    setError(null);
    setFilterCode("");
    setFilterNameEn("");
    setFilterNameTh("");
    setPage(1);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filtered = useMemo(() => {
    if (!codes) return [];
    return codes.filter(
      (c) =>
        c.codeId.toLowerCase().includes(filterCode.toLowerCase()) &&
        c.nameEn.toLowerCase().includes(filterNameEn.toLowerCase()) &&
        c.nameTh.includes(filterNameTh)
    );
  }, [codes, filterCode, filterNameEn, filterNameTh]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isDistributionChannel = category === "distribution_channel";
  const hasParent = category === "line_of_business" || category === "product_type" || category === "sub_product_type";
  const extraCols = (isDistributionChannel ? 1 : 0) + (hasParent ? 1 : 0);

  async function handleSave(data: { codeId: string; nameEn: string; nameTh: string; channelGroup?: string }) {
    if (category === "package") return;
    if (editing) {
      await api.updateMasterCode(category, editing.id, { nameEn: data.nameEn, nameTh: data.nameTh, channelGroup: data.channelGroup });
    } else {
      await api.createMasterCode(category, data);
    }
    setModalOpen(false);
    setEditing(null);
    reload();
  }

  async function handleDelete(code: MasterCode) {
    if (category === "package") return;
    if (!confirm(`ลบ ${code.codeId} — ${code.nameEn} ?`)) return;
    await api.deleteMasterCode(category, code.id).catch((e) => setError(String(e.message ?? e)));
    reload();
  }

  return (
    <div className="list-page">
      <div className="list-page-head">
        <div>
          <div className="title" style={{ fontSize: 22 }}>
            Master Setup
          </div>
          <div className="card-sub">ข้อมูลอ้างอิง/รหัสมาตรฐาน — โครงตาม GIO Product Setup</div>
        </div>
      </div>

      <div className="master-setup-layout">
        <div className="master-setup-nav">
          {MASTER_CODE_CATEGORIES.map((c) => (
            <div key={c} className={`master-setup-nav-item ${c === category ? "active" : ""}`} onClick={() => setCategory(c)}>
              {MASTER_CODE_CATEGORY_LABEL[c]}
            </div>
          ))}
          <div className={`master-setup-nav-item ${category === "package" ? "active" : ""}`} onClick={() => setCategory("package")}>
            Package
          </div>
        </div>

        {category === "package" ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <PackageMasterViewer />
          </div>
        ) : (
        <div className="list-page-table card" style={{ margin: 0, flex: 1 }}>
          <div className="card-head">
            <div className="card-head-left">
              <div className="card-title">{MASTER_CODE_CATEGORY_LABEL[category]}</div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              + Add
            </button>
          </div>

          {error && <div className="readonly-note" style={{ margin: 16 }}>{error}</div>}

          {codes === null && !error && <div className="search-empty" style={{ padding: 20 }}>กำลังโหลด…</div>}

          {codes !== null && (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code ID</th>
                      <th>Name EN</th>
                      <th>Name TH</th>
                      {hasParent && <th>Parent</th>}
                      {isDistributionChannel && <th>Group</th>}
                      <th>Updated date</th>
                      <th>Updated by</th>
                      <th>Actions</th>
                    </tr>
                    <tr className="filter-row">
                      <th>
                        <input className="input" placeholder="Search" value={filterCode} onChange={(e) => { setFilterCode(e.target.value); setPage(1); }} />
                      </th>
                      <th>
                        <input className="input" placeholder="Search" value={filterNameEn} onChange={(e) => { setFilterNameEn(e.target.value); setPage(1); }} />
                      </th>
                      <th>
                        <input className="input" placeholder="Search" value={filterNameTh} onChange={(e) => { setFilterNameTh(e.target.value); setPage(1); }} />
                      </th>
                      {hasParent && <th />}
                      {isDistributionChannel && <th />}
                      <th />
                      <th />
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c) => (
                      <tr key={c.id}>
                        <td>{c.codeId}</td>
                        <td>{c.nameEn}</td>
                        <td>{c.nameTh}</td>
                        {hasParent && <td>{c.parentName ?? "-"}</td>}
                        {isDistributionChannel && (
                          <td>
                            <span className={`badge ${c.channelGroup === "UNMAPPED" ? "badge-amber" : "badge-blue"}`}>{c.channelGroup}</span>
                          </td>
                        )}
                        <td>{c.updatedAt}</td>
                        <td>{c.updatedBy}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditing(c);
                                setModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            <button className="icon-btn" onClick={() => handleDelete(c)} title="ลบ">
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={6 + extraCols} className="search-empty" style={{ textAlign: "center", padding: 20 }}>
                          ไม่พบข้อมูล
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination-bar">
                <span className="upload-sub">
                  Showing {pageItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{(currentPage - 1) * pageSize + pageItems.length} of {filtered.length} entries
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    ‹
                  </button>
                  <span className="upload-sub">
                    {currentPage} / {totalPages}
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
            </>
          )}
        </div>
        )}
      </div>

      {modalOpen && category !== "package" && (
        <MasterCodeModal
          category={category}
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

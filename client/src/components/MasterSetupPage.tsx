import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";
import { MASTER_CODE_CATEGORIES, MASTER_CODE_CATEGORY_LABEL } from "../types";
import type { MasterCode, MasterCodeCategory } from "../types";
import { api } from "../api";
import { MasterCodeModal } from "./MasterCodeModal";
import { PackageMasterViewer } from "./PackageMasterViewer";
import { RowActionsMenu } from "./RowActionsMenu";
import {
  IconPlus,
  IconMaster,
  IconLayers,
  IconBriefcase,
  IconShieldOutline,
  IconTag,
  IconUser,
  IconBroadcast,
  IconCard,
  IconPackage,
} from "../icons";

type SidebarCategory = MasterCodeCategory | "package";

const CATEGORY_ICON: Record<SidebarCategory, () => JSX.Element> = {
  class_of_business: IconLayers,
  line_of_business: IconBriefcase,
  coverage_type: IconShieldOutline,
  product_type: IconTag,
  sub_product_type: IconTag,
  occupation_class: IconUser,
  occupation_group: IconUser,
  occupation_position: IconUser,
  occupation: IconUser,
  distribution_channel: IconBroadcast,
  payment_mode: IconCard,
  payment_method: IconCard,
  package: IconPackage,
};

export function MasterSetupPage() {
  const [category, setCategory] = useState<SidebarCategory>("class_of_business");
  const [codes, setCodes] = useState<MasterCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    codeId: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    nameEn: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    nameTh: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterCode | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

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
    setFilters({
      codeId: { value: null, matchMode: FilterMatchMode.CONTAINS },
      nameEn: { value: null, matchMode: FilterMatchMode.CONTAINS },
      nameTh: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const isDistributionChannel = category === "distribution_channel";
  const hasParent = category === "line_of_business" || category === "product_type" || category === "sub_product_type";

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
        <div className="page-title-row">
          <div className="page-title-icon">
            <IconMaster />
          </div>
          <div>
            <div className="title">
              Master Setup
            </div>
            <div className="card-sub">ข้อมูลอ้างอิง/รหัสมาตรฐาน — โครงตาม GIO Product Setup</div>
          </div>
        </div>
      </div>

      <div className="master-setup-layout">
        <div className="master-setup-nav">
          {MASTER_CODE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <div key={c} className={`master-setup-nav-item ${c === category ? "active" : ""}`} onClick={() => setCategory(c)}>
                <Icon /> {MASTER_CODE_CATEGORY_LABEL[c]}
              </div>
            );
          })}
          <div className={`master-setup-nav-item ${category === "package" ? "active" : ""}`} onClick={() => setCategory("package")}>
            <IconPackage /> Package
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
              <div className="card-title">
                {(() => {
                  const Icon = CATEGORY_ICON[category];
                  return <Icon />;
                })()}
                {MASTER_CODE_CATEGORY_LABEL[category]}
              </div>
            </div>
            <Button
              label="Add"
              icon={<IconPlus />}
              onClick={() => {
                setEditing(null);
                setViewOnly(false);
                setModalOpen(true);
              }}
            />
          </div>

          {error && <div className="readonly-note" style={{ margin: 16 }}>{error}</div>}

          {codes === null && !error && <div className="search-empty" style={{ padding: 20 }}>กำลังโหลด…</div>}

          {codes !== null && (
            <DataTable
              value={codes}
              filters={filters}
              onFilter={(e) => setFilters(e.filters as typeof filters)}
              filterDisplay="row"
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              emptyMessage="ไม่พบข้อมูล"
              scrollable
              stripedRows
            >
              <Column field="codeId" header="Code ID" filter filterPlaceholder="Search" showFilterMenu={false} />
              <Column field="nameEn" header="Name EN" filter filterPlaceholder="Search" showFilterMenu={false} />
              <Column field="nameTh" header="Name TH" filter filterPlaceholder="Search" showFilterMenu={false} />
              {hasParent && <Column field="parentName" header="Parent" body={(c: MasterCode) => c.parentName ?? "-"} />}
              {isDistributionChannel && (
                <Column
                  field="channelGroup"
                  header="Group"
                  body={(c: MasterCode) => <Tag value={c.channelGroup} severity={c.channelGroup === "UNMAPPED" ? "warning" : "info"} />}
                />
              )}
              <Column field="updatedAt" header="Updated date" />
              <Column field="updatedBy" header="Updated by" />
              <Column
                header="Actions"
                body={(c: MasterCode) => (
                  <RowActionsMenu
                    onView={() => {
                      setEditing(c);
                      setViewOnly(true);
                      setModalOpen(true);
                    }}
                    onEdit={() => {
                      setEditing(c);
                      setViewOnly(false);
                      setModalOpen(true);
                    }}
                    onDelete={() => handleDelete(c)}
                  />
                )}
              />
            </DataTable>
          )}
        </div>
        )}
      </div>

      {modalOpen && category !== "package" && (
        <MasterCodeModal
          category={category}
          editing={editing}
          readOnly={viewOnly}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setViewOnly(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

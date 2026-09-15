import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import type { KeyFeatureMaster } from "../types";
import { api } from "../api";
import { RowActionsMenu } from "./RowActionsMenu";
import { KeyFeatureModal } from "./KeyFeatureModal";
import { IconPlus, IconStar } from "../icons";

export function KeyFeatureMasterViewer() {
  const [items, setItems] = useState<KeyFeatureMaster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ editing: KeyFeatureMaster | null; readOnly: boolean } | null>(null);

  function reload() {
    api.listKeyFeatureMasters().then(setItems).catch((e) => setError(String(e.message ?? e)));
  }
  useEffect(reload, []);

  async function refreshEditing() {
    const fresh = await api.listKeyFeatureMasters();
    setItems(fresh);
    setModal((m) => (m?.editing ? { ...m, editing: fresh.find((f) => f.id === m.editing!.id) ?? m.editing } : m));
  }

  async function handleSave(data: Parameters<typeof api.createKeyFeatureMaster>[0]) {
    return modal?.editing ? api.updateKeyFeatureMaster(modal.editing.id, data) : api.createKeyFeatureMaster(data);
  }

  function handleSaved() {
    setModal(null);
    reload();
  }

  async function handleDelete(item: KeyFeatureMaster) {
    if (!confirm(`ลบ Key Feature ${item.codeId} — ${item.feature} ?`)) return;
    try {
      await api.deleteKeyFeatureMaster(item.id);
      reload();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  return (
    <div className="list-page-table card" style={{ margin: 0 }}>
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">
            <IconStar /> Key Features
          </div>
          <div className="card-sub">รายการ Feature/Value มาตรฐานสำหรับใช้ในหน้า Package Configuration</div>
        </div>
        <Button label="Add" icon={<IconPlus />} onClick={() => setModal({ editing: null, readOnly: false })} />
      </div>

      {error && <div className="readonly-note" style={{ margin: 16 }}>{error}</div>}
      {items === null && !error && <div className="search-empty" style={{ padding: 20 }}>กำลังโหลด…</div>}

      {items !== null && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code ID</th>
                <th>Feature</th>
                <th>Name (EN)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.codeId}</td>
                  <td>{item.feature}</td>
                  <td>{item.detailFeature || "-"}</td>
                  <td>
                    <RowActionsMenu
                      onView={() => setModal({ editing: item, readOnly: true })}
                      onEdit={() => setModal({ editing: item, readOnly: false })}
                      onDelete={() => handleDelete(item)}
                    />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="search-empty">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <KeyFeatureModal
          editing={modal.editing}
          readOnly={modal.readOnly}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onSaved={handleSaved}
          onChanged={refreshEditing}
        />
      )}
    </div>
  );
}

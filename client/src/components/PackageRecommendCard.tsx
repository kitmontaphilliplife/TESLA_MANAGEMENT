import { useEffect, useState } from "react";
import type { RecommendedPackage } from "../types";
import { api } from "../api";
import { IconSearch, IconStar, IconGrip, IconGrid, IconPlus, IconTrash } from "../icons";

function PkgRow({
  p,
  draggable,
  action,
}: {
  p: RecommendedPackage;
  draggable?: boolean;
  action: React.ReactNode;
}) {
  return (
    <div
      className="pkg-reco-item"
      draggable={draggable}
      onDragStart={draggable ? (e) => e.dataTransfer.setData("text/plain", p.code) : undefined}
    >
      <span className="pkg-reco-grip"><IconGrip /></span>
      <div className="pkg-reco-item-body">
        <div className="pkg-reco-item-name">{p.nameEn}</div>
        <div className="pkg-reco-item-sub">{p.nameTh}</div>
        <div className="pkg-reco-item-code">{p.code}</div>
      </div>
      {action}
    </div>
  );
}

export function PackageRecommendCard({
  code,
  recommends,
  onChange,
}: {
  code: string;
  recommends: RecommendedPackage[];
  onChange: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecommendedPackage[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await api.searchProducts(code, query, "ONLINE");
      setResults(r.filter((p) => !recommends.some((rec) => rec.code === p.code)));
    }, 250);
    return () => clearTimeout(t);
  }, [query, code, recommends]);

  function addPackage(p: RecommendedPackage) {
    onChange([...recommends.map((r) => r.code), p.code]);
  }

  function removePackage(pCode: string) {
    onChange(recommends.filter((r) => r.code !== pCode).map((r) => r.code));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedCode = e.dataTransfer.getData("text/plain");
    const p = results.find((r) => r.code === droppedCode);
    if (p) addPackage(p);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconStar /> Package recommend</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div className="pkg-reco-col">
          <div className="search-inner">
            <IconSearch />
            <input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="pkg-reco-list">
            {results.length === 0 && <div className="search-empty">ไม่พบผลลัพธ์</div>}
            {results.map((p) => (
              <PkgRow
                key={p.code}
                p={p}
                draggable
                action={
                  <button className="icon-btn pkg-reco-action" onClick={() => addPackage(p)} title="เพิ่ม">
                    <IconPlus />
                  </button>
                }
              />
            ))}
          </div>
        </div>

        <div
          className={`pkg-display-col ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="kf-section-label">Package Display</div>
          {recommends.length === 0 ? (
            <div className="pkg-display-empty">
              <IconGrid />
              <span>Select items to display here</span>
            </div>
          ) : (
            <div className="pkg-reco-list">
              {recommends.map((r) => (
                <PkgRow
                  key={r.code}
                  p={r}
                  action={
                    <button className="icon-btn pkg-reco-action" onClick={() => removePackage(r.code)} title="ลบ">
                      <IconTrash />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

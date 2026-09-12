import { useEffect, useRef, useState } from "react";
import type { RecommendedPackage } from "../types";
import { api } from "../api";
import { IconClose, IconSearch, IconStar } from "../icons";

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
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await api.searchProducts(code, query);
      setResults(r.filter((p) => !recommends.some((rec) => rec.code === p.code)));
    }, 250);
    return () => clearTimeout(t);
  }, [query, code, recommends]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addPackage(p: RecommendedPackage) {
    onChange([...recommends.map((r) => r.code), p.code]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removePackage(pCode: string) {
    onChange(recommends.filter((r) => r.code !== pCode).map((r) => r.code));
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconStar /> Package recommend</div>
          <div className="card-sub">ค้นหาและเลือกสินค้าที่เกี่ยวข้อง (เลือกได้ 1 รายการขึ้นไป)</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="search-box" ref={boxRef}>
          <div className="search-inner">
            <IconSearch />
            <input
              placeholder="ค้นหาชื่อ Package หรือรหัสสินค้า…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && query.trim() && (
            <div className="search-dropdown">
              {results.length === 0 && <div className="search-empty">ไม่พบผลลัพธ์</div>}
              {results.map((p) => (
                <div className="search-dropdown-item" key={p.code} onClick={() => addPackage(p)}>
                  <b>
                    {p.nameTh} <span>({p.code})</span>
                  </b>
                  <span>{p.nameEn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="chip-row">
          {recommends.map((r) => (
            <span className="chip" key={r.code}>
              {r.nameTh}
              <button onClick={() => removePackage(r.code)} title="เอาออก">
                <IconClose />
              </button>
            </span>
          ))}
          {recommends.length === 0 && <span className="search-empty">ยังไม่ได้เลือก Package แนะนำ</span>}
        </div>
      </div>
    </div>
  );
}

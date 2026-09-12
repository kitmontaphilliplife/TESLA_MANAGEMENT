import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconKebab, IconEye, IconEdit, IconTrash, IconSend } from "../icons";

export function RowActionsMenu({
  onView,
  onEdit,
  onDelete,
  onSubmit,
  canDelete,
  canSubmit,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  canDelete: boolean;
  canSubmit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 4, left: r.right - 150 });
    }
    place();
    function onDocMouseDown(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <>
      <button ref={btnRef} className="icon-btn kebab-btn" onClick={() => setOpen((v) => !v)} title="ตัวเลือก">
        <IconKebab />
      </button>
      {open &&
        createPortal(
          <div className="row-actions-menu" ref={menuRef} style={{ position: "fixed", top: pos.top, left: pos.left }}>
            <button className="row-actions-item" onClick={() => pick(onView)}>
              <IconEye /> View
            </button>
            <button className="row-actions-item" onClick={() => pick(onEdit)}>
              <IconEdit /> Edit
            </button>
            <button className="row-actions-item" disabled={!canDelete} onClick={() => canDelete && pick(onDelete)}>
              <IconTrash /> Delete
            </button>
            <button className="row-actions-item" disabled={!canSubmit} onClick={() => canSubmit && pick(onSubmit)}>
              <IconSend /> Submit
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

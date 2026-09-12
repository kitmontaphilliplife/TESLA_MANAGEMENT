import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { IconKebab, IconEye, IconEdit, IconTrash } from "../icons";

export interface RowExtraAction {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  disabled?: boolean;
}

// Base row action menu used across every table in the app — View / Edit / Delete
// always come first, with per-table extras (e.g. Package List's "Submit") appended.
export function RowActionsMenu({
  onView,
  onEdit,
  onDelete,
  canDelete = true,
  extraActions = [],
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
  extraActions?: RowExtraAction[];
}) {
  const menuRef = useRef<Menu>(null);

  const items: MenuItem[] = [
    { label: "View", icon: <IconEye />, command: onView },
    { label: "Edit", icon: <IconEdit />, command: onEdit },
    { label: "Delete", icon: <IconTrash />, command: onDelete, disabled: !canDelete },
    ...extraActions.map((a) => ({ label: a.label, icon: a.icon, command: a.onClick, disabled: a.disabled })),
  ];

  return (
    <>
      <Button
        icon={<IconKebab />}
        rounded
        outlined
        severity="secondary"
        className="kebab-btn"
        onClick={(e) => menuRef.current?.toggle(e)}
        aria-haspopup
        title="ตัวเลือก"
      />
      <Menu model={items} popup ref={menuRef} className="row-actions-menu" popupAlignment="right" />
    </>
  );
}

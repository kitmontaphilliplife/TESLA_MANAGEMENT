import { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
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
  const menuRef = useRef<Menu>(null);

  const items: MenuItem[] = [
    { label: "View", icon: <IconEye />, command: onView },
    { label: "Edit", icon: <IconEdit />, command: onEdit },
    { label: "Delete", icon: <IconTrash />, command: onDelete, disabled: !canDelete },
    { label: "Submit", icon: <IconSend />, command: onSubmit, disabled: !canSubmit },
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

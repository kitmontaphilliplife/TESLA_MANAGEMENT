import { useState } from "react";
import { IconCampaign, IconChevronDown, IconDashboard, IconMaster, IconPackage, IconSeller } from "../icons";

export function Sidebar({
  active,
  onSelectPackageSetting,
  onSelectMasterSetup,
}: {
  active: "package" | "master";
  onSelectPackageSetting: () => void;
  onSelectMasterSetup: () => void;
}) {
  const [packageOpen, setPackageOpen] = useState(true);

  return (
    <div className="sidebar">
      <div className="side-logo">
        <div className="side-logo-mark">P</div>
        <div className="side-logo-text">TESLA Management</div>
      </div>
      <div className="side-eyebrow">Menu</div>
      <div className="side-nav">
        <div className="side-item">
          <IconDashboard />
          Dashboard
        </div>

        <div className={`side-item side-item-parent ${active === "package" ? "active" : ""}`} onClick={() => setPackageOpen((o) => !o)}>
          <IconPackage />
          <span style={{ flex: 1 }}>Package Setting</span>
          <IconChevronDown className={packageOpen ? "chevron-open" : ""} />
        </div>
        {packageOpen && (
          <div className="side-submenu">
            <div className={`side-subitem ${active === "package" ? "active" : ""}`} onClick={onSelectPackageSetting}>
              Package List
            </div>
          </div>
        )}

        <div className="side-item">
          <IconCampaign />
          Campaign Setting
        </div>
        <div className="side-item">
          <IconSeller />
          Seller List
        </div>
        <div className={`side-item ${active === "master" ? "active" : ""}`} onClick={onSelectMasterSetup} style={{ cursor: "pointer" }}>
          <IconMaster />
          Master Setup
        </div>
      </div>
    </div>
  );
}

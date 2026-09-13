import { useState } from "react";
import { IconCampaign, IconCheckCircle, IconChevronDown, IconList, IconMaster, IconPackage, IconPlus, IconSeller } from "../icons";

export function Sidebar({
  active,
  onSelectPackageSetting,
  onSelectCampaignDashboard,
  onSelectAddCampaign,
  onSelectApproval,
  onSelectMasterSetup,
}: {
  active: "package" | "campaign-list" | "campaign-detail" | "campaign-create" | "approval" | "master";
  onSelectPackageSetting: () => void;
  onSelectCampaignDashboard: () => void;
  onSelectAddCampaign: () => void;
  onSelectApproval: () => void;
  onSelectMasterSetup: () => void;
}) {
  const [packageOpen, setPackageOpen] = useState(true);
  const [campaignOpen, setCampaignOpen] = useState(true);
  const campaignActive = active === "campaign-list" || active === "campaign-detail" || active === "campaign-create";

  return (
    <div className="sidebar">
      <div className="side-logo">
        <div className="side-logo-mark">P</div>
        <div className="side-logo-text">TESLA Management</div>
      </div>
      <div className="side-eyebrow">Menu</div>
      <div className="side-nav">
        <div className={`side-item side-item-parent ${active === "package" ? "active" : ""}`} onClick={() => setPackageOpen((o) => !o)}>
          <IconPackage />
          <span style={{ flex: 1 }}>Package Setting</span>
          <IconChevronDown className={packageOpen ? "chevron-open" : ""} />
        </div>
        {packageOpen && (
          <div className="side-submenu">
            <div className={`side-subitem ${active === "package" ? "active" : ""}`} onClick={onSelectPackageSetting}>
              <IconList />
              Package List
            </div>
          </div>
        )}

        <div className={`side-item side-item-parent ${campaignActive ? "active" : ""}`} onClick={() => setCampaignOpen((o) => !o)}>
          <IconCampaign />
          <span style={{ flex: 1 }}>Campaign</span>
          <IconChevronDown className={campaignOpen ? "chevron-open" : ""} />
        </div>
        {campaignOpen && (
          <div className="side-submenu">
            <div className={`side-subitem ${active === "campaign-list" ? "active" : ""}`} onClick={onSelectCampaignDashboard}>
              <IconList />
              Campaign List
            </div>
            <div className={`side-subitem ${active === "campaign-create" ? "active" : ""}`} onClick={onSelectAddCampaign}>
              <IconPlus />
              Create Campaign
            </div>
          </div>
        )}

        <div className="side-item">
          <IconSeller />
          Seller List
        </div>
        <div className={`side-item ${active === "approval" ? "active" : ""}`} onClick={onSelectApproval} style={{ cursor: "pointer" }}>
          <IconCheckCircle />
          Approval
        </div>
        <div className={`side-item ${active === "master" ? "active" : ""}`} onClick={onSelectMasterSetup} style={{ cursor: "pointer" }}>
          <IconMaster />
          Master Setup
        </div>
      </div>
    </div>
  );
}

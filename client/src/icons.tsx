import type { CSSProperties } from "react";

const FEATURE_ICON_PATHS: Record<string, string> = {
  "sum-assured": "M12 2l2.9 6.3L21 9.3l-4.5 4.4L17.6 20 12 16.9 6.4 20l1.1-6.3L3 9.3l6.1-1 2.9-6.3z",
  clock: "M12 8v4l3 3M12 2a10 10 0 100 20 10 10 0 000-20z",
  calendar: "M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z",
  tax: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  refund: "M20 12a8 8 0 11-16 0 8 8 0 0116 0zM12 8v4l2.5 2.5",
  maturity: "M3 3v18h18M7 15l4-4 3 3 5-6",
  death: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  shield: "M12 2l8 3v6c0 5-3.4 8.4-8 11-4.6-2.6-8-6-8-11V5l8-3z",
};

export function FeatureIcon({ name }: { name: string }) {
  const d = FEATURE_ICON_PATHS[name] ?? FEATURE_ICON_PATHS.shield;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d={d} />
    </svg>
  );
}

const line = (style?: CSSProperties) => ({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, style });

export const IconDashboard = () => (
  <svg {...line()}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const IconPackage = () => (
  <svg {...line()}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);
export const IconCampaign = () => (
  <svg {...line()}>
    <path d="M3 11l18-7-7 18-2-8-9-3z" />
  </svg>
);
export const IconSeller = () => (
  <svg {...line()}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="18" cy="8.5" r="2.4" />
    <path d="M15.7 14.3c2.6.4 4.8 2.3 4.8 5.7" />
  </svg>
);
export const IconMaster = () => (
  <svg {...line()}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);
export const IconUpload = () => (
  <svg {...line()}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
export const IconDoc = () => (
  <svg {...line()}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
export const IconTrash = () => (
  <svg {...line()}>
    <path d="M4 7h16M9 7V4h6v3m-9 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
  </svg>
);
export const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconChevronDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} style={{ width: 14, height: 14, transition: "transform .15s" }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const IconWarning = () => (
  <svg {...line()}>
    <path d="M12 9v4M12 17h.01M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
  </svg>
);
export const IconKebab = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="12" cy="19" r="1.9" />
  </svg>
);
export const IconEye = () => (
  <svg {...line()}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEdit = () => (
  <svg {...line()}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
export const IconSend = () => (
  <svg {...line()}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconSave = () => (
  <svg {...line()}>
    <path d="M5 3h11l3 3v15H5V3z" />
    <path d="M8 3v6h8V3M8 21v-7h8v7" />
  </svg>
);
export const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const IconRefresh = () => (
  <svg {...line()}>
    <path d="M4 4v6h6" />
    <path d="M20 20v-6h-6" />
    <path d="M4.5 15a8 8 0 0014.9 2.5M19.5 9A8 8 0 004.6 6.5" />
  </svg>
);
export const IconLayers = () => (
  <svg {...line()}>
    <path d="M12 2l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5M3 16.5l9 5 9-5" />
  </svg>
);
export const IconBriefcase = () => (
  <svg {...line()}>
    <rect x="2.5" y="7" width="19" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M2.5 13h19" />
  </svg>
);
export const IconShieldOutline = () => (
  <svg {...line()}>
    <path d="M12 2l8 3.5v6c0 5-3.4 8.5-8 10.5-4.6-2-8-5.5-8-10.5v-6L12 2z" />
  </svg>
);
export const IconTag = () => (
  <svg {...line()}>
    <path d="M20 12.5L12.5 20a1.5 1.5 0 01-2.1 0l-7-7A1.5 1.5 0 013 12V4h8c.4 0 .8.2 1 .4l8 8a1.5 1.5 0 010 2.1z" />
    <circle cx="7.5" cy="8.5" r="1.5" />
  </svg>
);
export const IconUser = () => (
  <svg {...line()}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5S19.5 16 19.5 20" />
  </svg>
);
export const IconBroadcast = () => (
  <svg {...line()}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M8.3 15.7a5.4 5.4 0 010-7.4M15.7 8.3a5.4 5.4 0 010 7.4M5.2 18.8a9.8 9.8 0 010-13.6M18.8 5.2a9.8 9.8 0 010 13.6" />
  </svg>
);
export const IconCheckCircle = () => (
  <svg {...line()}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.3l2.4 2.4 4.6-5.4" />
  </svg>
);
export const IconClock = () => (
  <svg {...line()}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
export const IconArchive = () => (
  <svg {...line()}>
    <rect x="2.5" y="4" width="19" height="4.5" rx="1.2" />
    <path d="M4 8.7v9.3a2 2 0 002 2h12a2 2 0 002-2V8.7" />
    <path d="M10 13h4" />
  </svg>
);
export const IconImage = () => (
  <svg {...line()}>
    <rect x="2.5" y="4" width="19" height="16" rx="2.2" />
    <circle cx="8.5" cy="10" r="1.7" />
    <path d="M21.5 16.5l-5-5-9.5 9.5" />
  </svg>
);
export const IconStar = () => (
  <svg {...line()}>
    <path d="M12 2.5l2.9 6.3L21 9.8l-4.5 4.4 1.1 6.3L12 17.4l-5.6 3.1 1.1-6.3L3 9.8l6.1-1L12 2.5z" />
  </svg>
);
export const IconInfo = () => (
  <svg {...line()}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5h.01" />
  </svg>
);
export const IconCard = () => (
  <svg {...line()}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
    <path d="M2.5 9.5h19" />
    <path d="M6 14.5h4" />
  </svg>
);

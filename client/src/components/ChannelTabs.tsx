import type { ChannelType } from "../types";
import { IconWarning } from "../icons";

const LABEL: Record<ChannelType, string> = { F2F: "TESLA-B · F2F", ONLINE: "TESLA-C · Online" };

export function ChannelTabs({
  available,
  active,
  onSelect,
}: {
  available: ChannelType[];
  active: ChannelType;
  onSelect: (c: ChannelType) => void;
}) {
  if (available.length <= 1) return null;
  return (
    <div className="channel-tabs">
      {available.map((c) => (
        <button key={c} className={`channel-tab ${c === active ? "active" : ""}`} onClick={() => onSelect(c)}>
          {LABEL[c]}
        </button>
      ))}
    </div>
  );
}

export function UnmappedChannelsWarning({ unmapped }: { unmapped: { channelCode: string; nameEn: string }[] }) {
  if (unmapped.length === 0) return null;
  return (
    <div className="readonly-note">
      <IconWarning />
      <p>
        Product นี้มี distribution channel ที่ยังไม่ได้จัดกลุ่ม F2F/Online:{" "}
        {unmapped.map((u) => `${u.nameEn} (${u.channelCode})`).join(", ")} — เนื้อหาของ channel เหล่านี้ยังตั้งค่าไม่ได้ จนกว่า Product/Master
        team จะยืนยันกลุ่ม
      </p>
    </div>
  );
}

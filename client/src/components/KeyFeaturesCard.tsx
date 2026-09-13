import { useEffect, useState } from "react";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import type { ChannelContent, KeyFeature, KeyFeatureMaster } from "../types";
import { FeatureIcon, IconTrash, IconShieldOutline, IconGrid, IconList } from "../icons";
import { DebouncedInput } from "./DebouncedInput";
import { ImageUploadBox } from "./ImageUploadBox";
import { api } from "../api";

const MAX_FEATURES = 8;

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function KeyFeaturesCard({
  content,
  onAdd,
  onEdit,
  onRemove,
  onContractualPayoutChange,
  onUploadIconAsset,
  onRemoveIconAsset,
}: {
  content: ChannelContent;
  onAdd: () => void;
  onEdit: (id: string, patch: Partial<Pick<KeyFeature, "topic" | "value" | "iconImage">>) => void;
  onRemove: (id: string) => void;
  onContractualPayoutChange: (patch: Partial<{ value: string; active: boolean }>) => void;
  onUploadIconAsset: (file: File) => Promise<void>;
  onRemoveIconAsset: () => Promise<void>;
}) {
  const isOnline = content.channelType === "ONLINE";
  const features = content.keyFeatures;
  const [masters, setMasters] = useState<KeyFeatureMaster[]>([]);

  useEffect(() => {
    api.listKeyFeatureMasters().then(setMasters).catch(() => setMasters([]));
  }, []);

  // Master Setup > Key Features, filtered to this section/channel — used as the topic
  // dropdown's options; picking one also fills the value + row icon from the same entry.
  const topicOptions = masters
    .filter((m) => m.section === "key_features" && m.system === content.channelType)
    .map((m) => ({ label: m.feature, value: m.feature }));

  // A topic already picked on another row can't be picked again — keeps the row's own
  // current selection visible/selectable, only excludes topics taken elsewhere.
  function topicOptionsFor(current: KeyFeature) {
    const usedElsewhere = new Set(features.filter((f) => f.id !== current.id && f.topic).map((f) => f.topic));
    return topicOptions.filter((o) => !usedElsewhere.has(o.value));
  }

  function handleTopicChange(f: KeyFeature, topic: string) {
    // Same feature name can exist under both key_features and key_advantages (or the other
    // channel) — must match on section+system too, or this can pick up a different
    // section's master row (and its icon) that just happens to share the same label.
    const master = masters.find((m) => m.feature === topic && m.section === "key_features" && m.system === content.channelType);
    if (master) {
      onEdit(f.id, { topic, value: master.detailFeature, iconImage: master.iconImage });
    } else {
      onEdit(f.id, { topic });
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title"><IconShieldOutline /> Key Features of the Insurance Plan</div>
        </div>
        <Tag severity="info" value={`${features.length} แถว`} />
      </div>
      <div className="card-body">
        <div className="kf-layout">
          {isOnline && (
            <div className="kf-icon-asset-col">
              <div className="kf-section-label"><IconGrid /> Icon Asset</div>
              <ImageUploadBox
                image={content.iconAsset}
                width={236}
                height={236}
                sublabel="Recommended 800x600px (JPG/PNG)"
                onUpload={onUploadIconAsset}
                onRemove={onRemoveIconAsset}
              />
            </div>
          )}

          <div className="kf-rows-col">
            <div className="kf-section-label"><IconList /> Key Features</div>

            {features.map((f, i) => (
              <div className="kf-row" key={f.id}>
                {isOnline && (
                  <div className="kf-icon">
                    {f.iconImage ? <img src={`/uploads/${f.iconImage}`} alt="" /> : <FeatureIcon name={f.icon} />}
                  </div>
                )}
                <div className="kf-fields-row">
                  <Dropdown
                    className="select kf-topic-select"
                    value={f.topic}
                    options={topicOptionsFor(f)}
                    onChange={(e) => handleTopicChange(f, e.value)}
                    placeholder={`${ordinal(i + 1)} Select topic`}
                  />
                  <input
                    className="input kf-value-field kf-value-readonly"
                    value={f.value}
                    readOnly
                    title="ค่านี้มาจาก Master Setup — แก้ไขได้ที่ Master Setup เท่านั้น"
                  />
                </div>
                <div className="kf-actions">
                  <button className="icon-btn kf-delete-btn" onClick={() => onRemove(f.id)} title="ลบแถวนี้">
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}

            {isOnline && content.contractualPayout && (
              <div className="kf-payout-row">
                <div className="kf-payout-text">
                  <div className="kf-payout-label">รับเงินคืนทุกปี</div>
                  <DebouncedInput
                    className="input"
                    value={content.contractualPayout.value}
                    onCommit={(v) => onContractualPayoutChange({ value: v })}
                    disabled={!content.contractualPayout.active}
                  />
                </div>
                <div className="toggle-row">
                  <span className="toggle-label">Active</span>
                  <button
                    className={`toggle ${content.contractualPayout.active ? "on" : ""}`}
                    onClick={() => onContractualPayoutChange({ active: !content.contractualPayout!.active })}
                  >
                    <span className="knob" />
                  </button>
                </div>
              </div>
            )}

            <button className="dashed-btn" onClick={onAdd} disabled={features.length >= MAX_FEATURES}>
              {features.length >= MAX_FEATURES ? `เพิ่มได้สูงสุด ${MAX_FEATURES} รายการ` : "+ Add Key feature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

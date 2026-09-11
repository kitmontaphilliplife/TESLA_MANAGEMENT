import { db } from "./db.js";

export type ChannelGroup = "F2F" | "ONLINE" | "UNMAPPED";

/**
 * Looks up master_codes (category = 'distribution_channel') for this channel's group —
 * editable from the Master Setup screen so the Product/Master team can correct or extend
 * it without a redeploy. A channel code that isn't in the table yet (a brand new CHNxx
 * from master) falls back to a naming heuristic — "contains Online" — but should still
 * be confirmed and added explicitly via Master Setup.
 */
export function classifyChannel(channelCode: string, nameEn: string): ChannelGroup {
  const row = db
    .prepare(`SELECT channel_group FROM master_codes WHERE category = 'distribution_channel' AND code_id = ?`)
    .get(channelCode) as { channel_group: ChannelGroup | null } | undefined;
  if (row?.channel_group) return row.channel_group;
  return /online/i.test(nameEn) ? "ONLINE" : "F2F";
}

export interface ChannelClassification {
  groups: Set<ChannelGroup>;
  unmapped: { channelCode: string; nameEn: string }[];
}

export function classifyProductChannels(
  channelCodes: { code: string; nameEn: string }[]
): ChannelClassification {
  const groups = new Set<ChannelGroup>();
  const unmapped: { channelCode: string; nameEn: string }[] = [];
  for (const c of channelCodes) {
    const group = classifyChannel(c.code, c.nameEn);
    groups.add(group);
    if (group === "UNMAPPED") unmapped.push({ channelCode: c.code, nameEn: c.nameEn });
  }
  return { groups, unmapped };
}

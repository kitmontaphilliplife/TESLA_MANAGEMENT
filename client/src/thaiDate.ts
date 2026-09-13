// Thai UI convention: show dates in Buddhist-era DD/MM/YYYY. Native <input type=date> always
// stores/edits the value as Gregorian ISO, so this is only ever used for read-only display.
export function toBuddhist(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${Number(y) + 543}`;
}

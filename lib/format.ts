// Formatting and timezone helpers.
//
// The database stores UTC. The interface shows WIB, which is UTC+7 with no
// daylight saving, so a fixed offset is correct and simpler than a timezone
// library.

export const WIB_TZ = "Asia/Jakarta";
const WIB_OFFSET = "+07:00";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const signedMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return money.format(value);
}

export function formatSignedMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return signedMoney.format(value);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

// Colour for a P/L figure. Money colour is the only place green and red appear.
export function pnlTone(value: number): "profit" | "loss" | "flat" {
  if (value > 0) return "profit";
  if (value < 0) return "loss";
  return "flat";
}

export function pnlClass(value: number): string {
  const tone = pnlTone(value);
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return "text-flat";
}

// "2026-10-11" for the WIB calendar day the instant belongs to.
export function dayKeyWib(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: WIB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatDateWib(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTimeWib(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTimeWib(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// "<input type="datetime-local">" value (WIB wall clock) to a UTC instant.
export function wibInputToUtcIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const parsed = new Date(`${local}:00${WIB_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

// UTC instant to a datetime-local value in WIB wall clock.
export function utcIsoToWibInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: WIB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

export function formatDuration(fromIso: string, toIso: string | null): string {
  if (!toIso) return "masih terbuka";
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "-";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
  const days = Math.floor(hours / 24);
  return `${days} hari ${hours % 24} jam`;
}

// Turns "" or garbage into null so numeric columns stay clean.
export function toNullableNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const parsed = Number(text.replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

export function toNumber(value: FormDataEntryValue | null, fallback = 0): number {
  return toNullableNumber(value) ?? fallback;
}

export function toNullableText(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

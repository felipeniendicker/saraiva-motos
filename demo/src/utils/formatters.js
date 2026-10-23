export function formatCurrency(value) {
  const numericValue = Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;
const BUSINESS_ZONE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
const BUSINESS_DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: BUSINESS_TIME_ZONE
});
const BUSINESS_DATE = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: BUSINESS_TIME_ZONE
});
const CIVIL_DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const ISO_CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const BUSINESS_MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: BUSINESS_TIME_ZONE
});
const BUSINESS_MONTH_VALUE = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  timeZone: BUSINESS_TIME_ZONE
});

function businessZoneOffset(timestamp) {
  const parts = Object.fromEntries(
    BUSINESS_ZONE_PARTS.formatToParts(new Date(timestamp))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  );
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - Math.floor(timestamp / 1000) * 1000;
}

function parseLocalBusinessDateTime(value) {
  const match = value.match(LOCAL_DATE_TIME);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const wallClockAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds.padEnd(3, "0"))
  );
  let instant = wallClockAsUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = wallClockAsUtc - businessZoneOffset(instant);
  }
  return new Date(instant);
}

export function parseDateTime(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string" && !TIME_ZONE_SUFFIX.test(value)) {
    const localDate = parseLocalBusinessDateTime(value);
    if (localDate) return localDate;
  }
  return new Date(value);
}

export function formatDateTime(value, fallback = "Não informado") {
  if (!value) return fallback;
  const date = parseDateTime(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return BUSINESS_DATE_TIME.format(date);
}

export function formatDate(value, fallback = "Não informado") {
  if (!value) return fallback;
  const date = parseDateTime(value);
  return Number.isNaN(date.getTime()) ? fallback : BUSINESS_DATE.format(date);
}

export function formatCivilDate(value, fallback = "Não informado") {
  if (!value) return fallback;
  const match = String(value).match(ISO_CIVIL_DATE);
  if (!match) return fallback;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(date.getTime()) ? fallback : CIVIL_DATE.format(date);
}

export function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatPlate(value) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);

  if (cleaned.length <= 3) {
    return cleaned;
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

export function formatMonthLabel(value) {
  if (!value) {
    return "Mês atual";
  }

  const [year, month] = value.split("-");
  return BUSINESS_MONTH_LABEL.format(new Date(Date.UTC(Number(year), Number(month) - 1, 15, 12)));
}

export function getCurrentMonthValue(now = new Date()) {
  const parts = Object.fromEntries(
    BUSINESS_MONTH_VALUE.formatToParts(now)
      .filter(({ type }) => type === "year" || type === "month")
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}`;
}

export function getMonthFromDate(dateString) {
  if (!dateString) {
    return "";
  }

  return dateString.slice(0, 7);
}

export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isSameMonth(dateString, monthValue) {
  return getMonthFromDate(dateString) === monthValue;
}

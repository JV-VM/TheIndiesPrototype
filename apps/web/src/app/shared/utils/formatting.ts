const byteFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1
});

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto"
});

const byteUnits = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${Math.round(value)} B`;
  }

  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    byteUnits.length - 1
  );
  const scaled = value / 1024 ** exponent;

  return `${byteFormatter.format(scaled)} ${byteUnits[exponent]}`;
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return timestampFormatter.format(date);
}

export function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "Pending";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);

  if (Math.abs(deltaSeconds) < 60) {
    return relativeFormatter.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (Math.abs(deltaMinutes) < 60) {
    return relativeFormatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return relativeFormatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return relativeFormatter.format(deltaDays, "day");
}

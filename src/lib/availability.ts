export type AvailabilityWindow = {
  timezone?: string;
  availableWeekdays?: number[];
  availableFrom?: string;
  availableTo?: string;
};

export type AvailabilityCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parse "HH:mm" or "H:mm" into minutes from midnight. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Local weekday (0=Sun) and minutes-from-midnight in a given IANA timezone. */
export function zonedWeekdayAndMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value || "Mon";
  let hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");

  // Some environments emit "24" for midnight
  if (hour === 24) hour = 0;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[weekdayShort] ?? 1,
    minutes: hour * 60 + minute,
  };
}

export function formatWeekdays(days: number[]) {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] || String(d))
    .join(", ");
}

/**
 * Validate that `start` falls inside the recruiter's configured weekday/time window
 * in their timezone. End time is not required for the window check (start-based).
 */
export function isWithinAvailability(
  start: Date,
  availability: AvailabilityWindow
): AvailabilityCheckResult {
  const timezone = availability.timezone || "America/New_York";
  const weekdays = availability.availableWeekdays?.length
    ? availability.availableWeekdays
    : [1, 2, 3, 4, 5];
  const from = availability.availableFrom || "09:00";
  const to = availability.availableTo || "17:00";

  const fromMins = parseTimeToMinutes(from);
  const toMins = parseTimeToMinutes(to);
  if (fromMins === null || toMins === null) {
    return { ok: false, reason: "Recruiter availability hours are misconfigured" };
  }
  if (fromMins >= toMins) {
    return { ok: false, reason: "Recruiter availability window is invalid (from >= to)" };
  }

  let local: { weekday: number; minutes: number };
  try {
    local = zonedWeekdayAndMinutes(start, timezone);
  } catch {
    return { ok: false, reason: `Invalid recruiter timezone: ${timezone}` };
  }

  if (!weekdays.includes(local.weekday)) {
    return {
      ok: false,
      reason: `Recruiter is unavailable on ${WEEKDAY_LABELS[local.weekday]} (${timezone}). Available: ${formatWeekdays(weekdays)}`,
    };
  }

  if (local.minutes < fromMins || local.minutes >= toMins) {
    return {
      ok: false,
      reason: `Selected time is outside recruiter hours ${from}–${to} (${timezone})`,
    };
  }

  return { ok: true };
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && bStart < aEnd;
}

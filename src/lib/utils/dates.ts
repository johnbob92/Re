import {
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  subDays,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy h:mm a");
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

export function ageFromBirthday(birthday?: Date | string | null) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function minutesUntil(date: Date | string) {
  return differenceInMinutes(new Date(date), new Date());
}

export function canJoinInterview(scheduledAt: Date | string) {
  const mins = minutesUntil(scheduledAt);
  return mins <= 5 && mins >= -120;
}

export function shouldSendAutoReminder(scheduledAt: Date | string, lastSent?: Date | string | null) {
  const mins = minutesUntil(scheduledAt);
  if (mins > 15 || mins < 0) return false;
  if (!lastSent) return true;
  return isBefore(new Date(lastSent), subDays(new Date(), 0));
}

export function weekRange(date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function isWithinLastDays(date: Date | string, days: number) {
  const d = new Date(date);
  return isAfter(d, subDays(new Date(), days));
}

export function isWithinLastMonths(date: Date | string, months: number) {
  const d = new Date(date);
  return isAfter(d, subMonths(new Date(), months));
}

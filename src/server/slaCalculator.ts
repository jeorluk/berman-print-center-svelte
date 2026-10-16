import { type PrintJob } from "./schema";
import { getConfig, debugLog, SHEETS } from "./utils";
import { getCachedConfigBundle } from "./cacheAndData";

export interface SlaRule {
  COLOR: string;
  FINISHING: string;
  "MAX COPIES": number | string;
  "STANDARD SLA HOURS": number | string;
}

export interface ParsedTime {
  h: number;
  m: number;
}

/**
 * Helper to fetch SLA rules directly from the cached config bundle.
 */
export function getCachedSlaRules(): SlaRule[] {
  const bundle = getCachedConfigBundle();
  return (bundle[SHEETS.SLA_RULES] || []) as SlaRule[];
}

/**
 * Helper to fetch holiday rows directly from the cached config bundle.
 */
export function getCachedHolidays(): Record<string, any>[] {
  const bundle = getCachedConfigBundle();
  return bundle[SHEETS.HOLIDAYS] || [];
}

/**
 * Calculates the Service Level Agreement (SLA) due date for a print job
 * based on rules, business hours, and future-dated overrides.
 */
export function calculateSlaDue(job: Partial<PrintJob>): Date {
  const copies = Number(job.copies || 0);
  const isColor = Boolean(job.color);
  const colorStr = isColor ? "Color" : "B&W";

  // Determine finishing string based on boolean or specific properties
  const hasFinishing = Boolean(
    job.lamination ||
    job.cut ||
    (job.staple && job.staple !== "None") ||
    (job.binding && job.binding !== "None") ||
    (job.hole_punch && job.hole_punch !== "None"),
  );
  const finishingStr = hasFinishing ? "Yes" : "None";

  const priority = String(job.priority || "Standard");
  const neededByVal = job.needed_by_date;

  const rules = getCachedSlaRules();

  const matches = rules.filter((x) => {
    const c = String(x["COLOR"] || "Any");
    const f = String(x["FINISHING"] || "Any");
    const max = Number(x["MAX COPIES"] || 999999);

    return (
      (c === "Any" || c.toLowerCase() === colorStr.toLowerCase()) &&
      (f === "Any" || f.toLowerCase() === finishingStr.toLowerCase()) &&
      copies <= max
    );
  });

  let slaHours = 24; // Default fallback
  if (matches.length > 0) {
    matches.sort(
      (a, b) =>
        Number(a["STANDARD SLA HOURS"]) - Number(b["STANDARD SLA HOURS"]),
    );
    slaHours = Number(matches[0]["STANDARD SLA HOURS"]);
  }

  const submittedAt = job.submitted_at
    ? new Date(job.submitted_at)
    : new Date();
  const standardDue = addBusinessHours(submittedAt, slaHours);

  // IF IT'S A NEEDED-BY JOB (e.g. Future / Rush with specified target date):
  if ((priority === "Future" || priority === "Rush") && neededByVal) {
    const neededDate = new Date(neededByVal);
    if (!isNaN(neededDate.getTime())) {
      const startT = parseTime(getConfig("Business Start") || "08:00");
      neededDate.setHours(startT.h, startT.m, 0, 0);

      debugLog(
        `[SLA Audit] Ticket evaluated. ` +
          `Input variables -> Priority: "${priority}", Copies: ${copies}, Color: "${colorStr}", Finishing: "${finishingStr}", Needed By: "${neededByVal || "None"}". ` +
          `Rules matched: ${matches.length > 0 ? "Yes (" + matches.length + " rule(s) found)" : "No (Used 24h fallback)"}. ` +
          `Selected SLA hours: ${slaHours}h. ` +
          `Final calculated SLA Due date: ${neededDate.toLocaleString()} (Overridden by Needed-By timeline)`,
      );
      return neededDate;
    }
  }

  debugLog(
    `[SLA Audit] Ticket evaluated. ` +
      `Input variables -> Priority: "${priority}", Copies: ${copies}, Color: "${colorStr}", Finishing: "${finishingStr}", Needed By: "${neededByVal || "None"}". ` +
      `Rules matched: ${matches.length > 0 ? "Yes (" + matches.length + " rule(s) found)" : "No (Used 24h fallback)"}. ` +
      `Selected SLA hours: ${slaHours}h. ` +
      `Final calculated SLA Due date: ${standardDue.toLocaleString()}`,
  );

  return standardDue;
}

/**
 * Iteratively adds a specified number of business hours to a starting date,
 * skipping weekends, registered holidays, and non-business operating hours.
 */
export function addBusinessHours(start: Date | string, hours: number): Date {
  let d = new Date(start);
  let remaining = Number(hours);

  const startT = parseTime(getConfig("Business Start") || "08:00");
  const endT = parseTime(getConfig("Business End") || "16:00");
  const fridayT = parseTime(getConfig("Friday End") || "13:00");

  while (remaining > 0) {
    if (isHoliday(d) || isWeekend(d)) {
      d = nextBusinessDay(d);
      d.setHours(startT.h, startT.m, 0, 0);
      continue;
    }

    const endTday = d.getDay() === 5 ? fridayT : endT;
    const dayStart = new Date(d);
    dayStart.setHours(startT.h, startT.m, 0, 0);

    const dayEnd = new Date(d);
    dayEnd.setHours(endTday.h, endTday.m, 0, 0);

    if (d < dayStart) d = new Date(dayStart);

    if (d >= dayEnd) {
      d = nextBusinessDay(d);
      d.setHours(startT.h, startT.m, 0, 0);
      continue;
    }

    const available = (dayEnd.getTime() - d.getTime()) / 3600000;
    const use = Math.min(remaining, available);

    d = new Date(d.getTime() + use * 3600000);
    remaining -= use;

    if (remaining > 0) {
      d = nextBusinessDay(d);
      d.setHours(startT.h, startT.m, 0, 0);
    }
  }

  return d;
}

/**
 * Parses a time string formatted as 'HH:MM' into hour and minute numbers.
 */
export function parseTime(s: string): ParsedTime {
  const p = String(s).split(":").map(Number);
  return { h: p[0] || 0, m: p[1] || 0 };
}

/**
 * Checks whether a given date falls on a weekend (Saturday or Sunday).
 */
export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

/**
 * Checks whether a given date falls on a registered holiday.
 */
export function isHoliday(d: Date): boolean {
  const holidays = getCachedHolidays();
  if (!holidays || holidays.length === 0) return false;

  const tz = getConfig("Timezone") || "America/New_York";
  const key = Utilities.formatDate(d, tz, "yyyy-MM-dd");

  return holidays.some((row: any) => {
    const holidayDateVal = row["DATE"] || row["date"];
    if (!holidayDateVal) return false;

    return (
      Utilities.formatDate(new Date(holidayDateVal), tz, "yyyy-MM-dd") === key
    );
  });
}

/**
 * Advances a given date forward by one calendar day until it lands on a valid business day.
 */
export function nextBusinessDay(d: Date): Date {
  const x = new Date(d);
  do {
    x.setDate(x.getDate() + 1);
  } while (isWeekend(x) || isHoliday(x));
  return x;
}

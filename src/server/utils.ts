import { COLUMN_INDEX } from "./schema";

/** Global debug flag */
export const DEBUG = true;

/** Sheet name constants */
export const SHEETS = {
  JOBS: "Jobs",
  CONFIG: "Config",
  SLA_RULES: "SLA_Rules",
  HOLIDAYS: "Holidays",
} as const;

/**
 * Conditionally logs messages to the console when DEBUG is enabled.
 */
export function debugLog(message: string): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Retrieves a configuration value by key from the Config sheet.
 */
export function getConfig(key: string): string {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      SHEETS.CONFIG,
    );
    if (!sh) return "";

    const values = sh.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (
        String(values[i][0]).trim().toLowerCase() === key.trim().toLowerCase()
      ) {
        return String(values[i][1]);
      }
    }
  } catch (err) {
    console.error(`Error reading config key "${key}":`, err);
  }
  return "";
}

/**
 * Formats a date string, object, or timestamp into 'MMM d, yyyy h:mm a'.
 */
export function formatDate(v: any): string {
  if (!v) return "";

  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);

    let tz = "America/New_York";
    try {
      tz = getConfig("Timezone") || "America/New_York";
    } catch {
      // Fallback if sheet read fails
    }

    return Utilities.formatDate(d, tz, "MMM d, yyyy h:mm a");
  } catch (e) {
    return String(v);
  }
}

/**
 * Formats a Date object or string into 'yyyy-MM-dd'.
 */
export function formatDateOnly(date: any): string {
  if (!date) return "";

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    const timeZone = Session.getScriptTimeZone();
    return Utilities.formatDate(dateObj, timeZone, "yyyy-MM-dd");
  } catch (err) {
    console.error("Failed to format date:", err);
    return "";
  }
}

/**
 * Generates and returns a unique sequential ticket identifier (e.g., 'PRINT-2026-1001').
 */
export function nextTicketId(): string {
  const p = PropertiesService.getScriptProperties();
  let tz = "America/New_York";
  try {
    tz = getConfig("Timezone") || "America/New_York";
  } catch {
    // Default fallback
  }

  const year = Utilities.formatDate(new Date(), tz, "yyyy");
  const lastNum = Number(p.getProperty("LAST_TICKET_NUMBER") || 1000);
  const nextNum = lastNum + 1;

  p.setProperty("LAST_TICKET_NUMBER", String(nextNum));
  return `PRINT-${year}-${nextNum}`;
}

/**
 * Updates the cache version timestamp to notify connected clients of data updates.
 */
export function bumpCacheVersion(): void {
  try {
    PropertiesService.getScriptProperties().setProperty(
      "CACHE_VERSION",
      String(new Date().getTime()),
    );
  } catch (err) {
    console.error("Failed to bump cache version:", err);
  }
}

/**
 * Returns the current cache version token.
 */
export function checkCacheVersion(): { lastUpdated: string } {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    let version = scriptProperties.getProperty("CACHE_VERSION");

    if (!version) {
      version = String(new Date().getTime());
      scriptProperties.setProperty("CACHE_VERSION", version);
    }

    return { lastUpdated: version };
  } catch (e) {
    return { lastUpdated: "static_fallback_version" };
  }
}

/**
 * Validates the execution context and active user session.
 */
export function authCheck(): {
  success: boolean;
  effectiveUser?: string;
  activeUser?: string;
  sheetId?: string;
  error?: string;
} {
  try {
    const effectiveUser = Session.getEffectiveUser().getEmail();
    const activeUser = Session.getActiveUser().getEmail();
    const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

    debugLog(`[AUTH] Effective User: ${effectiveUser || "Anonymous"}`);
    debugLog(`[AUTH] Active User: ${activeUser || "Anonymous"}`);
    debugLog(`[AUTH] Sheet ID: ${sheetId}`);

    return {
      success: true,
      effectiveUser,
      activeUser,
      sheetId,
    };
  } catch (err: any) {
    console.error("Failed to fetch session details:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Helper to fetch the Jobs sheet, raw rows, and schema mapping.
 */
export function getJobsSheetAndHeaders() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.JOBS);
  if (!sh) {
    throw new Error(`Could not find sheet "${SHEETS.JOBS}".`);
  }

  const values = sh.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error(
      "No job records found (sheet is empty or only contains headers).",
    );
  }

  return { sh, values, schemaIndex: COLUMN_INDEX };
}

/**
 * Sends a test notification email to verify MailApp dispatch functionality.
 */
export function sendTestEmail(): void {
  const email = Session.getActiveUser().getEmail();
  MailApp.sendEmail(
    email,
    "Print Center Test",
    "Your Print Center automation email environment is working correctly.",
  );
}

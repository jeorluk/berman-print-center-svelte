import { getCachedJobs, getCachedConfigBundle } from "../cacheAndData";
import { type PrintJob } from "../schema";
import { debugLog } from "../utils";
import { submitPrintJob } from "../formSubmit";
import { recalculateQueue } from "../queueEngine";
import {
  lookupTicket,
  updateJobStatus,
  saveJobRow,
  archiveOldJobs,
  UserType,
} from "../jobOperations";

/**
 * Main HTTP GET handler for Google Apps Script Web App.
 * Delivers the Svelte web app HTML interface.
 */
export function doGet(
  e: GoogleAppsScript.Events.DoGet,
): GoogleAppsScript.HTML.HtmlOutput {
  debugLog(
    `[RPC] Web App accessed with params: ${JSON.stringify(e?.parameter || {})}`,
  );
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Berman Print Center")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Standard trigger handler for spreadsheet opening (if running container-bound).
 */
export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Print Center Admin")
    .addItem("Clear Cache & Refresh", "clearAllCaches")
    .addItem("Recalculate Queue", "recalculateQueue")
    .addToUi();
}

/**
 * Public RPC Endpoint: Returns the active session user's email address.
 */
export function getCurrentUserEmail(): string {
  try {
    const email =
      Session.getActiveUser().getEmail() ||
      Session.getEffectiveUser().getEmail();
    return String(email).trim().toLowerCase();
  } catch (err) {
    console.error("[RPC] Failed to retrieve active user email:", err);
    return "";
  }
}

/**
 * Public RPC Endpoint: Evaluates whether the active session user has admin privileges.
 */
export function isAdminUser(): boolean {
  try {
    const email = getCurrentUserEmail();
    const adminConfig = ["orlukj@mjbha.org"]; // Can also pull dynamically from CONFIG sheet tab
    return adminConfig.includes(email);
  } catch (err) {
    console.error("[RPC] Error evaluating admin privilege:", err);
    return false;
  }
}

/**
 * Public RPC Endpoint: Retrieves print jobs belonging to the current user session.
 */
export function getUserJobs(): PrintJob[] {
  try {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      debugLog("[RPC] getUserJobs called without active email context.");
      return [];
    }

    const allJobs = getCachedJobs();
    return allJobs.filter(
      (job) =>
        String(job.teacher_email || "")
          .trim()
          .toLowerCase() === userEmail,
    );
  } catch (err) {
    console.error("[RPC] Error fetching user jobs:", err);
    return [];
  }
}

/**
 * Public RPC Endpoint: Admin-only entrypoint to retrieve all queue jobs.
 */
export function getAllJobs(): PrintJob[] {
  if (!isAdminUser()) {
    console.warn(
      `[RPC] Unauthorized getAllJobs attempt by user: ${getCurrentUserEmail()}`,
    );
    return [];
  }
  return getCachedJobs();
}

/**
 * Public RPC Endpoint: Admin-only entrypoint to retrieve application configuration bundle.
 */
export function getConfig(): Record<string, any[]> {
  if (!isAdminUser()) {
    console.warn(
      `[RPC] Unauthorized getConfig attempt by user: ${getCurrentUserEmail()}`,
    );
    return {};
  }
  return getCachedConfigBundle();
}

/**
 * UI Alert Helper for spreadsheet container menus.
 */
export function showInfoAlert(message: string): void {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch {
    console.log(`[ALERT] ${message}`);
  }
}

/**
 * Public RPC Endpoint: Accepts form submissions from PrintForm.svelte.
 */
export function handlePrintFormSubmit(formData: any) {
  return submitPrintJob(formData);
}

export function triggerQueueRecalculation(): void {
  if (!isAdminUser()) {
    console.warn("[RPC] Unauthorized queue recalculation attempt.");
    return;
  }
  recalculateQueue();
}

export function checkTicketStatus(ticketId: string) {
  return lookupTicket(ticketId);
}

export function cancelUserTicket(ticketId: string) {
  return updateJobStatus(ticketId, "Cancelled", UserType.USER);
}

export function updateJobFromDashboard(
  ticketId: string,
  newStatus: string,
  notes: string,
) {
  if (!isAdminUser()) {
    return { success: false, message: "Unauthorized access." };
  }
  return saveJobRow(ticketId, newStatus, notes);
}

export function runArchiver() {
  if (!isAdminUser()) {
    return { success: false, message: "Unauthorized access." };
  }
  return archiveOldJobs();
}

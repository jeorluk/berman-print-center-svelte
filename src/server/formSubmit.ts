import { type PrintJob, jobToRow } from "./schema";
import { nextTicketId, formatDate, SHEETS } from "./utils";
import { calculateSlaDue } from "./slaCalculator";
import { clearJobsCache } from "./cacheAndData";

/**
 * Handles print job submission coming from the Svelte web form (PrintForm.svelte).
 * Calculates SLA, maps parameters to the snake_case row schema, appends to sheet,
 * and clears caches.
 */
export function submitPrintJob(formData: Partial<PrintJob>): {
  success: boolean;
  ticket_id?: string;
  error?: string;
} {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jobsSheet = ss.getSheetByName(SHEETS.JOBS);
    if (!jobsSheet) {
      throw new Error(`Sheet "${SHEETS.JOBS}" not found.`);
    }

    const ticketId = nextTicketId();
    const submittedAtStr = formatDate(new Date());

    // Determine priority and status logic
    const priority = formData.priority || "Standard";
    const status = priority === "Rush" ? "Submitted" : "Queued";

    // Build complete PrintJob payload
    const jobPayload: Partial<PrintJob> = {
      ...formData,
      ticket_id: ticketId,
      submitted_at: submittedAtStr,
      status: status,
      priority: priority,
      copies: Number(formData.copies) || 1,
      color: Boolean(formData.color),
      collation: Boolean(formData.collation),
      lamination: Boolean(formData.lamination),
      cut: Boolean(formData.cut),
      received: Boolean(formData.received),
    };

    // Calculate SLA due date
    const calculatedSla = calculateSlaDue(jobPayload);
    jobPayload.sla_due = formatDate(calculatedSla);

    // Convert Partial<PrintJob> to ordered array matching SPREADSHEET_COLUMNS
    const rowArray = jobToRow(jobPayload);

    // Write row to Jobs sheet
    jobsSheet.appendRow(rowArray);

    // Clear server-side cache so new job appears immediately
    clearJobsCache();

    return {
      success: true,
      ticket_id: ticketId,
    };
  } catch (err: any) {
    console.error("Error in submitPrintJob:", err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

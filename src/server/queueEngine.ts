import { COLUMN_INDEX, type PrintJob, rowToJob } from "./schema";
import { SHEETS, debugLog, formatDate, bumpCacheVersion } from "./utils";
import { calculateSlaDue, addBusinessHours } from "./slaCalculator";
import { clearJobsCache } from "./cacheAndData";

export interface RankedJob {
  rowIndex: number; // 0-indexed row position in values array
  job: PrintJob;
  row: any[];
}

/**
 * Validates and ensures a job has an SLA Due timestamp.
 * If missing, calculates it and updates the spreadsheet row immediately.
 */
export function verifySLA(
  sh: GoogleAppsScript.Spreadsheet.Sheet,
  rowIndex: number, // 1-indexed sheet row
  job: PrintJob,
): string {
  if (job.sla_due && String(job.sla_due).trim() !== "") {
    return String(job.sla_due);
  }

  debugLog(`[SLA Verify] Calculating missing SLA for ticket: ${job.ticket_id}`);
  const calculated = calculateSlaDue(job);
  const formattedSla = formatDate(calculated);

  // Write directly to the SLA Due column in the spreadsheet
  sh.getRange(rowIndex, COLUMN_INDEX.sla_due + 1).setValue(formattedSla);
  return formattedSla;
}

/**
 * Recalculates the active print queue by sorting active jobs by priority rank,
 * needed_by_date, and submitted_at, then writing queue positions and ETAs to the sheet.
 */
export function recalculateQueue(): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEETS.JOBS);
    if (!sh) throw new Error(`Sheet "${SHEETS.JOBS}" not found.`);

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return;

    // Active status set that receives queue positions and completion estimates
    const activeStatuses = new Set(["Queued", "In Production"]);
    const activeJobs: RankedJob[] = [];

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const job = rowToJob(row);

      if (!job.ticket_id) continue;

      if (activeStatuses.has(job.status)) {
        // Ensure SLA Due is populated
        const validatedSla = verifySLA(sh, r + 1, job);
        job.sla_due = validatedSla;

        activeJobs.push({ rowIndex: r + 1, job, row });
        debugLog(
          `[Queue Recalc] Included active ticket ${job.ticket_id} (Status: ${job.status})`,
        );
      } else {
        // Clear queue position & estimated completion for inactive or finished jobs
        sh.getRange(r + 1, COLUMN_INDEX.queue_position + 1).setValue("");
        sh.getRange(r + 1, COLUMN_INDEX.estimated_completion + 1).setValue("");
        debugLog(
          `[Queue Recalc] Cleared position for ticket ${job.ticket_id} (Status: ${job.status})`,
        );
      }
    }

    debugLog(
      `[Queue Recalc] Active jobs count for sorting: ${activeJobs.length}`,
    );

    // Sort active queue
    activeJobs.sort((a, b) => compareJobs(a.job, b.job));

    // Batch write updated positions and ETAs
    activeJobs.forEach((item, index) => {
      const position = index + 1;
      const eta = estimateCompletion(item.job, position);
      const etaFormatted = formatDate(eta);

      sh.getRange(item.rowIndex, COLUMN_INDEX.queue_position + 1).setValue(
        position,
      );
      sh.getRange(
        item.rowIndex,
        COLUMN_INDEX.estimated_completion + 1,
      ).setValue(etaFormatted);

      debugLog(
        `[Queue Recalc] Assigned Ticket ${item.job.ticket_id} to Position ${position}`,
      );
    });

    clearJobsCache();
    bumpCacheVersion();
  } catch (err) {
    console.error("Error during queue recalculation:", err);
  }
}

/**
 * Priority comparison helper sorting jobs by Priority rank, Needed By date, and Submitted At timestamp.
 */
export function compareJobs(a: PrintJob, b: PrintJob): number {
  const rank: Record<string, number> = {
    Rush: 1,
    "Due Today": 2,
    Standard: 3,
    Future: 4,
  };

  const pa = rank[String(a.priority)] || 3;
  const pb = rank[String(b.priority)] || 3;

  if (pa !== pb) return pa - pb;

  const da = a.needed_by_date
    ? new Date(a.needed_by_date).getTime()
    : 32503680000000; // Far future
  const db = b.needed_by_date
    ? new Date(b.needed_by_date).getTime()
    : 32503680000000;

  if (da !== db) return da - db;

  const sa = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
  const sb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;

  return sa - sb;
}

/**
 * Calculates an estimated completion timestamp based on queue position and SLA due date.
 */
export function estimateCompletion(job: PrintJob, position: number): Date {
  if (
    job.status === "In Production" ||
    job.status === "Ready" ||
    job.status === "Completed"
  ) {
    return new Date();
  }

  const due = job.sla_due ? new Date(job.sla_due) : null;
  const now = new Date();

  if (!due || due.getTime() <= now.getTime()) {
    const start = job.submitted_at ? new Date(job.submitted_at) : now;
    return due || addBusinessHours(start, 24);
  }

  const remaining = due.getTime() - now.getTime();
  const fraction = Math.min(1, Math.max(0.15, position / 10));

  return new Date(now.getTime() + remaining * fraction);
}

/**
 * Triggers a manual queue recalculation and invalidates caches.
 */
export function refreshQueueAndGetJobs(): void {
  debugLog(
    "[Dashboard] Manual refresh requested. Running recalculateQueue()...",
  );
  recalculateQueue();
}

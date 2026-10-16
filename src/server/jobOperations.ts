import {
  COLUMN_INDEX,
  type ColumnHeader,
  type PrintJob,
  rowToJob,
} from "./schema";
import { SHEETS, formatDate, bumpCacheVersion } from "./utils";
import { clearJobsCache } from "./cacheAndData";
import { recalculateQueue } from "./queueEngine";
import { isAdminUser, getCurrentUserEmail } from "./ui/rpc";

export enum UserType {
  USER = "USER",
  ADMIN = "ADMIN",
}

/**
 * Searches the JOBS sheet for a ticket ID and verifies user ownership.
 */
export function lookupTicket(ticketId: string): {
  found: boolean;
  message?: string;
  job?: PrintJob;
} {
  if (!ticketId || !ticketId.trim()) {
    return { found: false, message: "Please provide a valid ticket number." };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEETS.JOBS);
    if (!sh)
      return { found: false, message: `Sheet "${SHEETS.JOBS}" not found.` };

    const values = sh.getDataRange().getValues();
    const currentUser = getCurrentUserEmail();
    const isAdmin = isAdminUser();

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const job = rowToJob(row);

      if (
        String(job.ticket_id).toUpperCase() === ticketId.trim().toUpperCase()
      ) {
        // Ownership check for standard users
        if (!isAdmin && currentUser && job.teacher_email) {
          if (currentUser.toLowerCase() !== job.teacher_email.toLowerCase()) {
            return {
              found: false,
              message:
                "Unauthorized: You do not have permission to view this ticket.",
            };
          }
        }

        return { found: true, job };
      }
    }

    return {
      found: false,
      message: "Ticket not found. Please check the ticket number.",
    };
  } catch (err: any) {
    console.error("Error in lookupTicket:", err);
    return { found: false, message: err?.message || String(err) };
  }
}

/**
 * Centralized low-level row update utility.
 * Modifies specific column keys for a ticket ID without overwriting adjacent fields.
 */
export function updateJobProperties(
  ticketId: string,
  updatesObj: Partial<Record<ColumnHeader, any>>,
): { success: boolean; message?: string } {
  if (!ticketId || !updatesObj || Object.keys(updatesObj).length === 0) {
    return {
      success: false,
      message: "Ticket ID and update properties are required.",
    };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEETS.JOBS);
    if (!sh)
      return { success: false, message: `Sheet "${SHEETS.JOBS}" not found.` };

    const values = sh.getDataRange().getValues();

    for (let r = 1; r < values.length; r++) {
      const rowTicket = String(values[r][COLUMN_INDEX.ticket_id] || "").trim();

      if (rowTicket.toUpperCase() === ticketId.trim().toUpperCase()) {
        const currentRow = [...values[r]];

        // Handle queue clearing if status moves to non-queued state
        if (updatesObj.status !== undefined) {
          const nonQueuedStatuses = [
            "Submitted",
            "Ready",
            "Completed",
            "Action Required",
            "Cancelled",
          ];
          if (nonQueuedStatuses.includes(String(updatesObj.status))) {
            currentRow[COLUMN_INDEX.queue_position] = "";
            currentRow[COLUMN_INDEX.estimated_completion] = "";
          }
        }

        // Apply all updates dynamically via COLUMN_INDEX
        for (const [key, val] of Object.entries(updatesObj)) {
          const colIdx = COLUMN_INDEX[key as ColumnHeader];
          if (colIdx !== undefined) {
            currentRow[colIdx] = val;
          }
        }

        // Write row in a single batch call
        sh.getRange(r + 1, 1, 1, currentRow.length).setValues([currentRow]);

        clearJobsCache();
        bumpCacheVersion();
        return { success: true };
      }
    }

    return { success: false, message: "Ticket not found." };
  } catch (err: any) {
    console.error("Error in updateJobProperties:", err);
    return { success: false, message: err?.message || String(err) };
  }
}

/**
 * Updates a job's status with permission checks, state rules, SLA pausing/resetting,
 * and timestamping.
 */
export function updateJobStatus(
  ticketId: string,
  newStatus: string,
  userType: UserType = UserType.ADMIN,
): { success: boolean; message?: string } {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEETS.JOBS);
    if (!sh)
      return { success: false, message: `Sheet "${SHEETS.JOBS}" not found.` };

    const values = sh.getDataRange().getValues();

    for (let r = 1; r < values.length; r++) {
      const job = rowToJob(values[r]);

      if (job.ticket_id.toUpperCase() === ticketId.trim().toUpperCase()) {
        const oldStatus = job.status;

        if (oldStatus === "Completed" || oldStatus === "Cancelled") {
          return {
            success: false,
            message:
              "Cannot modify a terminal status (Completed or Cancelled).",
          };
        }

        if (oldStatus === newStatus) {
          return { success: true, message: `Status is already ${newStatus}.` };
        }

        // User cancellation permission checks
        if (userType === UserType.USER) {
          if (newStatus !== "Cancelled") {
            return {
              success: false,
              message: "Unauthorized: Standard users can only cancel tickets.",
            };
          }
          const validCancelStates = ["Submitted", "Queued", "Action Required"];
          if (!validCancelStates.includes(oldStatus)) {
            return {
              success: false,
              message:
                "Tickets can only be cancelled while Submitted, Queued, or Action Required.",
            };
          }
          const currentUser = getCurrentUserEmail();
          if (
            currentUser &&
            job.teacher_email &&
            currentUser !== job.teacher_email.toLowerCase()
          ) {
            return {
              success: false,
              message:
                "Unauthorized: You do not have permission to cancel this ticket.",
            };
          }
        }

        const updatesObj: Partial<Record<ColumnHeader, any>> = {
          status: newStatus as any,
        };

        // Rule 1: Action Required pauses SLA
        if (newStatus === "Action Required") {
          updatesObj.sla_due = "Paused";
        }

        // Rule 2: Returning from Action Required resets submitted clock & SLA
        if (
          oldStatus === "Action Required" &&
          (newStatus === "Queued" || newStatus === "In Production")
        ) {
          updatesObj.submitted_at = formatDate(new Date());
          updatesObj.sla_due = "";
        }

        // Timestamps
        if (newStatus === "Ready" || newStatus === "Action Required") {
          updatesObj.last_notification = formatDate(new Date());
        }
        if (newStatus === "Completed" || newStatus === "Cancelled") {
          updatesObj.completed_at = formatDate(new Date());
        }

        const result = updateJobProperties(ticketId, updatesObj);
        if (result.success) {
          recalculateQueue();
        }
        return result;
      }
    }

    return { success: false, message: "Ticket not found." };
  } catch (err: any) {
    console.error("Error in updateJobStatus:", err);
    return { success: false, message: err?.message || String(err) };
  }
}

/**
 * Updates internal notes for a job.
 */
export function updateJobNotes(
  ticketId: string,
  notes: string,
): { success: boolean; message?: string } {
  return updateJobProperties(ticketId, { internal_notes: notes });
}

/**
 * Combined Operator Row Save: Updates status and internal notes together.
 */
export function saveJobRow(
  ticketId: string,
  newStatus: string,
  notes: string,
): { success: boolean; message?: string } {
  const lookup = lookupTicket(ticketId);
  if (!lookup.found || !lookup.job) {
    return { success: false, message: "Ticket not found." };
  }

  const currentStatus = lookup.job.status;
  const currentNotes = lookup.job.internal_notes;

  const statusChanged = currentStatus !== newStatus;
  const notesChanged = currentNotes !== notes;

  if (!statusChanged && !notesChanged) {
    return { success: true, message: "No changes detected." };
  }

  if (statusChanged) {
    const statusResult = updateJobStatus(ticketId, newStatus, UserType.ADMIN);
    if (!statusResult.success) return statusResult;
  }

  if (notesChanged) {
    const notesResult = updateJobNotes(ticketId, notes);
    if (!notesResult.success) return notesResult;
  }

  if (statusChanged) {
    recalculateQueue();
  }

  return { success: true };
}

/**
 * Archives completed or cancelled jobs older than 30 days to the ARCHIVE tab.
 */
export function archiveOldJobs(): {
  success: boolean;
  archivedCount: number;
  message?: string;
} {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jobsSh = ss.getSheetByName(SHEETS.JOBS);
    if (!jobsSh)
      return {
        success: false,
        archivedCount: 0,
        message: "Jobs sheet not found.",
      };

    let archiveSh = ss.getSheetByName("ARCHIVE");

    // Create ARCHIVE sheet if it doesn't exist
    if (!archiveSh) {
      archiveSh = ss.insertSheet("ARCHIVE");
      const headers = jobsSh
        .getRange(1, 1, 1, jobsSh.getLastColumn())
        .getValues();
      archiveSh.getRange(1, 1, 1, headers[0].length).setValues(headers);
      archiveSh.setFrozenRows(1);
    }

    const values = jobsSh.getDataRange().getValues();
    if (values.length < 2) {
      return {
        success: true,
        archivedCount: 0,
        message: "No job records found.",
      };
    }

    const now = new Date().getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const rowsToKeep = [values[0]]; // Headers
    const rowsToArchive: any[][] = [];

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const job = rowToJob(row);
      const subDate = job.submitted_at
        ? new Date(job.submitted_at).getTime()
        : 0;

      if (
        (job.status === "Completed" || job.status === "Cancelled") &&
        subDate > 0 &&
        now - subDate > thirtyDaysMs
      ) {
        rowsToArchive.push(row);
      } else {
        rowsToKeep.push(row);
      }
    }

    if (rowsToArchive.length > 0) {
      // Append to ARCHIVE sheet
      archiveSh
        .getRange(
          archiveSh.getLastRow() + 1,
          1,
          rowsToArchive.length,
          rowsToArchive[0].length,
        )
        .setValues(rowsToArchive);

      // Rewrite JOBS sheet with active/recent rows
      //   jobsSh.clearContent();
      jobsSh
        .getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length)
        .setValues(rowsToKeep);

      recalculateQueue();
      clearJobsCache();

      return {
        success: true,
        archivedCount: rowsToArchive.length,
        message: `Successfully archived ${rowsToArchive.length} job(s).`,
      };
    }

    return {
      success: true,
      archivedCount: 0,
      message: "No jobs met the criteria for archiving.",
    };
  } catch (err: any) {
    console.error("Error during job archiving:", err);
    return {
      success: false,
      archivedCount: 0,
      message: err?.message || String(err),
    };
  }
}

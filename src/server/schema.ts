/**
 * Single source of truth for Berman Print Center spreadsheet headers,
 * column indices, and TypeScript data models.
 */

// 1. Array of exact snake_case spreadsheet column headers (0-indexed order)
export const SPREADSHEET_COLUMNS = [
  "ticket_id",
  "submitted_at",
  "teacher_email",
  "department",
  "status",
  "queue_position",
  "priority",
  "file_url",
  "received",
  "copies",
  "color",
  "paper_size",
  "paper_weight",
  "paper_color",
  "sides",
  "collation",
  "cover_sides",
  "cover_weight",
  "cover_color",
  "staple",
  "binding",
  "hole_punch",
  "lamination",
  "cut",
  "account_number",
  "administrator",
  "needed_by_date",
  "sla_due",
  "estimated_completion",
  "last_notification",
  "completed_at",
  "user_notes",
  "internal_notes",
] as const;

// 2. Derive Header Type and Column Index Mapping
export type ColumnHeader = (typeof SPREADSHEET_COLUMNS)[number];

export const COLUMN_INDEX: Record<ColumnHeader, number> =
  SPREADSHEET_COLUMNS.reduce(
    (acc, header, index) => {
      acc[header as ColumnHeader] = index;
      return acc;
    },
    {} as Record<ColumnHeader, number>,
  );

// 3. Status and Priority Enums/Types
export type JobStatus =
  | "Submitted"
  | "Queued"
  | "In Production"
  | "Ready"
  | "Completed"
  | "Action Required"
  | "Cancelled"
  | "Pending Approval";

export type JobPriority = "Standard" | "High" | "Rush";

// 4. Primary TypeScript Model for a Print Job
export interface PrintJob {
  ticket_id: string;
  submitted_at: string;
  teacher_email: string;
  department: string;
  status: JobStatus;
  queue_position: number | null;
  priority: JobPriority;
  file_url: string;
  received: boolean;
  copies: number;
  color: boolean;
  paper_size: string;
  paper_weight: string;
  paper_color: string;
  sides: string;
  collation: boolean;
  cover_sides: string;
  cover_weight: string;
  cover_color: string;
  staple: string;
  binding: string;
  hole_punch: string;
  lamination: boolean;
  cut: boolean;
  account_number: string;
  administrator: string;
  needed_by_date: string;
  sla_due: string;
  estimated_completion: string;
  last_notification: string;
  completed_at: string;
  user_notes: string;
  internal_notes: string;
}

// 5. Helper utility to convert a raw Google Sheets row array into a PrintJob object
export function rowToJob(row: any[]): PrintJob {
  const getVal = (col: ColumnHeader) => row[COLUMN_INDEX[col]] ?? "";
  const getBool = (col: ColumnHeader) => {
    const val = getVal(col);
    return val === true || val === "TRUE" || val === "true";
  };
  const getNum = (col: ColumnHeader) => {
    const val = getVal(col);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
  };

  return {
    ticket_id: String(getVal("ticket_id")),
    submitted_at: String(getVal("submitted_at")),
    teacher_email: String(getVal("teacher_email")),
    department: String(getVal("department")),
    status: (getVal("status") || "Submitted") as JobStatus,
    queue_position: getNum("queue_position"),
    priority: (getVal("priority") || "Standard") as JobPriority,
    file_url: String(getVal("file_url")),
    received: getBool("received"),
    copies: Number(getVal("copies")) || 1,
    color: getBool("color"),
    paper_size: String(getVal("paper_size")),
    paper_weight: String(getVal("paper_weight")),
    paper_color: String(getVal("paper_color")),
    sides: String(getVal("sides")),
    collation: getBool("collation"),
    cover_sides: String(getVal("cover_sides")),
    cover_weight: String(getVal("cover_weight")),
    cover_color: String(getVal("cover_color")),
    staple: String(getVal("staple")),
    binding: String(getVal("binding")),
    hole_punch: String(getVal("hole_punch")),
    lamination: getBool("lamination"),
    cut: getBool("cut"),
    account_number: String(getVal("account_number")),
    administrator: String(getVal("administrator")),
    needed_by_date: String(getVal("needed_by_date")),
    sla_due: String(getVal("sla_due")),
    estimated_completion: String(getVal("estimated_completion")),
    last_notification: String(getVal("last_notification")),
    completed_at: String(getVal("completed_at")),
    user_notes: String(getVal("user_notes")),
    internal_notes: String(getVal("internal_notes")),
  };
}

// 6. Helper utility to convert a PrintJob object into an ordered array for Google Sheets row writing
export function jobToRow(job: Partial<PrintJob>): any[] {
  const row = new Array(SPREADSHEET_COLUMNS.length).fill("");
  for (const header of SPREADSHEET_COLUMNS) {
    if (job[header] !== undefined) {
      row[COLUMN_INDEX[header]] = job[header];
    }
  }
  return row;
}

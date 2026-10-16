import { SHEETS, debugLog, bumpCacheVersion } from "./utils";
import { rowToJob, type PrintJob } from "./schema";

const CACHE_TTL = 21600; // 6 hours in seconds

/**
 * Low-level utility to convert a sheet tab into an array of objects
 * using row 1 headers as object keys.
 */
export function getSheetObjects(sheetName: string): Record<string, any>[] {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sh) return [];

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return [];

    const headers = values[0].map((h: any) => String(h).trim());

    return values
      .slice(1)
      .filter((row: any[]) =>
        row.some((cell: any) => cell !== "" && cell !== null),
      )
      .map((row: any[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((header: string, index: number) => {
          if (header) {
            obj[header] = row[index];
          }
        });
        return obj;
      });
  } catch (err) {
    console.error(`Error reading sheet objects from tab "${sheetName}":`, err);
    return [];
  }
}

/**
 * Fetches all jobs from the sheet using CacheService and maps them
 * directly to typed PrintJob objects via rowToJob.
 */
export function getCachedJobs(): PrintJob[] {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("CACHE_JOBS");

    if (cached !== null) {
      debugLog("Cache HIT for CACHE_JOBS");
      return JSON.parse(cached);
    }

    debugLog("Cache MISS for CACHE_JOBS. Reading Jobs sheet...");
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      SHEETS.JOBS,
    );
    if (!sh) return [];

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return [];

    // Parse row arrays into strongly typed PrintJob objects using rowToJob
    const jobs: PrintJob[] = values.slice(1).map((row: any[]) => rowToJob(row));

    cache.put("CACHE_JOBS", JSON.stringify(jobs), CACHE_TTL);
    return jobs;
  } catch (err) {
    console.error("Error in getCachedJobs:", err);
    return [];
  }
}

/**
 * Fetches the master configuration bundle (CONFIG, SLA_RULES, etc.)
 * with CacheService memory caching.
 */
export function getCachedConfigBundle(): Record<string, any[]> {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("CACHE_CONFIG_BUNDLE");

    if (cached !== null) {
      debugLog("Cache HIT for CACHE_CONFIG_BUNDLE");
      return JSON.parse(cached);
    }

    debugLog("Cache MISS for CACHE_CONFIG_BUNDLE. Fetching config tabs...");
    const sheetNames = [
      SHEETS.CONFIG,
      SHEETS.SLA_RULES,
      "STATUS_OPTIONS",
      "PRIORITY_OPTIONS",
      SHEETS.HOLIDAYS,
    ];

    const bundle: Record<string, any[]> = {};
    sheetNames.forEach((name) => {
      bundle[name] = getSheetObjects(name);
    });

    cache.put("CACHE_CONFIG_BUNDLE", JSON.stringify(bundle), CACHE_TTL);
    return bundle;
  } catch (err) {
    console.error("Error in getCachedConfigBundle:", err);
    return {};
  }
}

/**
 * Specific cached config row getter used by getConfig helper.
 */
export function getCachedConfigRows(): Record<string, any>[] {
  const bundle = getCachedConfigBundle();
  return bundle[SHEETS.CONFIG] || [];
}

/**
 * Clears server-side CacheService keys and bumps the global version.
 */
export function clearJobsCache(): void {
  try {
    CacheService.getScriptCache().remove("CACHE_JOBS");
    bumpCacheVersion();
    debugLog("Jobs cache cleared.");
  } catch (err) {
    console.error("Failed to clear jobs cache:", err);
  }
}

export function clearConfigCache(): void {
  try {
    CacheService.getScriptCache().remove("CACHE_CONFIG_BUNDLE");
    bumpCacheVersion();
    debugLog("Config cache cleared.");
  } catch (err) {
    console.error("Failed to clear config cache:", err);
  }
}

export function clearAllCaches(): void {
  clearJobsCache();
  clearConfigCache();
}

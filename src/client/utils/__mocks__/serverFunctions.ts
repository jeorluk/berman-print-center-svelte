import type * as publicServerFunctions from "@/server/index";
import { mockDatabase } from "./mockData";

type ServerFunctionsInterface = typeof publicServerFunctions;

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : Promise<T[K]>;
};

type PromisifiedServerFunctionsInterface =
  Promisified<ServerFunctionsInterface>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const serverFunctions = new Proxy(
  {} as PromisifiedServerFunctionsInterface,
  {
    get(_target, propKey) {
      if (typeof propKey === "string") {
        return async (...args: any[]) => {
          console.log(`🚀 [Mock Server] Function Called: "${propKey}"`, args);
          await sleep(200);

          const lowerKey = propKey.toLowerCase();

          // 1. Handle getUserJobs (filters by user email if passed, otherwise defaults to orlukj@mjbha.org)
          if (lowerKey === "getuserjobs") {
            const userEmail = (args[0] || "orlukj@mjbha.org").toLowerCase();
            const allJobs = mockDatabase.JOBS || [];
            return allJobs.filter((job: any) => {
              const emailField = job["Teacher Email"] || job.teacherEmail;
              return emailField && emailField.toLowerCase() === userEmail;
            });
          }

          // 2. Handle getAllJobs (returns full mock job list for admins)
          if (lowerKey === "getalljobs") {
            return mockDatabase.JOBS || [];
          }

          // 3. Handle getConfig (returns the full configuration, options, and rules bundle)
          if (lowerKey === "getconfig") {
            return {
              config: mockDatabase.CONFIG,
              statusOptions: mockDatabase.STATUS_OPTIONS,
              priorityOptions: mockDatabase.PRIORITY_OPTIONS,
              slaRules: mockDatabase.SLA_RULES,
              holidays: mockDatabase.HOLIDAYS,
            };
          }

          // Fallback general handlers for jobs or queue names
          if (lowerKey.includes("job") || lowerKey.includes("queue")) {
            return mockDatabase.JOBS || [];
          }

          // Handle updates or property mutations
          if (lowerKey.includes("update") || lowerKey.includes("save")) {
            console.log(
              `📝 [Mock Server] Mutated job properties with args:`,
              args,
            );
            return { success: true, updated: true };
          }

          // User profile and role checks
          if (lowerKey.includes("email") || lowerKey.includes("user")) {
            return "orlukj@mjbha.org";
          }

          if (lowerKey.includes("admin")) {
            return true;
          }

          // Legacy/fallback configuration settings
          if (lowerKey.includes("setting")) {
            return {
              maintenanceMode: false,
              maxCopiesPerJob: 1000,
              defaultPrinter: "Production Finisher 1",
            };
          }

          return { success: true };
        };
      }
    },
  },
);

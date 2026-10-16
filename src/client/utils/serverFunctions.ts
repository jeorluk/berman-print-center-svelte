import { GASClient } from "gas-client";
import type * as publicServerFunctions from "@/server/index";
import { serverFunctions as mockServerFunctions } from "./__mocks__/serverFunctions";

const isLocalDev = import.meta.env.DEV;

let serverFunctions: any;

if (isLocalDev) {
  console.log("🛠️ [Local Dev] Using Mock Server Functions");
  serverFunctions = mockServerFunctions;
} else {
  const client = new GASClient<typeof publicServerFunctions>({
    allowedDevelopmentDomains: (origin) =>
      /https:\/\/.*\.googleusercontent\.com$/.test(origin),
  });
  serverFunctions = client.serverFunctions;
}

export { serverFunctions };

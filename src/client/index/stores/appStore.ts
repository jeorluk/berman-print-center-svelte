import { writable } from "svelte/store";
import { serverFunctions } from "../../utils/serverFunctions";

interface AppState {
  userJobs: any[];
  allJobs: any[];
  configBundle: Record<string, any>;
  isAdmin: boolean;
  currentUserEmail: string;
  loading: boolean;
  error: string | null;
}

export const appStore = writable<AppState>({
  userJobs: [],
  allJobs: [],
  configBundle: {},
  isAdmin: false,
  currentUserEmail: "",
  loading: true,
  error: null,
});

export async function initAppStore() {
  appStore.update((s) => ({ ...s, loading: true, error: null }));
  try {
    const [userJobs, allJobs, configBundle, currentUserEmail] =
      await Promise.all([
        serverFunctions.getUserJobs(),
        serverFunctions.getAllJobs(),
        serverFunctions.getConfig(),
        serverFunctions.getCurrentUserEmail(),
      ]);

    // console.log("AppStore userJobs:" + JSON.stringify(userJobs));
    // console.log("AppStore allJobs:" + JSON.stringify(allJobs));
    // console.log("AppStore config:" + JSON.stringify(configBundle));
    // console.log("AppStore currentUserEmail:" + currentUserEmail);

    const isAdmin =
      Object.keys(configBundle || {}).length > 0 ||
      (allJobs && allJobs.length > 0);

    appStore.set({
      userJobs: userJobs || [],
      allJobs: allJobs || [],
      configBundle: configBundle || {},
      isAdmin,
      currentUserEmail: currentUserEmail || "",
      loading: false,
      error: null,
    });
  } catch (err: any) {
    console.error("Failed to load app data:", err);
    appStore.update((s) => ({
      ...s,
      loading: false,
      error: err.message || "Failed to load data from server.",
    }));
  }
}

import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/utils/atoms/settings";
import { getSlowmoJobs } from "@/utils/slowmo";

const POLL_MS = 10_000;

/**
 * The Slowmo service's jobs; shared by the notifier and the player UI.
 * Polls only while something is pending (sending a job invalidates the key).
 */
export const useSlowmoJobs = (enabled = true) => {
  const { settings } = useSettings();
  return useQuery({
    queryKey: ["slowmo-jobs", settings.slowmoServerUrl],
    queryFn: () => getSlowmoJobs(settings),
    enabled: enabled && !!settings.slowmoServerUrl,
    // gcTime 0: a polling query must not be persisted (see learned facts).
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some(
        (j) => j.status === "queued" || j.status === "running",
      )
        ? POLL_MS
        : false,
  });
};

import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { usePlayMedia } from "@/hooks/usePlayMedia";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";
import { getSlowmoJobs, type SlowmoJob } from "@/utils/slowmo";

const POLL_MS = 10_000;

// While the app is open, watches the Slowmo jobs and offers to play a version
// the moment its job finishes. No push: a closed app is not notified.
export const SlowmoNotifier = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const playMedia = usePlayMedia();
  const seen = useRef<Map<string, SlowmoJob["status"]> | null>(null);

  const { data } = useQuery({
    queryKey: ["slowmo-jobs", settings.slowmoServerUrl],
    queryFn: () => getSlowmoJobs(settings),
    enabled: !!settings.slowmoServerUrl,
    // Polls only while something is pending; sending a job invalidates the key.
    // gcTime 0: a polling query must not be persisted (see learned facts).
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some(
        (j) => j.status === "queued" || j.status === "running",
      )
        ? POLL_MS
        : false,
  });

  useEffect(() => {
    if (!data) return;
    const previous = seen.current;
    seen.current = new Map(data.map((j) => [j.id, j.status]));
    if (!previous) return; // first load only records the state
    for (const job of data) {
      if (job.status !== "done" || previous.get(job.id) === "done") continue;
      toast.success(`${t("slowmo.ready")}: ${job.name}`, {
        duration: 15_000,
        action: { label: t("slowmo.play"), onClick: () => play(job) },
      });
    }
  }, [data]);

  const play = async (job: SlowmoJob) => {
    if (!api || !user?.Id) return;
    const res = await getLibraryApi(api).getItem({
      itemId: job.itemId,
      userId: user.Id,
    });
    const norm = (p?: string | null) =>
      (p ?? "").split("\\").join("/").toLowerCase();
    const source = res.data.MediaSources?.find(
      (s) => norm(s.Path) === norm(job.output),
    );
    if (!source?.Id) {
      toast.info(t("slowmo.not_in_library"));
      return;
    }
    playMedia(
      {
        itemId: job.itemId,
        mediaSourceId: source.Id,
        offline: false,
        playbackPositionTicks: 0,
      },
      { item: res.data },
    );
  };

  return null;
};

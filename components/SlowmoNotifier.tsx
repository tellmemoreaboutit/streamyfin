import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { usePlayMedia } from "@/hooks/usePlayMedia";
import { useSlowmoJobs } from "@/hooks/useSlowmoJobs";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { slowmoPlayerItemAtom } from "@/utils/atoms/slowmoSelection";
import { firstPartStartSeconds, type SlowmoJob } from "@/utils/slowmo";

// While the app is open, watches the Slowmo jobs and offers to play a version
// the moment its job finishes. No push: a closed app is not notified, and
// there is no OS notification to tap, the toast action is the way in.
export const SlowmoNotifier = () => {
  const { t } = useTranslation();
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const playMedia = usePlayMedia();
  const playerItem = useAtomValue(slowmoPlayerItemAtom);
  const playerItemRef = useRef(playerItem);
  playerItemRef.current = playerItem;
  const seen = useRef<Map<string, SlowmoJob["status"]> | null>(null);

  const { data } = useSlowmoJobs();

  useEffect(() => {
    if (!data) return;
    const previous = seen.current;
    seen.current = new Map(data.map((j) => [j.id, j.status]));
    if (!previous) return; // first load only records the state
    for (const job of data) {
      if (job.status !== "done" || previous.get(job.id) === "done") continue;
      // The player of that movie shows its own toast
      if (playerItemRef.current === job.itemId) continue;
      toast.success(`${t("slowmo.ready")}: ${job.name}`, {
        duration: 15_000,
        action: { label: t("slowmo.watch"), onClick: () => play(job) },
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
        playbackPositionTicks: Math.round(
          firstPartStartSeconds(job) * 10_000_000,
        ),
      },
      { item: res.data },
    );
  };

  return null;
};

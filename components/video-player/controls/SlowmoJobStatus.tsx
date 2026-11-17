import { useSetAtom } from "jotai";
import { type FC, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import { useSlowmoJobs } from "@/hooks/useSlowmoJobs";
import { slowmoPlayerItemAtom } from "@/utils/atoms/slowmoSelection";
import {
  firstPartStartSeconds,
  pendingJobsForItem,
  type SlowmoJob,
} from "@/utils/slowmo";
import { formatTimeString } from "@/utils/time";
import { usePlayerContext } from "./contexts/PlayerContext";
import { useVersionSwitch } from "./hooks/useVersionSwitch";

const norm = (p?: string | null) =>
  (p ?? "").split("\\").join("/").toLowerCase();

/**
 * Progress pill of this movie's queued or running Slowmo job; when it
 * finishes, a toast whose action switches to the new version at its first
 * slowed part. Takes over from the global notifier while the player is open.
 */
export const SlowmoJobStatus: FC = () => {
  const { t } = useTranslation();
  const { item } = usePlayerContext();
  const { data } = useSlowmoJobs();
  const { switchSource, refetch } = useVersionSwitch();
  const setPlayerItem = useSetAtom(slowmoPlayerItemAtom);
  const seen = useRef<Map<string, SlowmoJob["status"]> | null>(null);

  useEffect(() => {
    setPlayerItem(item.Id ?? null);
    return () => setPlayerItem(null);
  }, [item.Id, setPlayerItem]);

  useEffect(() => {
    if (!data) return;
    const previous = seen.current;
    seen.current = new Map(data.map((j) => [j.id, j.status]));
    if (!previous) return; // first load only records the state
    for (const job of data) {
      if (
        job.itemId !== item.Id ||
        job.status !== "done" ||
        !previous.has(job.id) ||
        previous.get(job.id) === "done"
      ) {
        continue;
      }
      toast.success(`${t("slowmo.ready")}: ${job.name}`, {
        duration: 15_000,
        action: {
          label: t("slowmo.watch"),
          onClick: async () => {
            // The library may only have found the file by now
            const fresh = (await refetch()).data?.MediaSources ?? [];
            const source = fresh.find((s) => norm(s.Path) === norm(job.output));
            if (!source) {
              toast.info(t("slowmo.not_in_library"));
              return;
            }
            switchSource(source, firstPartStartSeconds(job));
          },
        },
      });
    }
  }, [data, item.Id, t, refetch, switchSource]);

  const pending = pendingJobsForItem(data ?? [], item.Id);
  const job = pending.find((j) => j.status === "running") ?? pending[0];
  if (!job) return null;

  const label =
    job.status === "running"
      ? [
          `x${job.factor}`,
          `${Math.round(job.progress * 100)}%`,
          job.eta != null ? formatTimeString(job.eta, "s") : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : `x${job.factor} · ${t("slowmo.in_queue")}`;

  return (
    <View
      className='px-3 py-1 rounded-full'
      style={{
        backgroundColor: "rgba(0,0,0,0.45)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
      }}
    >
      <Text style={{ fontSize: 12, color: "#fbbf24" }}>{label}</Text>
    </View>
  );
};

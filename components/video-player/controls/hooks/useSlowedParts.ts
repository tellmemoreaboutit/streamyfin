import { useMemo } from "react";
import { useSlowmoJobs } from "@/hooks/useSlowmoJobs";
import {
  findJobForPath,
  isSlowmoSource,
  type SlowmoSegment,
  slowedParts,
} from "@/utils/slowmo";
import { usePlayerContext } from "../contexts/PlayerContext";

const NONE: SlowmoSegment[] = [];

/** Slowed parts (seconds, in this version's timeline) when a slowmo version plays. */
export function useSlowedParts(): SlowmoSegment[] {
  const { mediaSource } = usePlayerContext();
  const slowmo = !!mediaSource && isSlowmoSource(mediaSource);
  const { data } = useSlowmoJobs(slowmo);
  return useMemo(() => {
    const job = slowmo ? findJobForPath(data ?? [], mediaSource?.Path) : null;
    return job ? slowedParts(job) : NONE;
  }, [slowmo, data, mediaSource?.Path]);
}

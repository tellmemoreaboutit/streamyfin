import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { useQueryClient } from "@tanstack/react-query";
import { type FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import {
  type OptionGroup,
  PlatformDropdown,
} from "@/components/PlatformDropdown";
import { useHaptic } from "@/hooks/useHaptic";
import { useSettings } from "@/utils/atoms/settings";
import {
  createSlowmoJob,
  formatSeconds,
  nudgeSegment,
  SLOWMO_FACTORS,
  type SlowmoSegment,
} from "@/utils/slowmo";
import { ICON_SIZES } from "./constants";

const NUDGE = 0.5; // seconds

interface Props {
  item: BaseItemDto;
  // Playback position in milliseconds
  progress: SharedValue<number>;
}

// Button marks segment start/end alternately; the pill next to it lists the
// marked segments (remove one) and sends them with a chosen factor.
export const SlowmoControl: FC<Props> = ({ item, progress }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const haptic = useHaptic("light");
  const [segments, setSegments] = useState<SlowmoSegment[]>([]);
  // Start in seconds of the segment being marked; null between segments
  const [pendingStart, setPendingStart] = useState<number | null>(null);

  const onMark = () => {
    haptic();
    const now = progress.value / 1000;
    if (pendingStart === null) {
      setPendingStart(now);
      toast.info(t("slowmo.mark_start"));
      return;
    }
    const start = Math.min(pendingStart, now);
    const end = Math.max(pendingStart, now);
    setSegments((prev) => [...prev, { start, end }]);
    setPendingStart(null);
    toast.info(t("slowmo.mark_end"));
  };

  const send = (factor: number) => {
    if (!item.Id) return;
    createSlowmoJob(settings, { itemId: item.Id, segments, factor })
      .then(() => {
        toast.success(t("slowmo.queued"));
        queryClient.invalidateQueries({ queryKey: ["slowmo-jobs"] });
        setSegments([]);
      })
      .catch((e) => toast.error(`${t("slowmo.failed")}: ${e.message}`));
  };

  const groups = useMemo<OptionGroup[]>(
    () => [
      {
        title: t("slowmo.segments"),
        options: [],
      },
      // One group per segment: its times, nudges for each edge, remove
      ...segments.map((s, i) => ({
        title: `${i + 1}. ${formatSeconds(s.start)} - ${formatSeconds(s.end)}`,
        options: [
          ...(["start", "end"] as const).flatMap((edge) =>
            ([-NUDGE, NUDGE] as const).map((delta) => ({
              type: "action" as const,
              label: `${t(`slowmo.${edge}`)} ${delta > 0 ? "+" : "-"}${NUDGE} s`,
              onPress: () =>
                setSegments((prev) =>
                  prev.map((seg, j) =>
                    j === i ? nudgeSegment(seg, edge, delta) : seg,
                  ),
                ),
            })),
          ),
          {
            type: "action" as const,
            label: t("slowmo.remove"),
            onPress: () =>
              setSegments((prev) => prev.filter((_, j) => j !== i)),
          },
        ],
      })),
      {
        title: t("slowmo.send"),
        options: SLOWMO_FACTORS.map((factor) => ({
          type: "action" as const,
          label: `x${factor}`,
          onPress: () => send(factor),
        })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segments,
      t,
      settings.slowmoServerUrl,
      settings.slowmoToken,
      item.Id,
      queryClient,
    ],
  );

  return (
    <View className='flex flex-row items-center'>
      <TouchableOpacity
        onPress={onMark}
        className='aspect-square flex flex-col rounded-xl items-center justify-center p-2'
      >
        <Ionicons
          name='speedometer'
          size={ICON_SIZES.HEADER}
          color={pendingStart === null ? "white" : "#f59e0b"}
        />
      </TouchableOpacity>
      {segments.length > 0 && (
        <PlatformDropdown
          title={t("slowmo.title")}
          groups={groups}
          expoUIConfig={{}}
          bottomSheetConfig={{ enablePanDownToClose: true }}
          trigger={
            <View className='px-2 py-1 rounded-xl bg-neutral-800'>
              <Text className='text-xs'>{segments.length}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

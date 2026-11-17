import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { type FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Linking, TouchableOpacity, View } from "react-native";
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
  slowmoPendingStartAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";
import {
  createSlowmoJob,
  getSlowmoJobs,
  isSlowmoSource,
  mapPositionBetweenVersions,
  SLOWMO_FACTORS,
  slowmoWebGuiUrl,
} from "@/utils/slowmo";
import { ICON_SIZES } from "./constants";
import { usePlayerContext } from "./contexts/PlayerContext";

interface Props {
  item: BaseItemDto;
  // Playback position in milliseconds
  progress: SharedValue<number>;
  pause?: () => void;
}

// The button marks segment start/end alternately (the timeline above the seek
// bar shows and edits them); the menu next to it sends them with a factor and
// opens the web GUI at the current position.
export const SlowmoControl: FC<Props> = ({ item, progress, pause }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { mediaSource } = usePlayerContext();
  const queryClient = useQueryClient();
  const haptic = useHaptic("light");
  const [segments, setSegments] = useAtom(slowmoSegmentsAtom);
  const [pendingStart, setPendingStart] = useAtom(slowmoPendingStartAtom);
  const [, setSelected] = useAtom(slowmoSelectedAtom);

  // The selection belongs to this player session
  useEffect(
    () => () => {
      setSegments([]);
      setPendingStart(null);
      setSelected(null);
    },
    [setSegments, setPendingStart, setSelected],
  );

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
    setSelected(segments.length);
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
        setSelected(null);
      })
      .catch((e) => toast.error(`${t("slowmo.failed")}: ${e.message}`));
  };

  const openWebGui = async () => {
    if (!item.Id) return;
    pause?.();
    let seconds = progress.value / 1000;
    // The web GUI works on the original: map back from a slowmo version
    if (mediaSource && isSlowmoSource(mediaSource)) {
      try {
        seconds = mapPositionBetweenVersions(
          seconds,
          { path: mediaSource.Path, slowmo: true },
          { slowmo: false },
          await getSlowmoJobs(settings),
        );
      } catch {}
    }
    Linking.openURL(
      slowmoWebGuiUrl(settings.slowmoServerUrl, item.Id, seconds),
    ).catch((e) => toast.error(`${t("slowmo.failed")}: ${e.message}`));
  };

  const groups = useMemo<OptionGroup[]>(
    () => [
      {
        options: [
          {
            type: "action" as const,
            label: t("slowmo.open_web_gui"),
            onPress: openWebGui,
          },
        ],
      },
      ...(segments.length > 0
        ? [
            {
              title: t("slowmo.send"),
              options: SLOWMO_FACTORS.map((factor) => ({
                type: "action" as const,
                label: `x${factor}`,
                onPress: () => send(factor),
              })),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segments,
      t,
      settings.slowmoServerUrl,
      settings.slowmoToken,
      item.Id,
      mediaSource,
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
      <PlatformDropdown
        title={t("slowmo.title")}
        groups={groups}
        expoUIConfig={{}}
        bottomSheetConfig={{ enablePanDownToClose: true }}
        trigger={
          <View className='px-2 py-1 rounded-xl bg-neutral-800'>
            {segments.length > 0 ? (
              <Text className='text-xs'>{segments.length}</Text>
            ) : (
              <Ionicons name='globe-outline' size={14} color='white' />
            )}
          </View>
        }
      />
    </View>
  );
};

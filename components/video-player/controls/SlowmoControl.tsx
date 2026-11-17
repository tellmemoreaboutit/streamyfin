import { Ionicons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { type FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import { PlatformDropdown } from "@/components/PlatformDropdown";
import { useSettings } from "@/utils/atoms/settings";
import {
  slowmoLoopAtom,
  slowmoModeAtom,
  slowmoPendingStartAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";
import {
  createSlowmoJob,
  getSlowmoJobs,
  isSlowmoSource,
  mapPositionBetweenVersions,
  slowmoWebGuiUrl,
} from "@/utils/slowmo";
import { ICON_SIZES } from "./constants";
import { usePlayerContext } from "./contexts/PlayerContext";
import { buildSlowmoMenuGroups } from "./utils/slowmoMenu";

interface Props {
  item: BaseItemDto;
  // Playback position in milliseconds
  progress: SharedValue<number>;
  pause?: () => void;
}

// The header button opens the Slowmo menu (mode toggle, web GUI, send, clear,
// whole movie). Marking happens in the toolbar next to the seek bar, which the
// mode toggle shows.
export const SlowmoControl: FC<Props> = ({ item, progress, pause }) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const { mediaSource } = usePlayerContext();
  const queryClient = useQueryClient();
  const [segments, setSegments] = useAtom(slowmoSegmentsAtom);
  const [, setPendingStart] = useAtom(slowmoPendingStartAtom);
  const [mode, setMode] = useAtom(slowmoModeAtom);
  const [, setSelected] = useAtom(slowmoSelectedAtom);
  const [, setLoop] = useAtom(slowmoLoopAtom);

  // The selection belongs to this player session
  useEffect(
    () => () => {
      setSegments([]);
      setPendingStart(null);
      setSelected(null);
      setLoop({ on: false, rate: 1 });
      setMode(false);
    },
    [setSegments, setPendingStart, setSelected, setLoop, setMode],
  );

  const send = (factor: number, whole = false) => {
    if (!item.Id) return;
    createSlowmoJob(settings, {
      itemId: item.Id,
      segments: whole ? [] : segments,
      factor,
    })
      .then(() => {
        toast.success(t("slowmo.queued"));
        updateSettings({ slowmoLastFactor: factor });
        queryClient.invalidateQueries({ queryKey: ["slowmo-jobs"] });
        if (!whole) {
          setSegments([]);
          setSelected(null);
        }
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

  const groups = useMemo(
    () =>
      buildSlowmoMenuGroups({
        t,
        segmentCount: segments.length,
        lastFactor: settings.slowmoLastFactor,
        hasServerUrl: !!settings.slowmoServerUrl,
        modeOn: mode,
        onToggleMode: () => setMode((m) => !m),
        onClear: () => {
          setSegments([]);
          setPendingStart(null);
          setSelected(null);
        },
        onSendWhole: (factor) => send(factor, true),
        onOpenWebGui: openWebGui,
        onSend: send,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      segments,
      mode,
      t,
      settings.slowmoServerUrl,
      settings.slowmoToken,
      settings.slowmoLastFactor,
      item.Id,
      mediaSource,
      queryClient,
    ],
  );

  // Stable element: PlatformDropdown is memoized on the trigger's identity
  const trigger = useMemo(
    () => (
      <View className='flex items-center justify-center w-11 h-11'>
        <Ionicons
          name='speedometer'
          size={ICON_SIZES.HEADER}
          color={mode ? "#fbbf24" : "white"}
        />
        {segments.length > 0 && (
          <View
            style={{
              position: "absolute",
              top: 2,
              right: 0,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              paddingHorizontal: 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fbbf24",
            }}
          >
            <Text style={{ fontSize: 10, color: "black", fontWeight: "700" }}>
              {segments.length}
            </Text>
          </View>
        )}
      </View>
    ),
    [segments.length, mode],
  );

  return (
    <PlatformDropdown
      title={t("slowmo.title")}
      groups={groups}
      expoUIConfig={{}}
      bottomSheetConfig={{ enablePanDownToClose: true }}
      trigger={trigger}
    />
  );
};

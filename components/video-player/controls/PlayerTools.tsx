import { Ionicons } from "@expo/vector-icons";
import { useAtom, useAtomValue } from "jotai";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Text } from "@/components/common/Text";
import { useSettings } from "@/utils/atoms/settings";
import {
  slowmoModeAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";
import {
  nextPartStart,
  nextSegmentIndex,
  prevPartStart,
  prevSegmentIndex,
} from "@/utils/slowmo";
import { useSlowedParts } from "./hooks/useSlowedParts";
import { useSlowmoMark } from "./hooks/useSlowmoMark";
import { SlowmoJobStatus } from "./SlowmoJobStatus";

const PILL = {
  height: 32,
  paddingHorizontal: 12,
  borderRadius: 16,
  backgroundColor: "rgba(0,0,0,0.45)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  flexDirection: "row" as const,
  alignItems: "center" as const,
  marginLeft: 8,
};

interface Props {
  progress: SharedValue<number>;
  isPlaying: boolean;
  seek: (ms: number) => void;
  /** Steps the paused picture by one frame. */
  stepFrame: (direction: 1 | -1) => void;
}

const MARK_COLOR = "#fbbf24";

// A row above the seek bar: the movie's Slowmo job on the left, then (for a
// slowmo version) jumps between its slowed parts and, while paused, frame
// steps for marking segment edges precisely.
export const PlayerTools: FC<Props> = ({
  progress,
  isPlaying,
  seek,
  stepFrame,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const parts = useSlowedParts();
  const slowmoOn = !!settings.slowmoServerUrl && !Platform.isTV;
  const [mode, setMode] = useAtom(slowmoModeAtom);
  const segments = useAtomValue(slowmoSegmentsAtom);
  const [selected, setSelected] = useAtom(slowmoSelectedAtom);
  const { mark, pending } = useSlowmoMark(progress);
  const toolbar = slowmoOn && mode;

  // Jump to a marked segment and open it in the timeline editor
  const goToSegment = (index: number | null) => {
    if (index === null) return;
    setSelected(index);
    seek(segments[index].start * 1000);
  };

  const jump = (target: number | null) => {
    if (target !== null) seek(target * 1000);
  };

  const frameButtons = (
    <>
      <TouchableOpacity
        style={PILL}
        onPress={() => stepFrame(-1)}
        accessibilityLabel={t("player.frame_back")}
      >
        <Ionicons name='chevron-back' size={14} color='white' />
        <Text style={{ fontSize: 12, marginLeft: 2 }}>1f</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={PILL}
        onPress={() => stepFrame(1)}
        accessibilityLabel={t("player.frame_forward")}
      >
        <Text style={{ fontSize: 12, marginRight: 2 }}>1f</Text>
        <Ionicons name='chevron-forward' size={14} color='white' />
      </TouchableOpacity>
    </>
  );

  return (
    <>
      {toolbar && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            marginBottom: 4,
          }}
        >
          <TouchableOpacity
            style={[
              PILL,
              {
                height: 36,
                paddingHorizontal: 16,
                borderRadius: 18,
                backgroundColor: pending ? MARK_COLOR : "rgba(245,158,11,0.35)",
                borderColor: MARK_COLOR,
              },
            ]}
            onPress={mark}
            accessibilityLabel={t(pending ? "slowmo.end" : "slowmo.mark")}
          >
            <Ionicons
              name={pending ? "stop-circle" : "radio-button-on"}
              size={16}
              color={pending ? "black" : MARK_COLOR}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                marginLeft: 6,
                color: pending ? "black" : "white",
              }}
            >
              {t(pending ? "slowmo.end" : "slowmo.mark")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={PILL}
            onPress={() =>
              goToSegment(prevSegmentIndex(progress.value / 1000, segments))
            }
            accessibilityLabel={t("slowmo.prev_segment")}
          >
            <Ionicons name='chevron-back' size={16} color={MARK_COLOR} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 12,
              marginLeft: 8,
              minWidth: 30,
              textAlign: "center",
            }}
          >
            {segments.length > 0
              ? // rank in time order, so ‹ › step the counter by one
                `${selected !== null && segments[selected] ? segments.filter((s) => s.start < segments[selected].start).length + 1 : "-"}/${segments.length}`
              : "0"}
          </Text>
          <TouchableOpacity
            style={PILL}
            onPress={() =>
              goToSegment(nextSegmentIndex(progress.value / 1000, segments))
            }
            accessibilityLabel={t("slowmo.next_segment")}
          >
            <Ionicons name='chevron-forward' size={16} color={MARK_COLOR} />
          </TouchableOpacity>
          {frameButtons}
          <TouchableOpacity
            style={PILL}
            onPress={() => setMode(false)}
            accessibilityLabel={t("slowmo.exit")}
          >
            <Ionicons name='close' size={16} color='white' />
          </TouchableOpacity>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {slowmoOn && <SlowmoJobStatus />}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {parts.length > 0 && (
            <>
              <TouchableOpacity
                style={PILL}
                onPress={() =>
                  jump(prevPartStart(progress.value / 1000, parts))
                }
                accessibilityLabel={t("slowmo.prev_part")}
              >
                <Ionicons name='play-skip-back' size={14} color='#fbbf24' />
              </TouchableOpacity>
              <TouchableOpacity
                style={PILL}
                onPress={() =>
                  jump(nextPartStart(progress.value / 1000, parts))
                }
                accessibilityLabel={t("slowmo.next_part")}
              >
                <Ionicons name='play-skip-forward' size={14} color='#fbbf24' />
              </TouchableOpacity>
            </>
          )}
          {!isPlaying && !toolbar && frameButtons}
        </View>
      </View>
    </>
  );
};

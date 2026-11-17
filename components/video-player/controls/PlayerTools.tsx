import { Ionicons } from "@expo/vector-icons";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Text } from "@/components/common/Text";
import { useSettings } from "@/utils/atoms/settings";
import { nextPartStart, prevPartStart } from "@/utils/slowmo";
import { useSlowedParts } from "./hooks/useSlowedParts";
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

  const jump = (target: number | null) => {
    if (target !== null) seek(target * 1000);
  };

  return (
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
              onPress={() => jump(prevPartStart(progress.value / 1000, parts))}
              accessibilityLabel={t("slowmo.prev_part")}
            >
              <Ionicons name='play-skip-back' size={14} color='#fbbf24' />
            </TouchableOpacity>
            <TouchableOpacity
              style={PILL}
              onPress={() => jump(nextPartStart(progress.value / 1000, parts))}
              accessibilityLabel={t("slowmo.next_part")}
            >
              <Ionicons name='play-skip-forward' size={14} color='#fbbf24' />
            </TouchableOpacity>
          </>
        )}
        {!isPlaying && (
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
        )}
      </View>
    </View>
  );
};

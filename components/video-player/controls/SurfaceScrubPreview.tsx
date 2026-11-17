import type { ComponentProps, FC } from "react";
import { View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Text } from "@/components/common/Text";
import { CHROME } from "./constants";
import { TrickplayBubble } from "./TrickplayBubble";

// TrickplayBubble hangs 62px left of its anchor and is 225px wide
const BUBBLE_LEFT = 62;
const BUBBLE_RIGHT = 163;

interface Props extends ComponentProps<typeof TrickplayBubble> {
  /** Seek position in ms, written while dragging on the video. */
  position: SharedValue<number>;
  max: SharedValue<number>;
  trackWidth: number;
}

// Preview for a scrub driven by dragging on the video rather than the slider
// thumb: the slider only shows its own bubble for its own gesture, so this one
// follows the target position along the seek bar.
export const SurfaceScrubPreview: FC<Props> = ({
  position,
  max,
  trackWidth,
  ...bubble
}) => {
  const style = useAnimatedStyle(() => {
    const x = max.value > 0 ? (position.value / max.value) * trackWidth : 0;
    return {
      left: Math.min(
        Math.max(x, BUBBLE_LEFT),
        Math.max(trackWidth - BUBBLE_RIGHT, BUBBLE_LEFT),
      ),
    };
  }, [trackWidth]);
  const { time } = bubble;
  const label = `${time.hours > 0 ? `${time.hours}:` : ""}${String(
    time.minutes,
  ).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`;

  return (
    <Animated.View
      pointerEvents='none'
      // Just above the track, which is centred in the taller touch area
      style={[
        {
          position: "absolute",
          bottom:
            CHROME.SCRUBBER_HEIGHT / 2 + CHROME.TRACK_HEIGHT_SCRUBBING / 2 + 6,
          width: 0,
          height: 0,
        },
        style,
      ]}
    >
      {bubble.trickPlayUrl && bubble.trickplayInfo ? (
        <TrickplayBubble {...bubble} />
      ) : (
        <View
          className='absolute rounded-full px-3 py-1'
          style={{
            bottom: 0,
            left: -30,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <Text style={{ fontSize: 13, fontVariant: ["tabular-nums"] }}>
            {label}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

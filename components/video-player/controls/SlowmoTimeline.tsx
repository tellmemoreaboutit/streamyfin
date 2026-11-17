import { Ionicons } from "@expo/vector-icons";
import { useAtom, useAtomValue } from "jotai";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, TouchableOpacity, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Text } from "@/components/common/Text";
import {
  slowmoLoopAtom,
  slowmoPendingStartAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";
import {
  formatSeconds,
  NUDGE_STEPS,
  nudgeSegment,
  rangeFractions,
  setSegmentEdge,
} from "@/utils/slowmo";
import { useSlowedParts } from "./hooks/useSlowedParts";

const BAR_HEIGHT = 16;
const MIN_WIDTH_PX = 6;
const COLOR = "rgba(245,158,11,0.65)";
const COLOR_SELECTED = "#fbbf24";
// Parts a slowmo version has slowed down (informational, not editable)
const COLOR_PART = "rgba(56,189,248,0.7)";
const PART_HEIGHT = 5;
const LOOP_RATES = [1, 0.5, 0.25] as const;

interface Props {
  // Playback position in milliseconds
  progress: SharedValue<number>;
  durationMs: number;
  /** Seeks to a position in milliseconds. */
  seek: (ms: number) => void;
}

// Marked slowmo segments drawn above the seek bar (same width, so the ranges
// line up with it), the pending start as a marker growing up to the playhead,
// and an editor for the tapped segment.
export const SlowmoTimeline: FC<Props> = ({ progress, durationMs, seek }) => {
  const { t } = useTranslation();
  const [segments, setSegments] = useAtom(slowmoSegmentsAtom);
  const pendingStart = useAtomValue(slowmoPendingStartAtom);
  const [selected, setSelected] = useAtom(slowmoSelectedAtom);
  const [width, setWidth] = useState(0);
  const [loop, setLoop] = useAtom(slowmoLoopAtom);
  const parts = useSlowedParts();
  const durationSec = durationMs / 1000;

  const pendingStyle = useAnimatedStyle(() => {
    if (pendingStart === null || durationSec <= 0) return { opacity: 0 };
    const r = rangeFractions(pendingStart, progress.value / 1000, durationSec);
    return {
      opacity: 1,
      left: `${(r?.left ?? 0) * 100}%`,
      width: `${(r?.width ?? 0) * 100}%`,
    };
  }, [pendingStart, durationSec]);

  const editing = segments.length > 0 || pendingStart !== null;
  if (!editing && parts.length === 0) return null;

  const seg = selected !== null ? segments[selected] : undefined;
  const update = (
    fn: (s: (typeof segments)[number]) => (typeof segments)[number],
  ) => setSegments((prev) => prev.map((s, i) => (i === selected ? fn(s) : s)));
  const now = () => progress.value / 1000;

  const pill = (label: string, onPress: () => void, key?: string) => (
    <TouchableOpacity
      key={key ?? label}
      onPress={onPress}
      hitSlop={6}
      className='px-2 py-1 rounded-full bg-white/20 mx-0.5'
    >
      <Text className='text-xs'>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View className='w-full'>
      {seg && selected !== null && (
        <View
          className='p-2 mb-1'
          style={{ borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View className='flex flex-row items-center justify-between mb-1'>
            <Text className='text-xs font-bold'>
              {selected + 1}. {formatSeconds(seg.start)} -{" "}
              {formatSeconds(seg.end)}
            </Text>
            <View className='flex flex-row items-center'>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => {
                  setSegments((prev) => prev.filter((_, i) => i !== selected));
                  setSelected(null);
                }}
                accessibilityLabel={t("slowmo.remove")}
              >
                <Ionicons name='trash-outline' size={18} color='#f87171' />
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => setSelected(null)}
                className='ml-3'
              >
                <Ionicons name='close' size={18} color='white' />
              </TouchableOpacity>
            </View>
          </View>
          {(["start", "end"] as const).map((edge) => (
            <View key={edge} className='flex flex-row items-center my-0.5'>
              <Text className='text-xs w-16'>{t(`slowmo.${edge}`)}</Text>
              {[...NUDGE_STEPS]
                .reverse()
                .map((step) =>
                  pill(`-${step}`, () =>
                    update((s) => nudgeSegment(s, edge, -step)),
                  ),
                )}
              <Text className='text-xs mx-1 w-12 text-center'>
                {formatSeconds(seg[edge])}
              </Text>
              {NUDGE_STEPS.map((step) =>
                pill(`+${step}`, () =>
                  update((s) => nudgeSegment(s, edge, step)),
                ),
              )}
              {pill(t("slowmo.set_to_now"), () =>
                update((s) => setSegmentEdge(s, edge, now())),
              )}
            </View>
          ))}
          <View className='flex flex-row items-center my-0.5'>
            <TouchableOpacity
              hitSlop={6}
              onPress={() => setLoop((l) => ({ ...l, on: !l.on }))}
              className='flex flex-row items-center px-2 py-1 rounded-full mx-0.5'
              style={{
                backgroundColor: loop.on
                  ? COLOR_SELECTED
                  : "rgba(255,255,255,0.2)",
              }}
            >
              <Ionicons
                name='repeat'
                size={14}
                color={loop.on ? "black" : "white"}
              />
              <Text
                className='text-xs ml-1'
                style={{ color: loop.on ? "black" : "white" }}
              >
                {t("slowmo.loop")}
              </Text>
            </TouchableOpacity>
            {LOOP_RATES.map((rate) => (
              <TouchableOpacity
                key={rate}
                hitSlop={6}
                onPress={() => setLoop({ on: true, rate })}
                className='px-2 py-1 rounded-full mx-0.5'
                style={{
                  backgroundColor:
                    loop.rate === rate
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.15)",
                }}
              >
                <Text className='text-xs'>{rate}x</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <View
        style={{ height: editing ? BAR_HEIGHT : PART_HEIGHT }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {parts.map((p, i) => {
          const r = rangeFractions(p.start, p.end, durationSec);
          if (!r) return null;
          return (
            <View
              key={`part-${i}`}
              pointerEvents='none'
              style={{
                position: "absolute",
                bottom: 0,
                height: PART_HEIGHT,
                left: r.left * width,
                width: Math.max(r.width * width, 3),
                borderRadius: 3,
                backgroundColor: COLOR_PART,
              }}
            />
          );
        })}
        {segments.map((s, i) => {
          const r = rangeFractions(s.start, s.end, durationSec);
          if (!r) return null;
          return (
            <Pressable
              key={i}
              onPress={() => {
                // Select and jump to its start; the editor's close button deselects
                setSelected(i);
                seek(s.start * 1000);
              }}
              hitSlop={{ top: 8, bottom: 8 }}
              style={{
                position: "absolute",
                top: selected === i ? -3 : 0,
                height: selected === i ? BAR_HEIGHT + 6 : BAR_HEIGHT,
                left: r.left * width,
                width: Math.max(r.width * width, MIN_WIDTH_PX),
                borderRadius: 4,
                backgroundColor: selected === i ? COLOR_SELECTED : COLOR,
                borderWidth: selected === i ? 2 : 0,
                borderColor: "white",
              }}
            />
          );
        })}
        {pendingStart !== null && (
          <>
            <Animated.View
              pointerEvents='none'
              style={[
                {
                  position: "absolute",
                  top: 0,
                  height: BAR_HEIGHT,
                  minWidth: 2,
                  borderRadius: 4,
                  backgroundColor: "rgba(245,158,11,0.35)",
                  borderColor: COLOR_SELECTED,
                  borderLeftWidth: 2,
                },
                pendingStyle,
              ]}
            />
            <View
              pointerEvents='none'
              style={{
                position: "absolute",
                top: -2,
                height: BAR_HEIGHT + 4,
                width: 3,
                borderRadius: 2,
                backgroundColor: COLOR_SELECTED,
                left:
                  (rangeFractions(pendingStart, pendingStart, durationSec)
                    ?.left ?? 0) *
                    width -
                  1,
              }}
            />
          </>
        )}
      </View>
    </View>
  );
};

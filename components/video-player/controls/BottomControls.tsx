import { Ionicons } from "@expo/vector-icons";
import type {
  BaseItemDto,
  ChapterInfo,
} from "@jellyfin/sdk/lib/generated-client";
import { type FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Slider } from "react-native-awesome-slider";
import { type SharedValue } from "react-native-reanimated";
import { ChapterList } from "@/components/chapters/ChapterList";
import { ChapterTicks } from "@/components/chapters/ChapterTicks";
import { Text } from "@/components/common/Text";
import { useControlsSafeAreaInsets } from "@/hooks/useControlsSafeAreaInsets";
import {
  chapterMarkers,
  chapterNameAt,
  hasChapterMarkers,
} from "@/utils/chapters";
import { CHROME } from "./constants";
import { PlayerTools } from "./PlayerTools";
import { SlowmoTimeline } from "./SlowmoTimeline";
import { SurfaceScrubPreview } from "./SurfaceScrubPreview";
import { TimeDisplay } from "./TimeDisplay";
import { TrickplayBubble } from "./TrickplayBubble";

interface BottomControlsProps {
  item: BaseItemDto;
  /** Item chapters, used for the tick overlay and chapter list. */
  chapters?: ChapterInfo[] | null;
  /** Total media duration in milliseconds. */
  durationMs: number;
  showControls: boolean;
  isSliding: boolean;
  showRemoteBubble: boolean;
  currentTime: number;
  remainingTime: number;
  handleControlsInteraction: () => void;

  // Slider props
  min: SharedValue<number>;
  max: SharedValue<number>;
  effectiveProgress: SharedValue<number>;
  cacheProgress: SharedValue<number>;
  handleSliderStart: () => void;
  handleSliderComplete: (value: number) => void;
  handleSliderChange: (value: number) => void;
  handleTouchStart: () => void;
  handleTouchEnd: () => void;
  /** Programmatic seek (chapter list, hotkeys) — bypasses slide gesture state. */
  seekTo: (value: number) => void;

  // Trickplay props
  trickPlayUrl: {
    x: number;
    y: number;
    url: string;
  } | null;
  trickplayInfo: {
    aspectRatio?: number;
    data: {
      TileWidth?: number;
      TileHeight?: number;
    };
  } | null;
  time: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  /** Playback position in ms, for the slowmo timeline. */
  progress?: SharedValue<number>;
  /** Set while a drag on the video scrubs; shows the preview along the bar. */
  surfaceScrubbing?: boolean;
  /** Target of that scrub in ms. */
  surfaceScrubPosition?: SharedValue<number>;
  /** Fine-scrub speed of that drag (1 = normal), shown while below 1. */
  surfaceScrubRate?: number;
  isPlaying: boolean;
  /** Seek to an absolute position in ms. */
  seek: (ms: number) => void;
  stepFrame: (direction: 1 | -1) => void;
}

export const BottomControls: FC<BottomControlsProps> = ({
  chapters,
  durationMs,
  showControls,
  isSliding,
  showRemoteBubble,
  currentTime,
  remainingTime,
  handleControlsInteraction,
  min,
  max,
  effectiveProgress,
  cacheProgress,
  handleSliderStart,
  handleSliderComplete,
  handleSliderChange,
  handleTouchStart,
  handleTouchEnd,
  seekTo,
  trickPlayUrl,
  trickplayInfo,
  time,
  progress,
  surfaceScrubbing = false,
  surfaceScrubPosition,
  surfaceScrubRate = 1,
  isPlaying,
  seek,
  stepFrame,
}) => {
  const { t } = useTranslation();
  const insets = useControlsSafeAreaInsets();
  const [chapterListVisible, setChapterListVisible] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackHeight =
    isSliding || surfaceScrubbing
      ? CHROME.TRACK_HEIGHT_SCRUBBING
      : CHROME.TRACK_HEIGHT;
  const rateKey =
    surfaceScrubRate <= 0.1
      ? "player.scrub_fine"
      : surfaceScrubRate <= 0.25
        ? "player.scrub_quarter"
        : "player.scrub_half";

  const chapterMarkerList = useMemo(
    () => chapterMarkers(chapters, durationMs),
    [chapters, durationMs],
  );
  const hasChapters = useMemo(
    () => hasChapterMarkers(chapters, durationMs),
    [chapters, durationMs],
  );

  // Current chapter name for the always-visible header label (live playback).
  const currentChapterName = useMemo(
    () => (hasChapters ? chapterNameAt(currentTime, chapters) : null),
    [hasChapters, currentTime, chapters],
  );

  // Chapter name at the scrubbed position for the trickplay bubble. `time` is
  // an {h,m,s} object derived from the slider's dragged value — convert back
  // to ms for the lookup. Only useful while actively scrubbing.
  const scrubChapterName = useMemo(() => {
    if (!hasChapters) return null;
    const scrubMs =
      (time.hours * 3600 + time.minutes * 60 + time.seconds) * 1000;
    return chapterNameAt(scrubMs, chapters);
  }, [hasChapters, time.hours, time.minutes, time.seconds, chapters]);

  return (
    <View
      style={[
        {
          position: "absolute",
          right: insets.right,
          left: insets.left,
          bottom: Math.max(insets.bottom - 17, 0),
          paddingHorizontal: 16,
        },
      ]}
      className={"flex flex-col"}
      onTouchStart={handleControlsInteraction}
    >
      {/* Current chapter on the left, chapter list on the right (native layout) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 20,
        }}
        pointerEvents={showControls ? "box-none" : "none"}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {currentChapterName ?? ""}
        </Text>
        {surfaceScrubbing && surfaceScrubRate < 1 && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <Text style={{ fontSize: 12 }}>{t(rateKey)}</Text>
          </View>
        )}
        {hasChapters && (
          <Pressable
            onPress={() => setChapterListVisible(true)}
            hitSlop={10}
            accessibilityRole='button'
            accessibilityLabel={t("chapters.open")}
          >
            <Ionicons name='bookmark-outline' size={20} color='white' />
          </Pressable>
        )}
      </View>
      <PlayerTools
        progress={progress ?? effectiveProgress}
        isPlaying={isPlaying}
        seek={seek}
        stepFrame={stepFrame}
      />
      <View
        className={"flex flex-col-reverse rounded-lg items-center mb-2"}
        pointerEvents={showControls ? "box-none" : "none"}
      >
        <View className={"flex flex-col w-full shrink"}>
          {progress && (
            <SlowmoTimeline progress={progress} durationMs={durationMs} />
          )}
          <View
            style={{
              height: CHROME.SCRUBBER_HEIGHT,
              justifyContent: "center",
              alignItems: "stretch",
              // Allow chapter ticks taller than the 10px track to bleed out
              // top/bottom (RN defaults to overflow: "hidden" on Android).
              overflow: "visible",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {surfaceScrubbing && surfaceScrubPosition && (
              <SurfaceScrubPreview
                position={surfaceScrubPosition}
                max={max}
                trackWidth={trackWidth}
                trickPlayUrl={trickPlayUrl}
                trickplayInfo={trickplayInfo}
                time={time}
                chapterName={scrubChapterName}
              />
            )}
            <Slider
              theme={{
                maximumTrackTintColor: "rgba(255,255,255,0.25)",
                minimumTrackTintColor: "#fff",
                cacheTrackTintColor: "rgba(255,255,255,0.4)",
                bubbleBackgroundColor: "#fff",
                bubbleTextColor: "#666",
                heartbeatColor: "#999",
              }}
              renderThumb={() => null}
              cache={cacheProgress}
              onSlidingStart={handleSliderStart}
              onSlidingComplete={handleSliderComplete}
              onValueChange={handleSliderChange}
              containerStyle={{
                borderRadius: 100,
              }}
              panHitSlop={{ top: 18, bottom: 18, left: 0, right: 0 }}
              renderBubble={() =>
                (isSliding || showRemoteBubble) && (
                  <TrickplayBubble
                    trickPlayUrl={trickPlayUrl}
                    trickplayInfo={trickplayInfo}
                    time={time}
                    chapterName={scrubChapterName}
                  />
                )
              }
              sliderHeight={trackHeight}
              thumbWidth={0}
              progress={effectiveProgress}
              minimumValue={min}
              maximumValue={max}
            />
            <ChapterTicks
              markers={chapterMarkerList}
              height={trackHeight - 2}
            />
          </View>
          <TimeDisplay
            currentTime={currentTime}
            remainingTime={remainingTime}
          />
        </View>
      </View>
      <ChapterList
        visible={chapterListVisible}
        chapters={chapters}
        currentPositionMs={currentTime}
        onSeek={seekTo}
        onClose={() => setChapterListVisible(false)}
      />
    </View>
  );
};

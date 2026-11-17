import type { FC } from "react";
import { View } from "react-native";
import { Image } from "@/components/common/ServerImage";
import { Text } from "@/components/common/Text";
import { CONTROLS_CONSTANTS } from "./constants";

// Slightly larger preview (scale 1.6 vs old 1.4) to give the overlay text
// more room and feel closer to the Jellyfin web style.
const BASE_IMAGE_SCALE = 1.6;
const BUBBLE_LEFT_OFFSET = 62;
const BUBBLE_WIDTH_MULTIPLIER = 1.5;

interface TrickplayBubbleProps {
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
  /** Scale factor for the image (default 1). Does not affect timestamp text. */
  imageScale?: number;
  /** Chapter name at the scrubbed position, if any. */
  chapterName?: string | null;
}

export const TrickplayBubble: FC<TrickplayBubbleProps> = ({
  trickPlayUrl,
  trickplayInfo,
  time,
  imageScale = 1,
  chapterName,
}) => {
  if (!trickPlayUrl || !trickplayInfo) {
    return null;
  }

  const { x, y, url } = trickPlayUrl;
  const tileWidth = CONTROLS_CONSTANTS.TILE_WIDTH;
  const tileHeight = tileWidth / trickplayInfo.aspectRatio!;
  const timeStr = `${time.hours > 0 ? `${time.hours}:` : ""}${
    time.minutes < 10 ? `0${time.minutes}` : time.minutes
  }:${time.seconds < 10 ? `0${time.seconds}` : time.seconds}`;

  const finalScale = BASE_IMAGE_SCALE * imageScale;

  return (
    <View
      style={{
        position: "absolute",
        // Sit just above the slider — high enough not to overlap the
        // progress bar, low enough to feel anchored to the thumb.
        left: -BUBBLE_LEFT_OFFSET * imageScale,
        bottom: 0,
        paddingTop: 12,
        paddingBottom: 5,
        width: tileWidth * BUBBLE_WIDTH_MULTIPLIER * imageScale,
        justifyContent: "center",
        alignItems: "center",
        // Bring the bubble in front of the player title / overlays.
        zIndex: 999,
        elevation: 10,
      }}
    >
      <View
        style={{
          width: tileWidth,
          height: tileHeight,
          alignSelf: "center",
          transform: [{ scale: finalScale }],
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.3)",
        }}
        className='bg-black/80 overflow-hidden'
      >
        <Image
          cachePolicy='memory-disk'
          style={{
            width: tileWidth * (trickplayInfo.data.TileWidth ?? 1),
            height:
              (tileWidth / (trickplayInfo.aspectRatio ?? 1)) *
              (trickplayInfo.data.TileHeight ?? 1),
            transform: [
              { translateX: -x * tileWidth },
              { translateY: -y * tileHeight },
            ],
          }}
          source={{ uri: url }}
          contentFit='cover'
        />
      </View>
      {/* Chapter and time under the thumbnail, as in the native bubble */}
      {chapterName ? (
        <Text
          numberOfLines={1}
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 11,
            marginTop: (tileHeight * (finalScale - 1)) / 2 + 4,
            maxWidth: tileWidth * finalScale,
          }}
        >
          {chapterName}
        </Text>
      ) : null}
      <View
        style={{
          marginTop: chapterName ? 2 : (tileHeight * (finalScale - 1)) / 2 + 4,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 12,
            fontVariant: ["tabular-nums"],
          }}
        >
          {timeStr}
        </Text>
      </View>
    </View>
  );
};

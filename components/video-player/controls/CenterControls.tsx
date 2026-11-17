import { Ionicons } from "@expo/vector-icons";
import type { FC } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";
import { useControlsSafeAreaInsets } from "@/hooks/useControlsSafeAreaInsets";
import { useSettings } from "@/utils/atoms/settings";
import AudioSlider from "./AudioSlider";
import BrightnessSlider from "./BrightnessSlider";
import { CHROME, ICON_SIZES } from "./constants";

interface CenterControlsProps {
  showControls: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  showAudioSlider: boolean;
  setShowAudioSlider: (show: boolean) => void;
  togglePlay: () => void;
  handleSkipBackward: () => void;
  handleSkipForward: () => void;
  // Chapter navigation props
  hasChapters?: boolean;
  hasPreviousChapter?: boolean;
  hasNextChapter?: boolean;
  goToPreviousChapter?: () => void;
  goToNextChapter?: () => void;
}

const sideButton = {
  width: CHROME.SIDE_BUTTON,
  height: CHROME.SIDE_BUTTON,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
const playButton = {
  width: CHROME.PLAY_BUTTON,
  height: CHROME.PLAY_BUTTON,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
const glyphBox = {
  position: "relative" as const,
  justifyContent: "center" as const,
  alignItems: "center" as const,
};
// The skip seconds drawn inside the arrow, like the numbered SF glyphs
const seekNumber = {
  position: "absolute" as const,
  color: "white",
  fontSize: 11,
  fontWeight: "bold" as const,
  bottom: 7,
};

export const CenterControls: FC<CenterControlsProps> = ({
  showControls,
  isPlaying,
  isBuffering,
  showAudioSlider,
  setShowAudioSlider,
  togglePlay,
  handleSkipBackward,
  handleSkipForward,
  hasChapters = false,
  hasPreviousChapter = false,
  hasNextChapter = false,
  goToPreviousChapter,
  goToNextChapter,
}) => {
  const { settings } = useSettings();
  const insets = useControlsSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        top: "50%",
        left: insets.left,
        right: insets.right,
        flexDirection: "row",
        // Native row: centred buttons with fixed spacing (TV keeps its spread)
        justifyContent: Platform.isTV ? "space-between" : "center",
        alignItems: "center",
        gap: Platform.isTV ? 0 : hasChapters ? 14 : 28,
        transform: [
          { translateY: Platform.isTV ? -22.5 : -CHROME.PLAY_BUTTON / 2 },
        ],
        paddingHorizontal: Platform.isTV ? (hasChapters ? "18%" : "28%") : 0,
      }}
      pointerEvents={showControls ? "box-none" : "none"}
    >
      {!settings?.hideBrightnessSlider && (
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            transform: [{ rotate: "270deg" }],
            left: 0,
            bottom: 30,
          }}
        >
          <BrightnessSlider />
        </View>
      )}

      {!Platform.isTV && (
        <TouchableOpacity onPress={handleSkipBackward} style={sideButton}>
          <View style={glyphBox}>
            <Ionicons
              name='refresh-outline'
              size={CHROME.SEEK_ICON}
              color='white'
              style={{
                transform: [{ scaleY: -1 }, { rotate: "180deg" }],
              }}
            />
            <Text style={seekNumber}>{settings?.rewindSkipTime}</Text>
          </View>
        </TouchableOpacity>
      )}

      {!Platform.isTV && hasChapters && (
        <TouchableOpacity
          onPress={goToPreviousChapter}
          disabled={!hasPreviousChapter}
          style={[sideButton, { opacity: hasPreviousChapter ? 1 : 0.3 }]}
        >
          <Ionicons name='play-back' size={CHROME.JUMP_ICON} color='white' />
        </TouchableOpacity>
      )}

      <View
        style={
          Platform.isTV
            ? { flex: 1, alignItems: "center" }
            : { width: CHROME.PLAY_BUTTON, height: CHROME.PLAY_BUTTON }
        }
      >
        <TouchableOpacity
          onPress={togglePlay}
          style={Platform.isTV ? undefined : playButton}
        >
          {!isBuffering ? (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={Platform.isTV ? ICON_SIZES.CENTER : CHROME.PLAY_ICON}
              color='white'
            />
          ) : (
            <Loader size={"large"} />
          )}
        </TouchableOpacity>
      </View>

      {!Platform.isTV && hasChapters && (
        <TouchableOpacity
          onPress={goToNextChapter}
          disabled={!hasNextChapter}
          style={[sideButton, { opacity: hasNextChapter ? 1 : 0.3 }]}
        >
          <Ionicons name='play-forward' size={CHROME.JUMP_ICON} color='white' />
        </TouchableOpacity>
      )}

      {!Platform.isTV && (
        <TouchableOpacity onPress={handleSkipForward} style={sideButton}>
          <View style={glyphBox}>
            <Ionicons
              name='refresh-outline'
              size={CHROME.SEEK_ICON}
              color='white'
            />
            <Text style={seekNumber}>{settings?.forwardSkipTime}</Text>
          </View>
        </TouchableOpacity>
      )}

      {!settings?.hideVolumeSlider && (
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            transform: [{ rotate: "270deg" }],
            bottom: 30,
            right: 0,
            opacity: showAudioSlider || showControls ? 1 : 0,
          }}
        >
          <AudioSlider setVisibility={setShowAudioSlider} />
        </View>
      )}
    </View>
  );
};

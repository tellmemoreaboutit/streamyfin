import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { type FC, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Text } from "@/components/common/Text";
import useRouter from "@/hooks/useAppRouter";
import { useControlsSafeAreaInsets } from "@/hooks/useControlsSafeAreaInsets";
import { useHaptic } from "@/hooks/useHaptic";
import { useOrientation } from "@/hooks/useOrientation";
import { OrientationLock } from "@/packages/expo-screen-orientation";
import { useSettings } from "@/utils/atoms/settings";
import { episodeSubtitle } from "@/utils/episodeLabel";
import { CHROME, ICON_SIZES } from "./constants";
import DropdownView from "./dropdown/DropdownView";
import { SlowmoControl } from "./SlowmoControl";
import { PlaybackSpeedScope } from "./utils/playback-speed-settings";
import { shouldShowPlayerMenu } from "./utils/shouldShowPlayerMenu";
import { VersionsButton } from "./VersionsButton";
import { type AspectRatio } from "./VideoScalingModeSelector";
import { ZoomToggle } from "./ZoomToggle";

interface HeaderControlsProps {
  item: BaseItemDto;
  showControls: boolean;
  startPictureInPicture?: () => Promise<void>;
  switchOnEpisodeMode: () => void;
  goToPreviousItem: () => void;
  goToNextItem: (options: { isAutoPlay?: boolean }) => void;
  previousItem?: BaseItemDto | null;
  nextItem?: BaseItemDto | null;
  // Prev/next video in the parent folder (home videos); episodes use the props above.
  siblingNav?: {
    hasPrevious: boolean;
    hasNext: boolean;
    goPrevious: () => void;
    goNext: () => void;
  };
  aspectRatio?: AspectRatio;
  isZoomedToFill?: boolean;
  onZoomToggle?: () => void;
  // Playback speed props
  playbackSpeed?: number;
  setPlaybackSpeed?: (speed: number, scope: PlaybackSpeedScope) => void;
  subtitleDelay?: number;
  onSubtitleDelayChange?: (seconds: number) => void;
  // Technical info props
  showTechnicalInfo?: boolean;
  onToggleTechnicalInfo?: () => void;
  onOpenSubtitleScale?: () => void;
  // Playback position in milliseconds
  progress?: SharedValue<number>;
  pause?: () => void;
}

export const HeaderControls: FC<HeaderControlsProps> = ({
  item,
  showControls,
  startPictureInPicture,
  switchOnEpisodeMode,
  goToPreviousItem,
  goToNextItem,
  previousItem,
  nextItem,
  siblingNav,
  aspectRatio: _aspectRatio = "default",
  isZoomedToFill = false,
  onZoomToggle,
  playbackSpeed = 1.0,
  setPlaybackSpeed,
  subtitleDelay = 0,
  onSubtitleDelayChange,
  showTechnicalInfo = false,
  onToggleTechnicalInfo,
  onOpenSubtitleScale,
  progress,
  pause,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useControlsSafeAreaInsets();
  const lightHapticFeedback = useHaptic("light");
  const { orientation, lockOrientation } = useOrientation();
  const [isTogglingOrientation, setIsTogglingOrientation] = useState(false);
  const { settings } = useSettings();
  const subtitle =
    item?.Type === "Episode"
      ? episodeSubtitle(t, item)
      : item?.Type === "Audio"
        ? item.Album
        : item?.ProductionYear;

  const onClose = async () => {
    lightHapticFeedback();
    router.back();
  };

  const toggleOrientation = useCallback(async () => {
    if (isTogglingOrientation) return;

    setIsTogglingOrientation(true);
    lightHapticFeedback();

    try {
      const isPortrait =
        orientation === OrientationLock.PORTRAIT_UP ||
        orientation === OrientationLock.PORTRAIT_DOWN;

      await lockOrientation(
        isPortrait ? OrientationLock.LANDSCAPE : OrientationLock.PORTRAIT_UP,
      );
    } finally {
      setIsTogglingOrientation(false);
    }
  }, [
    orientation,
    lockOrientation,
    isTogglingOrientation,
    lightHapticFeedback,
  ]);

  return (
    <View
      style={[
        {
          position: "absolute",
          top: insets.top,
          left: insets.left,
          right: insets.right,
          paddingHorizontal: CHROME.SIDE_PADDING,
          paddingVertical: 8,
        },
      ]}
      pointerEvents={showControls ? "auto" : "none"}
      className='flex flex-row items-center'
    >
      <TouchableOpacity
        onPress={onClose}
        className='flex flex-col items-center justify-center w-11 h-11'
        accessibilityLabel={t("common.close")}
      >
        <Ionicons name='close' size={ICON_SIZES.HEADER + 3} color='white' />
      </TouchableOpacity>

      {/* Title block, as in the native top bar */}
      <View className='flex-1 ml-2 mr-3 justify-center' pointerEvents='none'>
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: "600", color: "white" }}
        >
          {item?.Name}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View className='flex flex-row items-center shrink-0'>
        {/* Rotate toggle is Android-only: iOS does not reliably rotate the
            player back to portrait programmatically. */}
        {Platform.OS === "android" && (
          <TouchableOpacity
            onPress={toggleOrientation}
            disabled={isTogglingOrientation}
            className='flex flex-col items-center justify-center w-11 h-11'
            accessibilityLabel={t("accessibility.toggle_orientation")}
            accessibilityHint={t("accessibility.toggle_orientation_hint")}
          >
            <MaterialIcons
              name='screen-rotation'
              size={ICON_SIZES.HEADER}
              color='white'
              style={{ opacity: isTogglingOrientation ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        )}
        {!!settings.slowmoServerUrl && !!progress && (
          <SlowmoControl item={item} progress={progress} pause={pause} />
        )}
        {!Platform.isTV && <VersionsButton progress={progress} />}
        {!Platform.isTV && startPictureInPicture && (
          <TouchableOpacity
            onPress={startPictureInPicture}
            className='flex flex-col items-center justify-center w-11 h-11'
          >
            <MaterialIcons
              name='picture-in-picture'
              size={ICON_SIZES.HEADER}
              color='white'
            />
          </TouchableOpacity>
        )}
        {item?.Type === "Episode" && (
          <TouchableOpacity
            onPress={switchOnEpisodeMode}
            className='flex flex-col items-center justify-center w-11 h-11'
          >
            <Ionicons name='list' size={ICON_SIZES.HEADER} color='white' />
          </TouchableOpacity>
        )}
        {previousItem && (
          <TouchableOpacity
            onPress={goToPreviousItem}
            className='flex flex-col items-center justify-center w-11 h-11'
          >
            <Ionicons
              name='play-skip-back'
              size={ICON_SIZES.HEADER}
              color='white'
            />
          </TouchableOpacity>
        )}
        {nextItem && (
          <TouchableOpacity
            onPress={() => goToNextItem({ isAutoPlay: false })}
            className='flex flex-col items-center justify-center w-11 h-11'
          >
            <Ionicons
              name='play-skip-forward'
              size={ICON_SIZES.HEADER}
              color='white'
            />
          </TouchableOpacity>
        )}
        {/* Narrower than the other buttons so the title keeps room on a phone. */}
        {siblingNav && !previousItem && !nextItem && (
          <>
            <TouchableOpacity
              onPress={siblingNav.goPrevious}
              disabled={!siblingNav.hasPrevious}
              className='flex flex-col items-center justify-center w-9 h-11'
              style={{ opacity: siblingNav.hasPrevious ? 1 : 0.35 }}
              accessibilityLabel={t("player.previous_video")}
            >
              <Ionicons
                name='play-skip-back'
                size={ICON_SIZES.HEADER}
                color='white'
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={siblingNav.goNext}
              disabled={!siblingNav.hasNext}
              className='flex flex-col items-center justify-center w-9 h-11'
              style={{ opacity: siblingNav.hasNext ? 1 : 0.35 }}
              accessibilityLabel={t("player.next_video")}
            >
              <Ionicons
                name='play-skip-forward'
                size={ICON_SIZES.HEADER}
                color='white'
              />
            </TouchableOpacity>
          </>
        )}
        {/* MPV Zoom Toggle */}
        <ZoomToggle
          isZoomedToFill={isZoomedToFill}
          onToggle={onZoomToggle ?? (() => {})}
          disabled={!onZoomToggle}
        />
        {shouldShowPlayerMenu({ isTV: Platform.isTV }) && (
          <DropdownView
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            subtitleDelay={subtitleDelay}
            onSubtitleDelayChange={onSubtitleDelayChange}
            showTechnicalInfo={showTechnicalInfo}
            onToggleTechnicalInfo={onToggleTechnicalInfo}
            onOpenSubtitleScale={onOpenSubtitleScale}
            progress={progress}
          />
        )}
      </View>
    </View>
  );
};

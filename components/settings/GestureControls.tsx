import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Platform, View, type ViewProps } from "react-native";
import { SettingSwitch } from "@/components/common/SettingSwitch";
import { PlatformDropdown } from "@/components/PlatformDropdown";
import { PLAYBACK_SPEEDS } from "@/components/PlaybackSpeedSelector";
import DisabledSetting from "@/components/settings/DisabledSetting";
import { SCRUB_SPAN_OPTIONS } from "@/components/video-player/controls/utils/scrub";
import {
  getActiveVideoPlayer,
  useSettings,
  VideoPlayer,
} from "@/utils/atoms/settings";
import { Text } from "../common/Text";
import { ListGroup } from "../list/ListGroup";
import { ListItem } from "../list/ListItem";

interface Props extends ViewProps {}

export const GestureControls: React.FC<Props> = ({ ...props }) => {
  const { t } = useTranslation();

  const { settings, updateSettings, pluginSettings } = useSettings();

  // Pinch-to-zoom is implemented by the native player only (the JS player
  // has none) and the Siri remote has no equivalent, so its row stays hidden
  // everywhere else. Double tap exists in both players; the scrub rows below
  // are the JS chrome's.
  const isNativeTouchPlayer = useMemo(
    () =>
      !Platform.isTV && getActiveVideoPlayer(settings) === VideoPlayer.Native,
    [settings],
  );

  const disabled = useMemo(
    () =>
      pluginSettings?.enableHorizontalSwipeSkip?.locked === true &&
      pluginSettings?.enableLeftSideBrightnessSwipe?.locked === true &&
      pluginSettings?.enableRightSideVolumeSwipe?.locked === true &&
      pluginSettings?.enableHoldToSpeed?.locked === true &&
      pluginSettings?.holdToSpeedRate?.locked === true &&
      pluginSettings?.enablePinchToZoom?.locked === true &&
      pluginSettings?.enableDoubleTapToSeek?.locked === true &&
      pluginSettings?.hideVolumeSlider?.locked === true &&
      pluginSettings?.hideBrightnessSlider?.locked === true,
    [pluginSettings],
  );

  const holdToSpeedRateOptions = useMemo(
    () => [
      {
        options: PLAYBACK_SPEEDS.map((speed) => ({
          type: "radio" as const,
          label: speed.label,
          value: speed.value,
          selected: speed.value === settings?.holdToSpeedRate,
          onPress: () => updateSettings({ holdToSpeedRate: speed.value }),
        })),
      },
    ],
    [settings?.holdToSpeedRate, updateSettings],
  );

  const scrubSpanLabel = (seconds: number) =>
    seconds === 0
      ? t("home.settings.gesture_controls.scrub_span_whole")
      : t("home.settings.gesture_controls.scrub_span_minutes", {
          minutes: seconds / 60,
        });

  const scrubSpanOptions = useMemo(
    () => [
      {
        options: SCRUB_SPAN_OPTIONS.map((seconds) => ({
          type: "radio" as const,
          label:
            seconds === 0
              ? t("home.settings.gesture_controls.scrub_span_whole")
              : t("home.settings.gesture_controls.scrub_span_minutes", {
                  minutes: seconds / 60,
                }),
          value: seconds,
          selected: seconds === settings?.scrubSpanSeconds,
          onPress: () => updateSettings({ scrubSpanSeconds: seconds }),
        })),
      },
    ],
    [settings?.scrubSpanSeconds, updateSettings, t],
  );

  const doubleTapSecondsOptions = useMemo(
    () => [
      {
        options: [5, 10, 15, 20, 30, 60].map((seconds) => ({
          type: "radio" as const,
          label: t("home.settings.gesture_controls.seconds_value", { seconds }),
          value: seconds,
          selected: seconds === settings?.doubleTapSeekSeconds,
          onPress: () => updateSettings({ doubleTapSeekSeconds: seconds }),
        })),
      },
    ],
    [settings?.doubleTapSeekSeconds, updateSettings, t],
  );

  if (!settings) return null;

  return (
    <DisabledSetting disabled={disabled} {...props}>
      <ListGroup
        title={t("home.settings.gesture_controls.gesture_controls_title")}
      >
        <ListItem
          title={t("home.settings.gesture_controls.horizontal_swipe_skip")}
          subtitle={t(
            "home.settings.gesture_controls.horizontal_swipe_skip_description",
          )}
          disabled={pluginSettings?.enableHorizontalSwipeSkip?.locked}
        >
          <SettingSwitch
            value={settings.enableHorizontalSwipeSkip}
            disabled={pluginSettings?.enableHorizontalSwipeSkip?.locked}
            onValueChange={(enableHorizontalSwipeSkip) =>
              updateSettings({ enableHorizontalSwipeSkip })
            }
          />
        </ListItem>

        <ListItem
          title={t("home.settings.gesture_controls.left_side_brightness")}
          subtitle={t(
            "home.settings.gesture_controls.left_side_brightness_description",
          )}
          disabled={pluginSettings?.enableLeftSideBrightnessSwipe?.locked}
        >
          <SettingSwitch
            value={settings.enableLeftSideBrightnessSwipe}
            disabled={pluginSettings?.enableLeftSideBrightnessSwipe?.locked}
            onValueChange={(enableLeftSideBrightnessSwipe) =>
              updateSettings({ enableLeftSideBrightnessSwipe })
            }
          />
        </ListItem>

        <ListItem
          title={t("home.settings.gesture_controls.right_side_volume")}
          subtitle={t(
            "home.settings.gesture_controls.right_side_volume_description",
          )}
          disabled={pluginSettings?.enableRightSideVolumeSwipe?.locked}
        >
          <SettingSwitch
            value={settings.enableRightSideVolumeSwipe}
            disabled={pluginSettings?.enableRightSideVolumeSwipe?.locked}
            onValueChange={(enableRightSideVolumeSwipe) =>
              updateSettings({ enableRightSideVolumeSwipe })
            }
          />
        </ListItem>

        {/* Hold-to-speed also exists in the JS player, so it is not
            iOS-only, but it is still a touch gesture with no Siri remote
            equivalent. Each item is gated individually: ListGroup clones
            its children to inject separator styles, which a Fragment
            can't accept. */}
        {!Platform.isTV && (
          <ListItem
            title={t("home.settings.gesture_controls.hold_to_speed")}
            subtitle={t(
              "home.settings.gesture_controls.hold_to_speed_description",
            )}
            disabled={pluginSettings?.enableHoldToSpeed?.locked}
          >
            <SettingSwitch
              value={settings.enableHoldToSpeed}
              disabled={pluginSettings?.enableHoldToSpeed?.locked}
              onValueChange={(enableHoldToSpeed) =>
                updateSettings({ enableHoldToSpeed })
              }
            />
          </ListItem>
        )}

        {!Platform.isTV && (
          <DisabledSetting
            disabled={
              !settings.enableHoldToSpeed ||
              pluginSettings?.holdToSpeedRate?.locked === true
            }
            showText={false}
          >
            <ListItem
              title={t("home.settings.gesture_controls.hold_to_speed_rate")}
              disabled={pluginSettings?.holdToSpeedRate?.locked}
            >
              <PlatformDropdown
                groups={holdToSpeedRateOptions}
                trigger={
                  <View className='flex flex-row items-center justify-between pl-3 py-1.5'>
                    <Text className='mr-1 text-[#8E8D91]'>
                      {PLAYBACK_SPEEDS.find(
                        (s) => s.value === settings.holdToSpeedRate,
                      )?.label ?? "2x"}
                    </Text>
                    <Ionicons
                      name='chevron-expand-sharp'
                      size={18}
                      color='#5A5960'
                    />
                  </View>
                }
                title={t("home.settings.gesture_controls.hold_to_speed_rate")}
              />
            </ListItem>
          </DisabledSetting>
        )}

        {isNativeTouchPlayer && (
          <ListItem
            title={t("home.settings.gesture_controls.pinch_to_zoom")}
            subtitle={t(
              "home.settings.gesture_controls.pinch_to_zoom_description",
            )}
            disabled={pluginSettings?.enablePinchToZoom?.locked}
          >
            <SettingSwitch
              value={settings.enablePinchToZoom}
              disabled={pluginSettings?.enablePinchToZoom?.locked}
              onValueChange={(enablePinchToZoom) =>
                updateSettings({ enablePinchToZoom })
              }
            />
          </ListItem>
        )}

        {!Platform.isTV && (
          <ListItem
            title={t("home.settings.gesture_controls.double_tap_to_seek")}
            subtitle={t(
              "home.settings.gesture_controls.double_tap_to_seek_description",
            )}
            disabled={pluginSettings?.enableDoubleTapToSeek?.locked}
          >
            <SettingSwitch
              value={settings.enableDoubleTapToSeek}
              disabled={pluginSettings?.enableDoubleTapToSeek?.locked}
              onValueChange={(enableDoubleTapToSeek) =>
                updateSettings({ enableDoubleTapToSeek })
              }
            />
          </ListItem>
        )}

        {/* The classic (JS) chrome only: the native player scrubs by its own rules */}
        {!Platform.isTV && !isNativeTouchPlayer && (
          <ListItem
            title={t("home.settings.gesture_controls.double_tap_seconds")}
            subtitle={t(
              "home.settings.gesture_controls.double_tap_seconds_description",
            )}
          >
            <PlatformDropdown
              groups={doubleTapSecondsOptions}
              trigger={
                <View className='flex flex-row items-center justify-between pl-3 py-1.5'>
                  <Text className='mr-1 text-[#8E8D91]'>
                    {t("home.settings.gesture_controls.seconds_value", {
                      seconds: settings.doubleTapSeekSeconds,
                    })}
                  </Text>
                  <Ionicons
                    name='chevron-expand-sharp'
                    size={18}
                    color='#5A5960'
                  />
                </View>
              }
              title={t("home.settings.gesture_controls.double_tap_seconds")}
            />
          </ListItem>
        )}

        {!Platform.isTV && !isNativeTouchPlayer && (
          <ListItem
            title={t("home.settings.gesture_controls.scrub_span")}
            subtitle={t(
              "home.settings.gesture_controls.scrub_span_description",
            )}
          >
            <PlatformDropdown
              groups={scrubSpanOptions}
              trigger={
                <View className='flex flex-row items-center justify-between pl-3 py-1.5'>
                  <Text className='mr-1 text-[#8E8D91]'>
                    {scrubSpanLabel(settings.scrubSpanSeconds)}
                  </Text>
                  <Ionicons
                    name='chevron-expand-sharp'
                    size={18}
                    color='#5A5960'
                  />
                </View>
              }
              title={t("home.settings.gesture_controls.scrub_span")}
            />
          </ListItem>
        )}

        {!Platform.isTV && !isNativeTouchPlayer && (
          <ListItem
            title={t("home.settings.gesture_controls.fine_scrub")}
            subtitle={t(
              "home.settings.gesture_controls.fine_scrub_description",
            )}
          >
            <SettingSwitch
              value={settings.enableFineScrub}
              onValueChange={(enableFineScrub) =>
                updateSettings({ enableFineScrub })
              }
            />
          </ListItem>
        )}

        {!Platform.isTV && !isNativeTouchPlayer && (
          <ListItem
            title={t("home.settings.gesture_controls.scrub_haptics")}
            subtitle={t(
              "home.settings.gesture_controls.scrub_haptics_description",
            )}
          >
            <SettingSwitch
              value={settings.enableScrubHaptics}
              onValueChange={(enableScrubHaptics) =>
                updateSettings({ enableScrubHaptics })
              }
            />
          </ListItem>
        )}

        <ListItem
          title={t("home.settings.gesture_controls.hide_volume_slider")}
          subtitle={t(
            "home.settings.gesture_controls.hide_volume_slider_description",
          )}
          disabled={pluginSettings?.hideVolumeSlider?.locked}
        >
          <SettingSwitch
            value={settings.hideVolumeSlider}
            disabled={pluginSettings?.hideVolumeSlider?.locked}
            onValueChange={(hideVolumeSlider) =>
              updateSettings({ hideVolumeSlider })
            }
          />
        </ListItem>

        <ListItem
          title={t("home.settings.gesture_controls.hide_brightness_slider")}
          subtitle={t(
            "home.settings.gesture_controls.hide_brightness_slider_description",
          )}
          disabled={pluginSettings?.hideBrightnessSlider?.locked}
        >
          <SettingSwitch
            value={settings.hideBrightnessSlider}
            disabled={pluginSettings?.hideBrightnessSlider?.locked}
            onValueChange={(hideBrightnessSlider) =>
              updateSettings({ hideBrightnessSlider })
            }
          />
        </ListItem>
      </ListGroup>
    </DisabledSetting>
  );
};

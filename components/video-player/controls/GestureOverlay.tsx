import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, useWindowDimensions } from "react-native";
import { Text } from "@/components/common/Text";
import { useHaptic } from "@/hooks/useHaptic";
import { useSettings } from "@/utils/atoms/settings";
import { CONTROLS_CONSTANTS } from "./constants";
import { useGestureDetection } from "./hooks/useGestureDetection";
import { useVolumeAndBrightness } from "./hooks/useVolumeAndBrightness";

interface Props {
  showControls: boolean;
  onToggleControls: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onHoldSpeedStart?: () => void;
  onHoldSpeedEnd?: () => void;
  /** Horizontal drag = scrub: start, travel as a share of the width, end. */
  onScrubStart?: () => void;
  onScrubMove?: (fraction: number) => void;
  onScrubEnd?: (cancelled: boolean) => void;
  isPlaying?: boolean;
  videoTopOffset?: number;
}

interface FeedbackState {
  visible: boolean;
  icon: string;
  text: string;
  side?: "left" | "right";
  placement?: "center" | "top";
}

const DOUBLE_TAP_WINDOW_MS = 250;

export const GestureOverlay = ({
  showControls,
  onToggleControls,
  onSkipForward,
  onSkipBackward,
  onHoldSpeedStart,
  onHoldSpeedEnd,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
  isPlaying = true,
  videoTopOffset = 0,
}: Props) => {
  const { settings } = useSettings();
  const lightHaptic = useHaptic("light");
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    icon: "",
    text: "",
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scrimOpacity] = useState(
    new Animated.Value(CONTROLS_CONSTANTS.CONTROLS_SCRIM_OPACITY),
  );
  const isDraggingRef = useRef(false);
  const isHoldSpeedActiveRef = useRef(false);
  const hideScheduledRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);

  const showFeedback = useCallback(
    (
      icon: string,
      text: string,
      side?: "left" | "right",
      isDuringDrag = false,
      placement: "center" | "top" = "center",
    ) => {
      requestAnimationFrame(() => {
        setFeedback({ visible: true, icon, text, side, placement });

        if (!isDuringDrag) {
          hideScheduledRef.current = false;
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(1000),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            requestAnimationFrame(() => {
              setFeedback((prev) => ({ ...prev, visible: false }));
            });
          });
        } else if (!isDraggingRef.current && !hideScheduledRef.current) {
          // Cancel any pending hide from a previous drag
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
          }
          hideScheduledRef.current = false;
          isDraggingRef.current = true;
          fadeAnim.stopAnimation();
          fadeAnim.setValue(1);
        }
      });
    },
    [fadeAnim],
  );

  const hideDragFeedback = useCallback(() => {
    isDraggingRef.current = false;
    hideScheduledRef.current = true;
    hideTimeoutRef.current = setTimeout(() => {
      fadeAnim.stopAnimation();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        requestAnimationFrame(() => {
          setFeedback((prev) => ({ ...prev, visible: false }));
          hideScheduledRef.current = false;
        });
      });
    }, 100) as unknown as number;
  }, [fadeAnim]);

  const {
    startVolumeDrag,
    updateVolumeDrag,
    endVolumeDrag,
    startBrightnessDrag,
    updateBrightnessDrag,
    endBrightnessDrag,
  } = useVolumeAndBrightness({
    onVolumeChange: (volume: number) => {
      // Throttle feedback updates during dragging to reduce callback frequency
      const now = Date.now();
      if (now - lastUpdateTime.current < 50) return; // 50ms throttle
      lastUpdateTime.current = now;

      // Defer feedback update to avoid useInsertionEffect warning
      requestAnimationFrame(() => {
        showFeedback("volume-high", `${volume}%`, "right", true);
      });
    },
    onBrightnessChange: (brightness: number) => {
      // Throttle feedback updates during dragging to reduce callback frequency
      const now = Date.now();
      if (now - lastUpdateTime.current < 50) return; // 50ms throttle
      lastUpdateTime.current = now;

      // Defer feedback update to avoid useInsertionEffect warning
      requestAnimationFrame(() => {
        showFeedback("sunny", `${brightness}%`, "left", true);
      });
    },
  });

  const handleSkipForward = useCallback(() => {
    lightHaptic();
    // Defer all actions to avoid useInsertionEffect warning
    requestAnimationFrame(() => {
      onSkipForward();
      showFeedback("play-forward", `+${settings.forwardSkipTime}s`);
    });
  }, [settings.forwardSkipTime, lightHaptic, onSkipForward, showFeedback]);

  const handleSkipBackward = useCallback(() => {
    lightHaptic();
    // Defer all actions to avoid useInsertionEffect warning
    requestAnimationFrame(() => {
      onSkipBackward();
      showFeedback("play-back", `-${settings.rewindSkipTime}s`);
    });
  }, [settings.rewindSkipTime, lightHaptic, onSkipBackward, showFeedback]);

  // With double tap to seek on, a single tap waits out the double-tap window
  // (like the native player); off, it toggles at once.
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    },
    [],
  );
  const handleTap = useCallback(
    (x: number) => {
      if (!settings.enableDoubleTapToSeek) {
        onToggleControls();
        return;
      }
      if (pendingTapRef.current) {
        clearTimeout(pendingTapRef.current);
        pendingTapRef.current = null;
        if (x >= windowWidth / 2) handleSkipForward();
        else handleSkipBackward();
        return;
      }
      pendingTapRef.current = setTimeout(() => {
        pendingTapRef.current = null;
        onToggleControls();
      }, DOUBLE_TAP_WINDOW_MS);
    },
    [
      settings.enableDoubleTapToSeek,
      onToggleControls,
      windowWidth,
      handleSkipForward,
      handleSkipBackward,
    ],
  );

  const scrubEnabled = settings.enableHorizontalSwipeSkip && !!onScrubStart;
  const handleScrubStart = useCallback(() => {
    lightHaptic();
    onScrubStart?.();
  }, [lightHaptic, onScrubStart]);
  const handleScrubMove = useCallback(
    (deltaX: number) => onScrubMove?.(deltaX / windowWidth),
    [onScrubMove, windowWidth],
  );

  const handleHoldSpeedStart = useCallback(() => {
    if (!settings.enableHoldToSpeed) return;
    if (!isPlaying) return;
    if (isHoldSpeedActiveRef.current) return;
    isHoldSpeedActiveRef.current = true;
    lightHaptic();
    // Defer all actions to avoid useInsertionEffect warning
    requestAnimationFrame(() => {
      onHoldSpeedStart?.();
      Animated.timing(scrimOpacity, {
        toValue: CONTROLS_CONSTANTS.HOLD_SPEED_DIM_OPACITY,
        duration: CONTROLS_CONSTANTS.HOLD_SPEED_DIM_DURATION,
        useNativeDriver: true,
      }).start();
      showFeedback(
        "play-forward",
        `${settings.holdToSpeedRate}x`,
        undefined,
        true,
        "top",
      );
    });
  }, [
    settings.enableHoldToSpeed,
    settings.holdToSpeedRate,
    isPlaying,
    lightHaptic,
    onHoldSpeedStart,
    showFeedback,
    scrimOpacity,
  ]);

  const handleHoldSpeedEnd = useCallback(() => {
    if (!isHoldSpeedActiveRef.current) return;
    isHoldSpeedActiveRef.current = false;
    // Defer all actions to avoid useInsertionEffect warning
    requestAnimationFrame(() => {
      onHoldSpeedEnd?.();
      Animated.timing(scrimOpacity, {
        toValue: CONTROLS_CONSTANTS.CONTROLS_SCRIM_OPACITY,
        duration: CONTROLS_CONSTANTS.HOLD_SPEED_DIM_DURATION,
        useNativeDriver: true,
      }).start();
      hideDragFeedback();
    });
  }, [onHoldSpeedEnd, hideDragFeedback, scrimOpacity]);

  // A hold must not survive the overlay being removed, since entering
  // picture in picture unmounts the controls mid-gesture
  useEffect(() => handleHoldSpeedEnd, [handleHoldSpeedEnd]);

  const handleVerticalDragStart = useCallback(
    (side: "left" | "right", startY: number) => {
      if (side === "left" && settings.enableLeftSideBrightnessSwipe) {
        lightHaptic();
        // Defer drag start to avoid useInsertionEffect warning
        requestAnimationFrame(() => {
          startBrightnessDrag(startY);
        });
      } else if (side === "right" && settings.enableRightSideVolumeSwipe) {
        lightHaptic();
        // Defer drag start to avoid useInsertionEffect warning
        requestAnimationFrame(() => {
          startVolumeDrag(startY);
        });
      }
    },
    [
      settings.enableLeftSideBrightnessSwipe,
      settings.enableRightSideVolumeSwipe,
      lightHaptic,
      startBrightnessDrag,
      startVolumeDrag,
    ],
  );

  const handleVerticalDragMove = useCallback(
    (side: "left" | "right", deltaY: number) => {
      // Use requestAnimationFrame to defer drag move updates too
      requestAnimationFrame(() => {
        if (side === "left" && settings.enableLeftSideBrightnessSwipe) {
          updateBrightnessDrag(deltaY);
        } else if (side === "right" && settings.enableRightSideVolumeSwipe) {
          updateVolumeDrag(deltaY);
        }
      });
    },
    [
      settings.enableLeftSideBrightnessSwipe,
      settings.enableRightSideVolumeSwipe,
      updateBrightnessDrag,
      updateVolumeDrag,
    ],
  );

  const handleVerticalDragEnd = useCallback(
    (side: "left" | "right") => {
      // Defer drag end to avoid useInsertionEffect warning
      requestAnimationFrame(() => {
        if (side === "left") {
          endBrightnessDrag();
        } else {
          endVolumeDrag();
        }
        hideDragFeedback();
      });
    },
    [endBrightnessDrag, endVolumeDrag, hideDragFeedback],
  );

  // Wiring the long press only while enabled keeps a disabled setting from
  // swallowing the tap, swipe and drag gestures
  const holdSpeedEnabled = settings.enableHoldToSpeed;

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useGestureDetection({
    onVerticalDragStart: handleVerticalDragStart,
    onVerticalDragMove: handleVerticalDragMove,
    onVerticalDragEnd: handleVerticalDragEnd,
    onHorizontalDragStart: scrubEnabled ? handleScrubStart : undefined,
    onHorizontalDragMove: scrubEnabled ? handleScrubMove : undefined,
    onHorizontalDragEnd: scrubEnabled ? onScrubEnd : undefined,
    onTap: handleTap,
    onLongPressStart: holdSpeedEnabled ? handleHoldSpeedStart : undefined,
    onLongPressEnd: holdSpeedEnabled ? handleHoldSpeedEnd : undefined,
    longPressDuration: CONTROLS_CONSTANTS.HOLD_SPEED_DELAY,
    windowWidth,
    windowHeight,
  });

  const isTopFeedback = feedback.placement === "top";

  return (
    <>
      {/* Dims the video behind the controls; touches go to the surface below */}
      {showControls && (
        <Animated.View
          pointerEvents='none'
          style={{
            position: "absolute",
            width: windowWidth,
            height: windowHeight,
            backgroundColor: "black",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            opacity: scrimOpacity,
          }}
        />
      )}
      {/* Gesture surface, live with the controls shown too so a drag scrubs
          from anywhere on the video */}
      <Pressable
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // A cancelled touch (backgrounding, a system gesture) never
        // delivers touchEnd, which would leave the hold engaged
        onTouchCancel={handleTouchCancel}
        style={{
          position: "absolute",
          width: windowWidth,
          height: windowHeight,
          backgroundColor: "transparent",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Feedback overlay */}
      {feedback.visible && (
        <Animated.View
          style={{
            position: "absolute",
            top: isTopFeedback ? videoTopOffset + 6 : "50%",
            left: isTopFeedback
              ? "50%"
              : feedback.side === "left"
                ? "20%"
                : feedback.side === "right"
                  ? "80%"
                  : "50%",
            transform: isTopFeedback
              ? [{ translateX: "-50%" }]
              : [
                  { translateY: -25 },
                  {
                    translateX:
                      feedback.side === "right"
                        ? -50
                        : feedback.side === "left"
                          ? 0
                          : -50,
                  },
                ],
            backgroundColor: isTopFeedback
              ? "rgba(0, 0, 0, 0.5)"
              : "rgba(0, 0, 0, 0.8)",
            paddingHorizontal: isTopFeedback ? 10 : 16,
            paddingVertical: isTopFeedback ? 5 : 12,
            borderRadius: isTopFeedback ? 6 : 8,
            flexDirection: "row",
            alignItems: "center",
            opacity: fadeAnim,
            zIndex: 20,
          }}
        >
          <Ionicons
            name={feedback.icon as any}
            size={isTopFeedback ? 14 : 24}
            color='white'
            style={{ marginRight: isTopFeedback ? 5 : 8 }}
          />
          <Text
            style={{
              color: "white",
              fontSize: isTopFeedback ? 13 : 16,
              fontWeight: "600",
            }}
          >
            {feedback.text}
          </Text>
        </Animated.View>
      )}
    </>
  );
};

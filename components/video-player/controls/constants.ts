export const CONTROLS_CONSTANTS = {
  TIMEOUT: 4000,
  SCRUB_INTERVAL_MS: 30 * 1000, // 30 seconds in ms
  SCRUB_INTERVAL_TICKS: 10 * 10000000, // 10 seconds in ticks
  TILE_WIDTH: 150,
  PROGRESS_UNIT_MS: 1000, // 1 second in ms
  PROGRESS_UNIT_TICKS: 10000000, // 1 second in ticks
  LONG_PRESS_INITIAL_SEEK: 30,
  LONG_PRESS_ACCELERATION: 1.2,
  LONG_PRESS_MAX_ACCELERATION: 4,
  LONG_PRESS_INTERVAL: 300,
  HOLD_SPEED_DELAY: 500,
  HOLD_SPEED_DIM_OPACITY: 0.2,
  HOLD_SPEED_DIM_DURATION: 300,
  SLIDER_DEBOUNCE_MS: 3,
  // Progress ticks arrive at most once per second, so the last one before EOF
  // can land anywhere inside the final second — 1.5s guarantees it's caught.
  STILL_WATCHING_EOF_WINDOW_MS: 1500,
} as const;

export const ICON_SIZES = {
  HEADER: 21,
  CENTER: 50,
} as const;

export const HEADER_LAYOUT = {
  CONTAINER_PADDING: 8, // p-2 = 8px (matches HeaderControls)
} as const;

// Metrics of the classic chrome, matched to the native SwiftUI player
// (PlayerControlsRootView, PlayerTopBar, PlayerCenterControls, ScrubberView).
export const CHROME = {
  SIDE_PADDING: 24,
  BUTTON: 44,
  SCRIM_TOP_HEIGHT: 140,
  SCRIM_BOTTOM_HEIGHT: 160,
  SCRIM_OPACITY: 0.6,
  FADE_MS: 200,
  TRACK_HEIGHT: 7,
  TRACK_HEIGHT_SCRUBBING: 11,
  SCRUBBER_HEIGHT: 44,
  // center row
  SEEK_ICON: 34,
  JUMP_ICON: 22,
  PLAY_ICON: 48,
  SIDE_BUTTON: 56,
  PLAY_BUTTON: 80,
} as const;

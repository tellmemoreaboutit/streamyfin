import { stubReactNative } from "@/test-utils/reactNative";

jest.mock("@/components/PlatformDropdown", () => ({
  PlatformDropdown: () => null,
}));
jest.mock("@/utils/atoms/api", () => ({
  apiAtom: jest.requireActual("jotai").atom(null),
  userAtom: jest.requireActual("jotai").atom(null),
}));

stubReactNative({ OS: "ios", isTV: false });

// Required after the platform is set: settings.ts reads Platform at load.
const { getActiveVideoPlayer, isNativeChromeActive, VideoPlayer } =
  require("./settings") as typeof import("./settings");

// This fork defaults iPhone/iPad to the classic JS chrome.
describe("player on iPhone/iPad", () => {
  test("an unset choice is the classic chrome", () => {
    expect(isNativeChromeActive({})).toBe(false);
    expect(getActiveVideoPlayer({})).toBe(VideoPlayer.MPV);
  });

  test("choosing Native still gives the native chrome", () => {
    expect(isNativeChromeActive({ videoPlayer: VideoPlayer.Native })).toBe(
      true,
    );
  });

  test("choosing Classic stays classic", () => {
    expect(isNativeChromeActive({ videoPlayer: VideoPlayer.MPV })).toBe(false);
  });
});

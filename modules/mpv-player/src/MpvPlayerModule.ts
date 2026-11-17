import { NativeModule, requireNativeModule } from "expo";

import { MpvPlayerModuleEvents } from "./MpvPlayer.types";

declare class MpvPlayerModule extends NativeModule<MpvPlayerModuleEvents> {
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  /**
   * Whether this device has a hardware AV1 decoder: `VTIsHardwareDecodeSupported`
   * on iOS/tvOS, a hardware MediaCodec decoder for `video/av01` on Android.
   * Prefer `supportsAv1HardwareDecode` and `supportsAv1Transcode` from
   * `@/utils/profiles/codecSupport`, which handle the platform and
   * older-binary cases.
   */
  supportsAv1HardwareDecode(): boolean;
  /**
   * iOS only: a JPEG frame (file:// uri) of the video at `url` near `seconds`,
   * or null. A newer request cancels the one in flight. Absent on Android/TV
   * and older binaries.
   */
  thumbnailAt?(
    url: string,
    seconds: number,
    maxWidth: number,
  ): Promise<string | null>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MpvPlayerModule>("MpvPlayer");

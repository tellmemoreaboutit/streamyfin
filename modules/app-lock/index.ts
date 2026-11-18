import type { EventSubscription } from "expo-modules-core";
import { Platform, requireNativeModule } from "expo-modules-core";

export type AppLockConfig = {
  enabled: boolean;
  faceId: boolean;
  graceSeconds: number;
};

type AppLockNativeModule = {
  isAvailable(): boolean;
  setPin(pin: string): boolean;
  verifyPin(pin: string): boolean;
  clearPin(): void;
  configure(enabled: boolean, faceId: boolean, graceSeconds: number): void;
  getConfig(): AppLockConfig & { hasPin: boolean };
  consumeResetFlag(): boolean;
  addListener(event: "onReset", listener: () => void): EventSubscription;
};

// iOS only; null elsewhere (Android keeps the JS lock) or in a build without the module.
const AppLockModule: AppLockNativeModule | null = (() => {
  if (Platform.OS !== "ios") return null;
  try {
    return requireNativeModule<AppLockNativeModule>("AppLock");
  } catch {
    return null;
  }
})();

/** True when the native lock owns the passcode (iOS build with the module). */
export const isAppLockAvailable = (): boolean => AppLockModule !== null;

export const setNativePin = (pin: string): boolean =>
  AppLockModule?.setPin(pin) ?? false;

export const verifyNativePin = (pin: string): boolean =>
  AppLockModule?.verifyPin(pin) ?? false;

export const clearNativePin = (): void => AppLockModule?.clearPin();

export const configureNativeLock = (config: AppLockConfig): void =>
  AppLockModule?.configure(
    config.enabled,
    config.faceId,
    Math.round(config.graceSeconds),
  );

export const getNativeLockConfig = (): AppLockConfig | null =>
  AppLockModule?.getConfig() ?? null;

/** Whether "Forgot passcode?" was used since last asked; forgotten once read. */
export const consumeNativeResetFlag = (): boolean =>
  AppLockModule?.consumeResetFlag() ?? false;

export const addNativeLockResetListener = (
  listener: () => void,
): EventSubscription | null =>
  AppLockModule?.addListener("onReset", listener) ?? null;

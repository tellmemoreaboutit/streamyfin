import * as SecureStore from "expo-secure-store";
import {
  clearNativePin,
  isAppLockAvailable,
  setNativePin,
  verifyNativePin,
} from "@/modules/app-lock";
import { hashPIN } from "./secureCredentials";

const PIN_KEY = "appLockPinHash";
export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
export const COOLDOWN_MS = 30_000;

// ponytail: unsalted SHA256 via hashPIN; fine for a 4-digit device-local PIN.
// On iOS the native lock owns the PIN (Keychain); elsewhere it stays in SecureStore.
export const setAppPin = async (pin: string) => {
  if (isAppLockAvailable()) {
    setNativePin(pin);
    return;
  }
  await SecureStore.setItemAsync(PIN_KEY, await hashPIN(pin));
};

export const clearAppPin = async () => {
  if (isAppLockAvailable()) return clearNativePin();
  await SecureStore.deleteItemAsync(PIN_KEY);
};

export const verifyAppPin = async (pin: string) =>
  isAppLockAvailable()
    ? verifyNativePin(pin)
    : (await SecureStore.getItemAsync(PIN_KEY)) === (await hashPIN(pin));

/**
 * Lock again when the app spent at least `graceSeconds` in the background.
 * `backgroundedAt` is null when the app never reached the background.
 */
export const shouldLock = (
  backgroundedAt: number | null,
  now: number,
  graceSeconds: number,
  enabled: boolean,
) =>
  enabled &&
  backgroundedAt !== null &&
  (now - backgroundedAt) / 1000 >= graceSeconds;

/** Count a wrong PIN; every MAX_ATTEMPTS-th one starts a cooldown. */
export const registerFailure = (failed: number, now: number) => {
  const total = failed + 1;
  return {
    failed: total,
    cooldownUntil: total % MAX_ATTEMPTS === 0 ? now + COOLDOWN_MS : 0,
  };
};

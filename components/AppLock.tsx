import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  AppState,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Text } from "@/components/common/Text";
import { PinInput } from "@/components/inputs/PinInput";
import {
  addNativeLockResetListener,
  consumeNativeResetFlag,
  isAppLockAvailable,
} from "@/modules/app-lock";
import { useJellyfin } from "@/providers/JellyfinProvider";
import {
  clearAppPin,
  PIN_LENGTH,
  registerFailure,
  shouldLock,
  verifyAppPin,
} from "@/utils/appLock";
import { useSettings } from "@/utils/atoms/settings";
import {
  getPreviousServers,
  removeServerFromList,
} from "@/utils/secureCredentials";
import { readStoredSettings } from "@/utils/storedSettings";

/**
 * Passcode lock, mounted once at the root.
 *
 * It is an RN `Modal` (overFullScreen, no animation) rather than an absolutely
 * positioned View: expo-router presents the player (and other screens) as a
 * native view controller, which a View in the root hierarchy sits UNDER. A
 * Modal is presented by UIKit from the top-most view controller, so it covers
 * whatever is on screen. The same Modal is shown opaque while the app is
 * inactive/background so the app-switcher snapshot hides the content.
 */
export const AppLock = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const { logout } = useJellyfin();
  const enabled = settings?.appLockEnabled ?? false;
  const faceId = enabled && !!settings?.appLockFaceId;

  // Cold start: settings load async into the atom, so read the stored flag
  // directly; the first render is already locked, before any content shows.
  const [locked, setLocked] = useState(
    () => !Platform.isTV && readStoredSettings().appLockEnabled === true,
  );
  const [covered, setCovered] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const failed = useRef(0);
  const cooldownUntil = useRef(0);
  const backgroundedAt = useRef<number | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const enabledRef = useRef(enabled);
  const graceRef = useRef(settings?.appLockGraceSeconds ?? 0);
  enabledRef.current = enabled;
  graceRef.current = settings?.appLockGraceSeconds ?? 0;

  useEffect(() => {
    if (Platform.isTV) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (!enabledRef.current) return;
      setCovered(next !== "active");
      // Only "background" counts: Face ID / system sheets make the app
      // "inactive" briefly and must not re-lock it.
      if (next === "background") backgroundedAt.current = Date.now();
      if (next === "active") {
        if (
          shouldLock(backgroundedAt.current, Date.now(), graceRef.current, true)
        ) {
          setLocked(true);
        }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // Settings loaded and the lock is off (e.g. stale cold-start flag).
  useEffect(() => {
    if (settings && !enabled) setLocked(false);
  }, [settings, enabled]);

  const tryFaceId = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("app_lock.face_id_reason"),
      disableDeviceFallback: true,
    });
    if (res.success) setLocked(false);
  }, [t]);

  // Prompt once each time the lock appears (not on every inactive -> active,
  // or cancelling the prompt would loop).
  useEffect(() => {
    if (locked && faceId) tryFaceId();
  }, [locked, faceId, tryFaceId]);

  // Tick during a cooldown so the error text counts down.
  const coolingDown = now < cooldownUntil.current;
  useEffect(() => {
    if (!coolingDown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [coolingDown]);

  const doShake = () =>
    Animated.sequence(
      [10, -10, 10, 0].map((toValue) =>
        Animated.timing(shake, {
          toValue,
          duration: 50,
          useNativeDriver: true,
        }),
      ),
    ).start();

  const onChange = async (value: string) => {
    if (Date.now() < cooldownUntil.current) return;
    setPin(value);
    setError(null);
    if (value.length < PIN_LENGTH) return;
    if (await verifyAppPin(value)) {
      failed.current = 0;
      setPin("");
      setLocked(false);
      return;
    }
    const r = registerFailure(failed.current, Date.now());
    failed.current = r.failed;
    cooldownUntil.current = r.cooldownUntil;
    setNow(Date.now());
    setError(t("app_lock.wrong_passcode"));
    setPin("");
    doShake();
  };

  const forgot = () =>
    Alert.alert(t("app_lock.forgot"), t("app_lock.forgot_desc"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("app_lock.reset"),
        style: "destructive",
        onPress: async () => {
          await clearAppPin();
          updateSettings({ appLockEnabled: false, appLockFaceId: false });
          for (const s of getPreviousServers()) {
            await removeServerFromList(s.address);
          }
          await logout();
          setLocked(false);
        },
      },
    ]);

  if (Platform.isTV) return null;

  const seconds = Math.ceil((cooldownUntil.current - now) / 1000);

  return (
    <Modal
      visible={locked || (enabled && covered)}
      transparent={false}
      animationType='none'
      presentationStyle='overFullScreen'
      statusBarTranslucent
    >
      <View className='flex-1 bg-black items-center justify-center px-8'>
        {locked && (
          <>
            <Text className='text-2xl font-bold mb-6'>Streamyfin</Text>
            <Animated.View
              style={{ transform: [{ translateX: shake }] }}
              className='p-4 border border-neutral-800 rounded-xl bg-neutral-900 mb-4'
            >
              <PinInput
                value={pin}
                onChangeText={onChange}
                length={PIN_LENGTH}
                inBottomSheet={false}
                editable={!coolingDown}
                autoFocus
              />
            </Animated.View>
            <Text className='text-red-500 text-center h-6'>
              {coolingDown ? t("app_lock.try_again_in", { seconds }) : error}
            </Text>
            {faceId && (
              <Pressable onPress={tryFaceId} className='mt-4'>
                <Text className='text-purple-400'>
                  {t("app_lock.use_face_id")}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={forgot} className='mt-4'>
              <Text className='text-purple-400'>{t("app_lock.forgot")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
};

/**
 * iOS: the native lock window does the locking; JS only finishes a "Forgot
 * passcode?" reset (log out of every saved server), at startup or on the event.
 */
const NativeLockReset = () => {
  const { settings, updateSettings } = useSettings();
  const { logout } = useJellyfin();
  const ready = !!settings;

  useEffect(() => {
    if (!ready) return;
    const run = async () => {
      if (!consumeNativeResetFlag()) return;
      updateSettings({ appLockEnabled: false, appLockFaceId: false });
      for (const s of getPreviousServers()) {
        await removeServerFromList(s.address);
      }
      await logout();
    };
    run();
    const sub = addNativeLockResetListener(run);
    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return null;
};

/** Native lock on iOS, the JS Modal lock everywhere else (not TV). */
export const AppLockHost = () =>
  Platform.isTV ? null : isAppLockAvailable() ? (
    <NativeLockReset />
  ) : (
    <AppLock />
  );

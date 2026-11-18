import Ionicons from "@expo/vector-icons/Ionicons";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import { SettingSwitch } from "@/components/common/SettingSwitch";
import { Text } from "@/components/common/Text";
import { PinInput } from "@/components/inputs/PinInput";
import {
  configureNativeLock,
  getNativeLockConfig,
  isAppLockAvailable,
} from "@/modules/app-lock";
import {
  clearAppPin,
  PIN_LENGTH,
  setAppPin,
  verifyAppPin,
} from "@/utils/appLock";
import { useSettings } from "@/utils/atoms/settings";
import { ListGroup } from "../list/ListGroup";
import { ListItem } from "../list/ListItem";
import { PlatformDropdown } from "../PlatformDropdown";

type Step = "current" | "new" | "confirm";
const PROMPT = {
  current: "app_lock.enter_current",
  new: "app_lock.enter_new",
  confirm: "app_lock.confirm_new",
} as const;

/** Walks through `steps`; calls `onDone(newPin)` (undefined if no new PIN). */
const PinSteps = ({
  steps,
  onDone,
  onCancel,
}: {
  steps: Step[];
  onDone: (newPin?: string) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onChange = async (value: string) => {
    setPin(value);
    setError(null);
    if (value.length < PIN_LENGTH) return;
    const step = steps[i];
    setPin("");
    if (step === "current" && !(await verifyAppPin(value))) {
      return setError(t("app_lock.wrong_passcode"));
    }
    if (step === "confirm" && value !== first) {
      return setError(t("pin.pins_dont_match"));
    }
    if (step === "new") setFirst(value);
    if (i + 1 < steps.length) return setI(i + 1);
    onDone(step === "confirm" ? value : undefined);
  };

  return (
    <Modal visible animationType='slide' presentationStyle='pageSheet'>
      <View className='flex-1 bg-black items-center justify-center px-8'>
        <Text className='text-xl font-bold mb-6'>{t(PROMPT[steps[i]])}</Text>
        <PinInput
          value={pin}
          onChangeText={onChange}
          length={PIN_LENGTH}
          inBottomSheet={false}
          autoFocus
        />
        <Text className='text-red-500 mt-4 h-6'>{error}</Text>
        <Pressable onPress={onCancel} className='mt-4'>
          <Text className='text-purple-400'>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const GRACE_OPTIONS = [0, 60, 300, 900];

export const AppLockSettings = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [flow, setFlow] = useState<"enable" | "disable" | "change" | null>(
    null,
  );
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    (async () => {
      setHasBiometrics(
        (await LocalAuthentication.hasHardwareAsync()) &&
          (await LocalAuthentication.isEnrolledAsync()),
      );
    })().catch(() => {});
  }, []);

  const graceLabel = (s: number) =>
    s === 0
      ? t("app_lock.immediately")
      : t("app_lock.minutes", { count: s / 60 });

  const grace = settings?.appLockGraceSeconds ?? 0;
  const groups = useMemo(
    () => [
      {
        options: GRACE_OPTIONS.map((s) => ({
          type: "radio" as const,
          label:
            s === 0
              ? t("app_lock.immediately")
              : t("app_lock.minutes", { count: s / 60 }),
          value: String(s),
          selected: s === grace,
          onPress: () => {
            updateSettings({ appLockGraceSeconds: s });
            const c = getNativeLockConfig();
            if (c) configureNativeLock({ ...c, graceSeconds: s });
          },
        })),
      },
    ],
    [grace, t, updateSettings],
  );

  // The native config is the source of truth on iOS; keep the atom (UI) in step.
  const nativeCfg =
    settings && isAppLockAvailable() ? getNativeLockConfig() : null;
  const synced = !!settings;
  useEffect(() => {
    if (!synced || !nativeCfg) return;
    updateSettings({
      appLockEnabled: nativeCfg.enabled,
      appLockFaceId: nativeCfg.faceId,
      appLockGraceSeconds: nativeCfg.graceSeconds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced]);

  if (!settings) return null;
  const enabled = settings.appLockEnabled;

  // Update the atom and, on iOS, the native lock.
  const apply = (patch: Partial<typeof settings>) => {
    updateSettings(patch);
    const next = { ...settings, ...patch };
    configureNativeLock({
      enabled: next.appLockEnabled,
      faceId: next.appLockFaceId,
      graceSeconds: next.appLockGraceSeconds,
    });
  };

  const done = async (newPin?: string) => {
    if (flow === "disable") {
      await clearAppPin();
      apply({ appLockEnabled: false, appLockFaceId: false });
    } else if (newPin) {
      await setAppPin(newPin);
      if (flow === "enable") apply({ appLockEnabled: true });
    }
    setFlow(null);
  };

  return (
    <View>
      <ListGroup title={t("app_lock.title")}>
        <ListItem title={t("app_lock.require_passcode")}>
          <SettingSwitch
            value={enabled}
            onValueChange={(on) => setFlow(on ? "enable" : "disable")}
          />
        </ListItem>
        {enabled && (
          <ListItem
            title={t("app_lock.change_passcode")}
            onPress={() => setFlow("change")}
            showArrow
          />
        )}
        {enabled && hasBiometrics && (
          <ListItem title={t("app_lock.use_face_id")}>
            <SettingSwitch
              value={settings.appLockFaceId}
              onValueChange={(v) => apply({ appLockFaceId: v })}
            />
          </ListItem>
        )}
        {enabled && (
          <ListItem title={t("app_lock.require_after")}>
            <PlatformDropdown
              groups={groups}
              title={t("app_lock.require_after")}
              trigger={
                <View className='flex flex-row items-center py-1.5 pl-3'>
                  <Text className='mr-2'>{graceLabel(grace)}</Text>
                  <Ionicons
                    name='chevron-expand-sharp'
                    size={18}
                    color='#5A5960'
                  />
                </View>
              }
            />
          </ListItem>
        )}
      </ListGroup>
      {flow && (
        <PinSteps
          // New instance per flow so step state starts clean.
          key={flow}
          steps={
            flow === "enable"
              ? ["new", "confirm"]
              : flow === "disable"
                ? ["current"]
                : ["current", "new", "confirm"]
          }
          onDone={done}
          onCancel={() => setFlow(null)}
        />
      )}
    </View>
  );
};

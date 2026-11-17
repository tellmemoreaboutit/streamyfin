import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "@/components/common/Text";
import { formatTimeString } from "@/utils/time";

interface TimeDisplayProps {
  currentTime: number;
  remainingTime: number;
}

// Footnote size, tabular digits and the same whites as the native bottom bar
const LABEL = {
  fontSize: 13,
  color: "rgba(255,255,255,0.85)",
  fontVariant: ["tabular-nums" as const],
};

/**
 * Displays current time and remaining time.
 * MPV player uses milliseconds for time values.
 */
export const TimeDisplay: FC<TimeDisplayProps> = ({
  currentTime,
  remainingTime,
}) => {
  const { t } = useTranslation();

  const getFinishTime = () => {
    if (!Number.isFinite(remainingTime)) return "—";
    const now = new Date();
    // remainingTime is in ms
    const finishTime = new Date(now.getTime() + remainingTime);
    return finishTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <View className='flex flex-row items-start justify-between mt-1.5'>
      <Text style={LABEL}>{formatTimeString(currentTime, "ms")}</Text>
      <View className='flex flex-col items-end'>
        <Text style={LABEL}>-{formatTimeString(remainingTime, "ms")}</Text>
        <Text
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.55)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {t("player.ends_at", { time: getFinishTime() })}
        </Text>
      </View>
    </View>
  );
};

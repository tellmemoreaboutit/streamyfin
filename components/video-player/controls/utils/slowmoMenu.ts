import type { OptionGroup } from "@/components/PlatformDropdown";
import { SLOWMO_FACTORS } from "@/utils/slowmo";

interface Args {
  t: (key: string) => string;
  segmentCount: number;
  lastFactor?: number;
  /** The web GUI entry only makes sense with a server URL. */
  hasServerUrl: boolean;
  onOpenWebGui: () => void;
  onSend: (factor: number) => void;
}

/**
 * Groups of the Slowmo header menu. Never returns an empty group (a native
 * SwiftUI menu section with no items is a crash risk), and the factor picker
 * only appears once segments are marked.
 */
export const buildSlowmoMenuGroups = ({
  t,
  segmentCount,
  lastFactor,
  hasServerUrl,
  onOpenWebGui,
  onSend,
}: Args): OptionGroup[] => {
  const groups: OptionGroup[] = [];
  if (hasServerUrl) {
    groups.push({
      options: [
        {
          type: "action",
          label: t("slowmo.open_web_gui"),
          onPress: onOpenWebGui,
        },
      ],
    });
  }
  if (segmentCount > 0) {
    const selected = SLOWMO_FACTORS.some((f) => f === lastFactor)
      ? lastFactor
      : 4;
    groups.push({
      title: t("slowmo.send"),
      options: SLOWMO_FACTORS.map((factor) => ({
        type: "radio" as const,
        label: `x${factor}`,
        value: String(factor),
        selected: factor === selected,
        onPress: () => onSend(factor),
      })),
    });
  }
  return groups;
};

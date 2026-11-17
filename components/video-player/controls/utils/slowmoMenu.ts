import type { OptionGroup } from "@/components/PlatformDropdown";
import { SLOWMO_FACTORS } from "@/utils/slowmo";

interface Args {
  t: (key: string) => string;
  segmentCount: number;
  lastFactor?: number;
  /** The web GUI entry only makes sense with a server URL. */
  hasServerUrl: boolean;
  modeOn: boolean;
  onToggleMode: () => void;
  onClear: () => void;
  /** Slows the whole movie. */
  onSendWhole: (factor: number) => void;
  onOpenWebGui: () => void;
  onSend: (factor: number) => void;
}

/**
 * Groups of the Slowmo header menu. Never returns an empty group (a native
 * SwiftUI menu section with no items is a crash risk); the segment factor
 * picker and "clear" only appear once segments are marked.
 */
export const buildSlowmoMenuGroups = ({
  t,
  segmentCount,
  lastFactor,
  hasServerUrl,
  modeOn,
  onToggleMode,
  onClear,
  onSendWhole,
  onOpenWebGui,
  onSend,
}: Args): OptionGroup[] => {
  const selected = SLOWMO_FACTORS.some((f) => f === lastFactor)
    ? lastFactor
    : 4;
  const factors = (onPick: (factor: number) => void) =>
    SLOWMO_FACTORS.map((factor) => ({
      type: "radio" as const,
      label: `x${factor}`,
      value: String(factor),
      selected: factor === selected,
      onPress: () => onPick(factor),
    }));
  // The mode toggle is always there, so the menu is never empty
  const groups: OptionGroup[] = [
    {
      options: [
        {
          type: "toggle",
          label: t("slowmo.mode"),
          value: modeOn,
          onToggle: onToggleMode,
        },
      ],
    },
  ];
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
    groups.push({ title: t("slowmo.send"), options: factors(onSend) });
    groups.push({
      options: [{ type: "action", label: t("slowmo.clear"), onPress: onClear }],
    });
  }
  if (hasServerUrl) {
    groups.push({
      title: t("slowmo.whole_movie"),
      options: factors(onSendWhole),
    });
  }
  return groups;
};

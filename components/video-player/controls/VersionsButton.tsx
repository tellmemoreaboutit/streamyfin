import { Ionicons } from "@expo/vector-icons";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { PlatformDropdown } from "@/components/PlatformDropdown";
import { ICON_SIZES } from "./constants";
import { useVersionSwitch } from "./hooks/useVersionSwitch";

// Header shortcut to the version list ("⋯" menu has it too); only for movies
// that have more than one version.
export const VersionsButton: FC<{ progress?: SharedValue<number> }> = ({
  progress,
}) => {
  const { t } = useTranslation();
  const { sources, versionsGroup } = useVersionSwitch(progress);
  if (sources.length < 2) return null;
  return (
    <PlatformDropdown
      title={t("slowmo.versions")}
      groups={[versionsGroup]}
      expoUIConfig={{}}
      bottomSheetConfig={{ enablePanDownToClose: true }}
      trigger={
        <View className='aspect-square flex flex-col rounded-xl items-center justify-center p-2'>
          <Ionicons
            name='layers-outline'
            size={ICON_SIZES.HEADER}
            color='white'
          />
        </View>
      }
    />
  );
};

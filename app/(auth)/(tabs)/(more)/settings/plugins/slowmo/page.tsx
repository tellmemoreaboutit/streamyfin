import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { HeaderButton } from "@/components/common/HeaderButton";
import { Text } from "@/components/common/Text";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { PlatformDropdown } from "@/components/PlatformDropdown";
import { useDismissKeyboardOnLeave } from "@/hooks/useDismissKeyboardOnLeave";
import { useSettings } from "@/utils/atoms/settings";
import { SLOWMO_FACTORS } from "@/utils/slowmo";

export default function SlowmoSettingsPage() {
  useDismissKeyboardOnLeave();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const [url, setUrl] = useState(settings?.slowmoServerUrl || "");
  const [token, setToken] = useState(settings?.slowmoToken || "");

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton
          variant='text'
          onPress={() => {
            updateSettings({
              slowmoServerUrl: url.trim().replace(/\/+$/, ""),
              slowmoToken: token.trim(),
            });
            toast.success(t("slowmo.saved"));
          }}
        >
          <Text className='text-blue-500'>{t("slowmo.save")}</Text>
        </HeaderButton>
      ),
    });
  }, [navigation, url, token, t]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className='px-4 pt-4'>
        <ListGroup>
          <ListItem title={t("slowmo.server_url")}>
            <TextInput
              className='text-white text-right flex-1'
              placeholder='http://192.168.1.50:8765'
              value={url}
              keyboardType='url'
              returnKeyType='done'
              autoCapitalize='none'
              textContentType='URL'
              onChangeText={setUrl}
            />
          </ListItem>
          <ListItem title={t("slowmo.default_factor")}>
            <PlatformDropdown
              title={t("slowmo.default_factor")}
              groups={[
                {
                  options: SLOWMO_FACTORS.map((factor) => ({
                    type: "radio" as const,
                    label: `x${factor}`,
                    value: String(factor),
                    selected: (settings?.slowmoLastFactor ?? 4) === factor,
                    onPress: () => updateSettings({ slowmoLastFactor: factor }),
                  })),
                },
              ]}
              trigger={
                <View className='flex flex-row items-center pl-3 py-1.5'>
                  <Text className='text-[#8E8D91]'>
                    x{settings?.slowmoLastFactor ?? 4}
                  </Text>
                </View>
              }
            />
          </ListItem>
          <ListItem title={t("slowmo.token")}>
            <TextInput
              className='text-white text-right flex-1'
              value={token}
              secureTextEntry
              returnKeyType='done'
              autoCapitalize='none'
              onChangeText={setToken}
            />
          </ListItem>
        </ListGroup>
      </View>
    </ScrollView>
  );
}

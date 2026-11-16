import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { useSettings } from "@/utils/atoms/settings";
import { deleteSlowmoJob, getSlowmoJobs, type SlowmoJob } from "@/utils/slowmo";

export default function SlowmoJobsPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["slowmo-jobs", settings.slowmoServerUrl],
    queryFn: () => getSlowmoJobs(settings),
    enabled: !!settings.slowmoServerUrl,
    gcTime: 0,
    refetchInterval: 4000, // polls while this screen is mounted
  });

  const onJobPress = (j: SlowmoJob) => {
    const active = j.status === "queued" || j.status === "running";
    const run = () =>
      deleteSlowmoJob(settings, j.id)
        .then(() => refetch())
        .catch((e) => toast.error(`${t("slowmo.failed")}: ${e.message}`));
    // A running job is stopped mid-way, so ask first
    Alert.alert(
      j.name,
      j.status === "running" ? t("slowmo.cancel_running_confirm") : undefined,
      [
        { text: t("slowmo.cancel"), style: "cancel" },
        {
          text: active ? t("slowmo.cancel_job") : t("slowmo.remove"),
          style: "destructive",
          onPress: run,
        },
      ],
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
        />
      }
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className='px-4 pt-4'>
        {error && <Text className='text-red-500 mb-2'>{String(error)}</Text>}
        {data?.length === 0 && (
          <Text className='text-neutral-500'>{t("slowmo.no_jobs")}</Text>
        )}
        {!!data?.length && (
          <ListGroup>
            {[...data].reverse().map((j) => (
              <ListItem
                key={j.id}
                onPress={() => onJobPress(j)}
                title={j.name}
                subtitle={`x${j.factor}, ${
                  j.segments.length
                    ? `${j.segments.length} ${t("slowmo.jobs_segments")}`
                    : t("slowmo.whole")
                }${j.error ? `, ${j.error}` : ""}`}
                value={`${j.status} ${Math.round(j.progress * 100)}%`}
              />
            ))}
          </ListGroup>
        )}
      </View>
    </ScrollView>
  );
}

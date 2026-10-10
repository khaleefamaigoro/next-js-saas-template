import { PageHeader } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPlatformSettings } from "@/lib/platform/settings";
import { PlatformPlansForm } from "./plans-form";

export default async function PlatformSettingsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_SETTINGS_WRITE.key);
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" />
      <PlatformPlansForm
        initialPlans={settings.plans}
        initialDefaultPlanKey={settings.defaultPlanKey}
        initialTrialDays={settings.trialDays}
      />
    </div>
  );
}

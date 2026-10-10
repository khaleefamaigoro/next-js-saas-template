<<<<<<< HEAD
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
=======
import { PageHeader, Card } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function PlatformSettingsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_SETTINGS_WRITE.key);
  return (
    <div>
      <PageHeader title="Platform settings" />
      <Card>
        <p className="text-sm text-stone-600">
          Platform-wide settings (feature flags, default tenant template, email templates,
          OTP provider) are managed via environment configuration in this build.
        </p>
      </Card>
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    </div>
  );
}

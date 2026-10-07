import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";

export default function ClientChangePasswordPage() {
  return (
    <AuthLayoutWrapper>
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <CardTitle className="text-2xl font-medium text-card-foreground">Set a new password</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </AuthLayoutWrapper>
  );
}

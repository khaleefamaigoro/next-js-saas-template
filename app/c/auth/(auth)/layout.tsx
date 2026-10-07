import { redirectIfAuthenticated } from "@/lib/auth/page-guards";

export default async function ClientAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated("client");
  return <>{children}</>;
}

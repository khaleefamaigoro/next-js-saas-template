import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

export function notificationPermission(
  _module: "STATION" | "FLEET" | "CORE",
  write: boolean
): PermissionKey {
  return write
    ? PERMISSIONS.TENANT_NOTIFICATIONS_WRITE.key
    : PERMISSIONS.TENANT_NOTIFICATIONS_READ.key;
}

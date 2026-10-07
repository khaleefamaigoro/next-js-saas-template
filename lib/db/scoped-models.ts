/**
 * Tenant-scoping classification used by the Prisma client extension
 * (`lib/db/extension.ts`).
 *
 * - STRICT_SCOPED: models whose `tenantId` is non-nullable. Every query MUST be
 *   bound to a tenant. Querying them in platform context (no tenantId) is a bug
 *   and throws.
 * - NULLABLE_SCOPED: models whose `tenantId` is nullable (rows can be
 *   platform-owned). In tenant context they are filtered to the tenant; in
 *   platform context the extension does not filter (platform may see all rows).
 */

export const STRICT_SCOPED: ReadonlySet<string> = new Set([
  "TenantUser",
  "Client",
  "PendingClientRegistration",
  "Template",
  "NotificationChannelSetting",
  "NotificationMessage",
  "NotificationDelivery",
]);

export const NULLABLE_SCOPED: ReadonlySet<string> = new Set([
  "RoleTemplate",
  "ActivityLog",
]);

export function isScopedModel(model: string | undefined): boolean {
  if (!model) return false;
  return STRICT_SCOPED.has(model) || NULLABLE_SCOPED.has(model);
}

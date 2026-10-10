import { prisma } from "@/lib/db/client";

/** Returns true if this key was claimed for the first time. */
export async function claimDurableKey(id: string): Promise<boolean> {
  try {
    await prisma.durableKey.create({ data: { id } });
    return true;
  } catch {
    return false;
  }
}

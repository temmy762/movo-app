import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Return a Stripe customer id that is valid in the CURRENT Stripe mode.
 *
 * Customer ids are mode-specific: everyone who used the app while it ran on
 * test keys has a `cus_…` stored that does NOT exist in live mode, so the
 * first live checkout failed with "No such customer". Instead of erroring,
 * verify the stored id and transparently create a fresh customer when it's
 * stale (or deleted), persisting the replacement.
 */
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  user: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    stripeCustomerId: string | null;
  },
): Promise<string> {
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) return user.stripeCustomerId;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "resource_missing") throw e;
      /* stale id from the other Stripe mode — fall through and recreate */
    }
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: `${user.firstName} ${user.lastName}`.trim(),
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

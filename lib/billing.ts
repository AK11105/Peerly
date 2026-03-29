/**
 * Billing provider stub.
 * Swap out these implementations when integrating a real payment provider
 * (e.g. Razorpay, Paddle, LemonSqueezy, Cashfree, etc.)
 */

/** Start a checkout / upgrade flow — return a redirect URL. */
export async function createCheckoutUrl(_userId: string): Promise<string> {
  // TODO: create a payment session with your provider and return the redirect URL
  throw new Error('Payment provider not configured yet')
}

/** Open the billing management / subscription portal — return a redirect URL. */
export async function createPortalUrl(_userId: string): Promise<string> {
  // TODO: create a portal session with your provider and return the redirect URL
  throw new Error('Payment provider not configured yet')
}

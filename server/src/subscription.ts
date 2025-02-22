import Stripe from 'stripe';
import { db } from './db';
import { subscriptions, type Subscription } from '../schema';
import { and, eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const PRICE_ID = 'price_H5ggYwtDq4fbrJ'; // Replace with your actual Stripe price ID

export async function createCheckoutSession(email: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/canceled`,
    customer_email: email,
  });

  return session;
}

export async function validateSubscription(email: string): Promise<boolean> {
  // Check if user has an active subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.email, email),
        eq(subscriptions.active, true)
      )
    );

  if (!subscription) {
    return false;
  }

  // Check if subscription has expired
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    await db
      .update(subscriptions)
      .set({ active: false })
      .where(eq(subscriptions.id, subscription.id));
    return false;
  }

  return true;
}   
import { pgTable, text, serial, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  partner1Name: text("partner1_name").notNull(),
  partner2Name: text("partner2_name").notNull(),
  partner1Audio: text("partner1_audio").notNull(),
  partner2Audio: text("partner2_audio").notNull(),
  mode: text("mode").notNull(),
  aiResponse: text("ai_response"),
  active: boolean("active").default(true),
  transcriptionData: jsonb("transcription_data"),
  isLiveArgument: boolean("is_live_argument").default(false),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  partner1Name: true,
  partner2Name: true,
  partner1Audio: true,
  partner2Audio: true,
  mode: true,
  isLiveArgument: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  email: true,
  stripeCustomerId: true,
  stripePriceId: true,
  expiresAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const modeSchema = z.enum(["counselor", "evaluator", "dinner", "entertainment"]);
export type CounselingMode = z.infer<typeof modeSchema>;
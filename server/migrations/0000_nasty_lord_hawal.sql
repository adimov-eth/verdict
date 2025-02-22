CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner1_name" text NOT NULL,
	"partner2_name" text NOT NULL,
	"partner1_audio" text NOT NULL,
	"partner2_audio" text NOT NULL,
	"mode" text NOT NULL,
	"ai_response" text,
	"active" boolean DEFAULT true,
	"transcription_data" jsonb,
	"is_live_argument" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	CONSTRAINT "subscriptions_email_unique" UNIQUE("email")
);

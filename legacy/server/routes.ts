import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertSessionSchema, modeSchema } from "@shared/schema";
import { analyzeConflict, transcribeAudio, checkAPIStatus } from "./openai";
import { z } from "zod";
import { createCheckoutSession, validateSubscription } from "./subscription";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Create Stripe checkout session
  app.post("/api/checkout", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const session = await createCheckoutSession(email);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      // Check subscription
      const { email } = req.body;
      if (!email || !(await validateSubscription(email))) {
        return res.status(402).json({ error: "Subscription required" });
      }

      // Check API status first
      const apiStatus = await checkAPIStatus();
      if (!apiStatus.hasAccess) {
        return res.status(400).json({ error: apiStatus.message });
      }

      const data = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(data);

      // Transcribe both audio recordings
      try {
        const [partner1Text, partner2Text] = await Promise.all([
          transcribeAudio(data.partner1Audio),
          transcribeAudio(data.partner2Audio)
        ]);

        // Analyze the conflict
        const mode = modeSchema.parse(data.mode);
        const analysis = await analyzeConflict(
          partner1Text,
          partner2Text,
          mode,
          Boolean(data.isLiveArgument), // Explicitly convert to boolean
          data.partner1Name,
          data.partner2Name
        );

        // Update session with AI response
        const updatedSession = await storage.updateSessionResponse(session.id, analysis);
        res.json(updatedSession);
      } catch (transcriptionError) {
        console.error('Audio processing error:', transcriptionError);
        res.status(400).json({
          error: "Failed to process audio recordings. Please ensure the recordings are clear and try again.",
          details: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Session creation error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid request data',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  app.get("/api/openai/status", async (_req, res) => {
    try {
      const status = await checkAPIStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to check API status'
      });
    }
  });


  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  });

  return httpServer;
}
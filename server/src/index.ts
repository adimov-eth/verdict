import { type Server } from "bun";
import { createCheckoutSession, validateSubscription } from "./subscription";
import { storage } from "./storage";
import { analyzeConflict, checkAPIStatus, createAnalysisStream } from "./ai";
import { transcribeAudio } from "./transcribe";

const PORT = Number(process.env.PORT) || 3000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Content-Type": "application/json",
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // Add CORS headers to all responses
    const responseHeaders = new Headers(CORS_HEADERS);
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { 
        status: 204,
        headers: responseHeaders
      });
    }

    try {
      // Health Check Endpoint
      if (req.method === "GET" && pathname === "/api/openai/status") {
        const status = await checkAPIStatus();
        return Response.json(status, { headers: responseHeaders });
      }

      // Create Checkout Session
      if (req.method === "POST" && pathname === "/api/checkout") {
        const { email } = await req.json();
        if (!email) {
          return Response.json(
            { error: "Email is required" },
            { status: 400, headers: responseHeaders }
          );
        }
        const session = await createCheckoutSession(email);
        return Response.json({ url: session.url }, { headers: responseHeaders });
      }

      // Create Session with Audio Processing
      if (req.method === "POST" && pathname === "/api/sessions") {
        const data = await req.json();

        // DEVELOPMENT OVERRIDE: Bypass subscription check
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (!isDevelopment) {
          // Validate subscription only in production
          if (!data.email || !(await validateSubscription(data.email))) {
            return Response.json(
              { error: "Subscription required" },
              { status: 402, headers: responseHeaders }
            );
          }
        }

        try {
          // First transcribe both audio files
          console.log('[Server] Starting transcription for partner1...');
          const partner1Transcription = await transcribeAudio(data.partner1Audio);
          
          let partner2Transcription = null;
          if (!data.isLiveArgument && data.partner2Audio) {
            console.log('[Server] Starting transcription for partner2...');
            partner2Transcription = await transcribeAudio(data.partner2Audio);
          }

          console.log('[Server] Creating session...');
          const session = await storage.createSession(data);

          // Get complete analysis response
          const { aiResponse } = await createAnalysisStream({
            partner1Name: data.partner1Name,
            partner2Name: data.partner2Name,
            partner1Transcription,
            partner2Transcription,
            mode: data.mode,
            isLiveArgument: data.isLiveArgument,
            sessionId: session.id,
            onComplete: async (response) => {
              await storage.updateSessionResponse(session.id, response);
            }
          });

          return Response.json({ 
            aiResponse,
            sessionId: session.id 
          }, { 
            headers: responseHeaders 
          });
        } catch (error: any) {
          console.error('[Server] Processing error:', error);
          return Response.json(
            { error: error.message || 'Failed to process audio' },
            { status: 500, headers: responseHeaders }
          );
        }
      }

      // Fetch Session by ID
      if (req.method === "GET" && pathname.startsWith("/api/sessions/")) {
        const id = Number(pathname.split("/").pop());
        const session = await storage.getSession(id);
        if (!session) {
          return Response.json(
            { error: "Session not found" },
            { status: 404, headers: responseHeaders }
          );
        }
        return Response.json(session, { headers: responseHeaders });
      }

      // Not Found
      return new Response("Not Found", { status: 404 });
    } catch (error: any) {
      console.error("Request error:", error);
      return Response.json(
        { error: error.message },
        { status: 500, headers: responseHeaders }
      );
    }
  },
});

console.log(`Server running at ${server.url}`);
//TODO check @ai-sdk/openai dependency
import { openai } from '@ai-sdk/openai';
import type { CounselingMode } from "../schema";
import { streamText, type CoreMessage } from 'ai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkAPIStatus(): Promise<{ hasAccess: boolean, message: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { 
        hasAccess: false, 
        message: 'OpenAI API key is not configured' 
      };
    }

    const result = streamText({
      model: openai('gpt-4'),
      messages: [{ role: "user", content: "test" }],
      maxTokens: 1
    });

    return {
      hasAccess: true,
      message: 'API access confirmed'
    };
  } catch (error: any) {
    console.error('API Status Check Error:', error);

    if (error.message?.includes('insufficient_quota')) {
      return {
        hasAccess: false,
        message: 'API quota exceeded. Please check your billing status. Note: New credits may take a few minutes to be recognized.'
      };
    }

    return {
      hasAccess: false,
      message: `API error: ${error.message}`
    };
  }
}

export async function analyzeConflict(
  partner1Text: string,
  partner2Text: string,
  mode: CounselingMode,
  isLiveArgument: boolean = false,
  partner1Name: string,
  partner2Name: string
): Promise<string> {
  console.log('[AI] Starting conflict analysis:', {
    mode,
    isLiveArgument,
    partner1Name,
    partner2Name,
    partner1TextLength: partner1Text?.length || 0,
    partner2TextLength: partner2Text?.length || 0
  });

  try {
    console.log('[AI] Parsing partner1 text...');
    const partner1Data = JSON.parse(partner1Text);
    console.log('[AI] Partner1 data parsed successfully:', {
      hasText: Boolean(partner1Data.text),
      hasSegments: Boolean(partner1Data.segments),
      textLength: partner1Data.text?.length || 0,
      segmentsCount: partner1Data.segments?.length || 0
    });

    let partner2Data = null;
    if (partner2Text) {
      console.log('[AI] Parsing partner2 text...');
      partner2Data = JSON.parse(partner2Text);
      console.log('[AI] Partner2 data parsed successfully:', {
        hasText: Boolean(partner2Data.text),
        hasSegments: Boolean(partner2Data.segments),
        textLength: partner2Data.text?.length || 0,
        segmentsCount: partner2Data.segments?.length || 0
      });
    }

    let analysisPrompt = '';
    let systemPrompt = "You are a direct and decisive relationship analyst. Always start with a clear verdict. Be concise, keeping responses under 150 words.";

    if (mode === "dinner") {
      console.log('[AI] Preparing dinner mode prompt...');
      systemPrompt = "You are a decisive meal planning assistant. Always start with a clear recommendation. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = isLiveArgument 
        ? `Based on ${partner1Name} and ${partner2Name}'s dinner discussion:

${partner1Data.text}
${partner2Data ? `\nContinued discussion: ${partner2Data.text}` : ''}

FORMAT:
VERDICT: Start with "You should eat [specific recommendation]"
WHY: 2-3 bullet points explaining why
ALTERNATIVES: 1-2 backup options`
        : `Based on ${partner1Name} and ${partner2Name}'s separate food preferences:

${partner1Name}'s preferences: ${partner1Data.text}
${partner2Name}'s preferences: ${partner2Data?.text || 'No preferences provided'}

FORMAT:
VERDICT: Start with "You should eat [specific recommendation]"
WHY: 2-3 bullet points explaining why
ALTERNATIVES: 1-2 backup options`;
    } 
    else if (mode === "entertainment") {
      console.log('[AI] Preparing entertainment mode prompt...');
      systemPrompt = "You are a decisive entertainment recommender. Always start with a clear show/movie pick. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = isLiveArgument
        ? `Based on ${partner1Name} and ${partner2Name}'s discussion:

${partner1Data.text}
${partner2Data ? `\nContinued discussion: ${partner2Data.text}` : ''}

FORMAT:
VERDICT: Start with "Watch [specific show/movie]"
WHY: 2-3 bullet points on why it's perfect
ALTERNATIVES: 1-2 backup recommendations`
        : `Based on ${partner1Name} and ${partner2Name}'s entertainment preferences:

${partner1Name}'s preferences: ${partner1Data.text}
${partner2Name}'s preferences: ${partner2Data?.text || 'No preferences provided'}

FORMAT:
VERDICT: Start with "Watch [specific show/movie]"
WHY: 2-3 bullet points on why it's perfect
ALTERNATIVES: 1-2 backup recommendations`;
    }
    else if (isLiveArgument) {
      console.log('[AI] Preparing live argument analysis prompt...');
      systemPrompt = "You are a direct and decisive relationship analyst. Always start with a clear verdict. Be concise, keeping responses under 150 words.";
      analysisPrompt = `Analyze this live argument between ${partner1Name} and ${partner2Name}:

${partner1Data.text}
${partner2Data ? `\nContinued argument: ${partner2Data.text}` : ''}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    } 
    else {
      console.log('[AI] Preparing standard analysis prompt...');
      analysisPrompt = `Analyze these perspectives from ${partner1Name} and ${partner2Name}:

${partner1Name}'s view: ${partner1Data.text}
${partner2Name}'s view: ${partner2Data?.text || 'No perspective provided'}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    }

    console.log('[AI] Sending request to OpenAI:', {
      model: 'gpt-4',
      systemPromptLength: systemPrompt.length,
      analysisPromptLength: analysisPrompt.length,
      temperature: mode === "counselor" ? 0.7 : 0.3
    });

    console.log('[AI] Analysis prompt:', analysisPrompt);

    const result = streamText({
      model: openai('gpt-4'),
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: analysisPrompt 
        }
      ],
      temperature: mode === "counselor" ? 0.7 : 0.3,
      maxTokens: 300,
    });

    let fullResponse = '';
    console.log('[AI] Starting to receive stream...');
    for await (const delta of result.textStream) {
      console.log('[AI] Received chunk:', delta);
      fullResponse += delta;
    }
    console.log('[AI] Stream complete. Full response:', fullResponse);
    console.log('[AI] Response length:', fullResponse.length);

    if (!fullResponse) {
      console.error('[AI] Empty response received from OpenAI');
      throw new Error('Analysis failed - empty response from AI');
    }

    // Format the response as JSON
    const aiResponse = {
      verdict: fullResponse,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(aiResponse);
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    console.error('[AI] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error('Analysis failed. Please try again.');
  }
}

// Helper function to create a streaming response
export function createStreamingResponse(
  messages: CoreMessage[],
  temperature: number = 0.7,
  maxTokens: number = 300
) {
  return streamText({
    model: openai('gpt-4'),
    messages,
    temperature,
    maxTokens,
  });
}

interface AnalysisStreamOptions {
  partner1Name: string;
  partner2Name: string;
  partner1Transcription: string;
  partner2Transcription: string | null;
  mode: CounselingMode;
  isLiveArgument: boolean;
  sessionId: number;
  onComplete: (response: string) => Promise<void>;
}

export async function createAnalysisStream(options: AnalysisStreamOptions): Promise<{ aiResponse: string }> {
  const {
    partner1Name,
    partner2Name,
    partner1Transcription,
    partner2Transcription,
    mode,
    isLiveArgument,
    sessionId,
    onComplete
  } = options;

  try {
    console.log('[AI] Starting analysis...');

    let systemPrompt = "You are a direct and decisive relationship analyst. Always start with a clear verdict. Be concise, keeping responses under 150 words.";
    let analysisPrompt = '';

    if (mode === "dinner") {
      systemPrompt = "You are a decisive meal planning assistant. Always start with a clear recommendation. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = `Based on ${partner1Name} and ${partner2Name}'s ${isLiveArgument ? 'dinner discussion' : 'separate food preferences'}:

${partner1Transcription}
${partner2Transcription ? `\nContinued discussion: ${partner2Transcription}` : ''}

FORMAT:
VERDICT: Start with "You should eat [specific recommendation]"
WHY: 2-3 bullet points explaining why
ALTERNATIVES: 1-2 backup options`;
    }
    else if (mode === "entertainment") {
      systemPrompt = "You are a decisive entertainment recommender. Always start with a clear show/movie pick. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = `Based on ${partner1Name} and ${partner2Name}'s discussion:

${partner1Transcription}
${partner2Transcription ? `\nContinued discussion: ${partner2Transcription}` : ''}

FORMAT:
VERDICT: Start with "Watch [specific show/movie]"
WHY: 2-3 bullet points on why it's perfect
ALTERNATIVES: 1-2 backup recommendations`;
    }
    else if (isLiveArgument) {
      analysisPrompt = `Analyze this live argument between ${partner1Name} and ${partner2Name}:

${partner1Transcription}
${partner2Transcription ? `\nContinued argument: ${partner2Transcription}` : ''}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    } 
    else {
      analysisPrompt = `Analyze these perspectives from ${partner1Name} and ${partner2Name}:

${partner1Name}'s view: ${partner1Transcription}
${partner2Name}'s view: ${partner2Transcription || 'No perspective provided'}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    }

    console.log('[AI] Starting GPT-4 with prompt:', { systemPrompt, analysisPrompt });

    const result = streamText({
      model: openai('gpt-4'),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisPrompt }
      ],
      temperature: mode === "counselor" ? 0.7 : 0.3,
      maxTokens: 300,
    });

    let fullResponse = '';
    for await (const delta of result.textStream) {
      fullResponse += delta;
    }

    console.log('[AI] Response complete:', fullResponse);

    // Call onComplete with the final response
    const finalResponse = JSON.stringify({
      verdict: fullResponse,
      timestamp: new Date().toISOString()
    });

    await onComplete(finalResponse);

    return { aiResponse: fullResponse };
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    throw new Error('Analysis failed. Please try again.');
  }
}
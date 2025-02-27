import { openai } from '@ai-sdk/openai';
import type { CounselingMode } from "../schema";
import { streamText, type CoreMessage } from 'ai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

/** System prompts for each counseling mode */
const SYSTEM_PROMPTS: Record<CounselingMode, string> = {
  evaluator: "You are a debate judge and arbiter that will listen to a relationship argument between two partners, then pick the winner based on who you think is right and wrong. You must always pick a clear winner. Your response should start with the name of the person who is right, and explain why that is the case. Be concise, keeping responses under 150 words.",
  counselor: "You are a relationship counselor that will listen to the perspective of the two speakers and think deeply to mediate and resolve any argument presented. You will help them find common ground and propose a resolution that ends their conflict. Be concise, keeping responses under 300 words.",
  dinner: "You are a decisive meal planning assistant for a picky couple that is hungry and indecisive about what they want to eat. You will analyze their preferences or discussion to recommend a specific genre of food along with a few recommended dishes. Start with a clear selection of what they should order, then justify the choice. Keep responses concise and under 100 words.",
  entertainment: "You are a decisive entertainment recommender. You will analyze the entertainment preferences or discussion points from two partners to recommend a specific show or movie. Start with a clear pick and justify it. Keep responses under 150 words."
};

/** Introductory text for user prompts based on mode and context */
const INTRO_TEXT: Record<CounselingMode, { live: string; separate: string }> = {
  evaluator: {
    live: 'Based on the following argument discussion:',
    separate: 'Based on their perspectives on the issue:'
  },
  counselor: {
    live: 'Based on the following argument discussion:',
    separate: 'Based on their perspectives on the issue:'
  },
  dinner: {
    live: 'Based on the following discussion about what to eat:',
    separate: 'Based on their food preferences:'
  },
  entertainment: {
    live: 'Based on the following discussion about entertainment:',
    separate: 'Based on their entertainment preferences:'
  }
};

/**
 * Generates a user prompt based on mode, partner inputs, and context
 * @param mode Counseling mode
 * @param partner1Name Name of the first partner
 * @param partner2Name Name of the second partner
 * @param partner1Text First partner's input text
 * @param partner2Text Second partner's input text (nullable)
 * @param isLiveArgument Whether the input is from a live argument
 * @returns Formatted user prompt string
 */
function getUserPrompt(
  mode: CounselingMode,
  partner1Name: string,
  partner2Name: string,
  partner1Text: string,
  partner2Text: string | null,
  isLiveArgument: boolean
): string {
  const intro = isLiveArgument ? INTRO_TEXT[mode].live : INTRO_TEXT[mode].separate;
  const partner2Statement = partner2Text ? `- ${partner2Name}: ${partner2Text}` : `- ${partner2Name}: No input provided`;
  const analysisText = `- ${partner1Name}: ${partner1Text}\n${partner2Statement}`;

  let format = '';
  switch (mode) {
    case 'evaluator':
      format = `
**FORMAT**:
- **WINNER**: [Name of the winner]
- **WHY**: 2-3 bullet points explaining why they are right`;
      break;
    case 'counselor':
      format = `
**FORMAT**:
- **KEY INSIGHTS**: 2-3 bullet points summarizing the conflict
- **RESOLUTION**: Specific advice to resolve the conflict`;
      break;
    case 'dinner':
      format = `
**FORMAT**:
- **VERDICT**: 'You should eat [specific recommendation]'
- **WHY**: 2-3 bullet points explaining the choice
- **ALTERNATIVES**: 1-2 backup options`;
      break;
    case 'entertainment':
      format = `
**FORMAT**:
- **VERDICT**: 'Watch [specific show/movie]'
- **WHY**: 2-3 bullet points justifying the pick
- **ALTERNATIVES**: 1-2 backup recommendations`;
      break;
  }

  return `${intro}\n${analysisText}\n${format}`;
}

/**
 * Checks the OpenAI API status
 * @returns Promise with access status and message
 */
export async function checkAPIStatus(): Promise<{ hasAccess: boolean; message: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { hasAccess: false, message: 'OpenAI API key is not configured' };
    }

    await streamText({
      model: openai('gpt-4'),
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 1
    });

    return { hasAccess: true, message: 'API access confirmed' };
  } catch (error: any) {
    console.error('API Status Check Error:', error);
    return {
      hasAccess: false,
      message: error.message?.includes('insufficient_quota')
        ? 'API quota exceeded. Please check your billing status.'
        : `API error: ${error.message}`
    };
  }
}

/**
 * Analyzes a conflict between two partners based on the specified mode
 * @param partner1Text JSON string containing the first partner's input
 * @param partner2Text JSON string containing the second partner's input (nullable)
 * @param mode Counseling mode
 * @param isLiveArgument Whether the input is from a live argument
 * @param partner1Name Name of the first partner
 * @param partner2Name Name of the second partner
 * @returns Promise with JSON string containing the AI's response
 */
export async function analyzeConflict(
  partner1Text: string,
  partner2Text: string,
  mode: CounselingMode,
  isLiveArgument: boolean = false,
  partner1Name: string,
  partner2Name: string
): Promise<string> {
  try {
    const partner1Data = JSON.parse(partner1Text);
    const partner2Data = partner2Text ? JSON.parse(partner2Text) : null;

    const systemPrompt = SYSTEM_PROMPTS[mode];
    const userPrompt = getUserPrompt(
      mode,
      partner1Name,
      partner2Name,
      partner1Data.text,
      partner2Data?.text || null,
      isLiveArgument
    );

    const messages: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const temperature = mode === 'counselor' ? 0.7 : 0.3;

    const result = await streamText({
      model: openai('gpt-4'),
      messages,
      temperature,
      maxTokens: 300
    });

    let fullResponse = '';
    for await (const delta of result.textStream) {
      fullResponse += delta;
    }

    if (!fullResponse) {
      throw new Error('Analysis failed - empty response from AI');
    }

    const aiResponse = {
      verdict: fullResponse,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(aiResponse);
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    throw new Error('Analysis failed. Please try again.');
  }
}

/** Options for creating an analysis stream */
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

/**
 * Creates a streaming analysis response for the specified mode
 * @param options Analysis stream options
 * @returns Promise with the AI's response
 */
export async function createAnalysisStream(
  options: AnalysisStreamOptions
): Promise<{ aiResponse: string }> {
  const {
    partner1Name,
    partner2Name,
    partner1Transcription,
    partner2Transcription,
    mode,
    isLiveArgument,
    onComplete
  } = options;

  try {
    const systemPrompt = SYSTEM_PROMPTS[mode];
    const userPrompt = getUserPrompt(
      mode,
      partner1Name,
      partner2Name,
      partner1Transcription,
      partner2Transcription,
      isLiveArgument
    );

    const messages: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const temperature = mode === 'counselor' ? 0.7 : 0.3;

    const result = await streamText({
      model: openai('gpt-4'),
      messages,
      temperature,
      maxTokens: 300
    });

    let fullResponse = '';
    for await (const delta of result.textStream) {
      fullResponse += delta;
    }

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
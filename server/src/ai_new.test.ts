import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { CounselingMode } from '../schema';

/**
 * AI Module Tests
 * 
 * HOW TO RUN SPECIFIC TESTS:
 * 
 * 1. Run all tests:
 *    bun test
 * 
 * 2. Run a specific test file:
 *    bun test server/src/ai_new.test.ts
 * 
 * 3. Run only specific tests using .only:
 *    - Modify a test: it.only('test name', async () => {...})
 *    - Or a describe block: describe.only('block name', () => {...})
 *    - Then run: bun test
 *    - (Remember to remove .only when done)
 * 
 * 4. Run tests in watch mode (auto-re-run on file changes):
 *    bun test --watch
 * 
 * 5. Show test coverage:
 *    bun test --coverage
 * 
 * 6. Enable debug logging of AI responses:
 *    DEBUG_AI_RESPONSES=true bun test
 * 
 * When using Bun with Vitest, some Vitest CLI options like -t may not work properly
 * due to how mocking is handled differently. Stick with .only for targeting specific tests.
 */

// Import modules we want to mock
import * as ai from 'ai';
import * as aiSdk from '@ai-sdk/openai';

// Import the functions to test
import { analyzeConflict, checkAPIStatus, createAnalysisStream } from './ai_new';
import fs from 'fs';
import path from 'path';

// Log AI responses for debugging purposes
// Set DEBUG_AI_RESPONSES=true when running tests to enable logging
const DEBUG_AI_RESPONSES = 'true';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (DEBUG_AI_RESPONSES && !fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`[TEST] Created logs directory at ${logsDir}`);
  } catch (error: unknown) {
    console.error(`[TEST] Failed to create logs directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// AI Logger utility
const aiLogger = {
  logFile: path.join(logsDir, `ai_responses_${new Date().toISOString().replace(/:/g, '-')}.log`),
  
  log(message: string, data: any = null) {
    if (!DEBUG_AI_RESPONSES) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
    
    console.log(logMessage);
    
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n\n');
    } catch (error: unknown) {
      console.error(`[TEST] Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

if (DEBUG_AI_RESPONSES) {
  console.log(`[TEST] AI response logging enabled. Log file: ${aiLogger.logFile}`);
}

// Test scenarios with sample dialogs for different modes and situations
const testDialogs = {
  dinner: {
    compatible: {
      partner1: {
        name: 'Alice',
        text: 'I like Italian food, especially pasta and pizza. I\'m also a fan of fresh ingredients and homemade meals. I don\'t mind trying new cuisines occasionally.'
      },
      partner2: {
        name: 'Bob',
        text: 'I enjoy Mediterranean cuisine which has overlap with Italian. I love fresh ingredients and appreciate home-cooked meals. I\'m open to trying different restaurants.'
      }
    },
    conflicting: {
      partner1: {
        name: 'Carol',
        text: 'I\'m a huge fan of spicy food, particularly Indian and Thai curries. I love trying exotic dishes and street food. I don\'t enjoy bland meals.'
      },
      partner2: {
        name: 'Dave',
        text: 'I prefer simple, mild flavors and traditional American food. Spicy food upsets my stomach. I like predictable meals at chain restaurants I\'m familiar with.'
      }
    },
    dietary: {
      partner1: {
        name: 'Emma',
        text: 'I\'m vegan and very committed to plant-based eating for ethical and environmental reasons. I won\'t compromise on this.'
      },
      partner2: {
        name: 'Frank',
        text: 'I\'m a meat lover who enjoys steakhouses. I find most vegan options bland and unsatisfying. I rarely eat vegetables as main dishes.'
      }
    }
  },
  entertainment: {
    compatible: {
      partner1: {
        name: 'Grace',
        text: 'I enjoy sci-fi and action movies with interesting plots. I like Marvel movies and shows like The Expanse. I prefer content with a mix of action and good storytelling.'
      },
      partner2: {
        name: 'Henry',
        text: 'I\'m a fan of sci-fi with deep world-building. I enjoy action films that have good character development. I also like some Marvel films and shows that blend genres.'
      }
    },
    conflicting: {
      partner1: {
        name: 'Irene',
        text: 'I exclusively watch serious documentaries and arthouse films. I find mainstream entertainment shallow and a waste of time. I prefer educational content.'
      },
      partner2: {
        name: 'Jack',
        text: 'I love comedies, reality TV, and blockbuster action films. I watch TV to relax and don\'t want to think too hard. I get bored with slow or serious films.'
      }
    },
    mixed: {
      partner1: {
        name: 'Kelly',
        text: 'I mostly watch horror and thriller movies. I like being scared and enjoy the adrenaline rush. I also enjoy true crime documentaries and psychological thrillers.'
      },
      partner2: {
        name: 'Liam',
        text: 'I prefer comedy and light-hearted content. I get nightmares from scary movies and don\'t understand why people enjoy being frightened. I like sitcoms and stand-up comedy.'
      }
    }
  },
  relationship: {
    chores: {
      partner1: {
        name: 'Monica',
        text: 'My partner never does their share of household chores. I always have to remind them to do the dishes and take out the trash. It feels like I\'m their parent, not their partner.'
      },
      partner2: {
        name: 'Noah',
        text: 'I feel like my efforts around the house go unnoticed. I do different chores than my partner expects, but I contribute in my own way. I hate being nagged about chores constantly.'
      }
    },
    finances: {
      partner1: {
        name: 'Olivia',
        text: 'I believe in saving for our future and being careful with our spending. My partner makes impulsive purchases without consulting me, even though we agreed on a budget.'
      },
      partner2: {
        name: 'Paul',
        text: 'I work hard for my money and should be able to enjoy some of it. My partner is too controlling with our finances and treats any purchase I make as frivolous.'
      }
    },
    communication: {
      partner1: {
        name: 'Quinn',
        text: 'My partner never opens up about their feelings. I have to guess what they\'re thinking or feeling, and when I ask, they say "everything is fine" even when it clearly isn\'t.'
      },
      partner2: {
        name: 'Ryan',
        text: 'I need time to process my emotions before I can talk about them. My partner constantly pushes me to share before I\'m ready, which makes me shut down more.'
      }
    }
  }
};

// Helper function to format the dialog data for testing
const formatDialogData = (dialog: { name: string, text: string }) => {
  return {
    name: dialog.name,
    data: JSON.stringify({
      text: dialog.text,
      segments: [{ text: dialog.text }]
    })
  };
};

// Sample test data - simplified format for basic tests
const mockData = {
  partner1: formatDialogData(testDialogs.dinner.compatible.partner1),
  partner2: formatDialogData(testDialogs.dinner.compatible.partner2)
};

// Setup the mocks - this approach works better with Bun
describe('AI Module', () => {
  // Save original console methods
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  
  beforeEach(() => {
    // Silence console output during tests unless debug mode is enabled
    if (!DEBUG_AI_RESPONSES) {
      console.error = vi.fn();
      console.log = vi.fn();
    }
    
    // Setup the environment
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Mock streamText for each test
    vi.spyOn(ai, 'streamText').mockImplementation(() => {
      const mockResponse = {
        textStream: (async function* () {
          yield 'VERDICT: This is a test verdict.';
          yield ' KEY POINTS: Point 1, Point 2.';
          yield ' ADVICE: Test advice.';
        })(),
        text: 'VERDICT: This is a test verdict. KEY POINTS: Point 1, Point 2. ADVICE: Test advice.',
        choices: [],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop'
      };
      
      // Log the mock response being returned
      aiLogger.log('Mock AI Response:', mockResponse);
      
      return mockResponse as any;
    });
    
    // Mock openai
    vi.spyOn(aiSdk, 'openai').mockImplementation((model) => {
      aiLogger.log('Using OpenAI model:', model);
      return model as any;
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    
    // Clear all mocks
    vi.restoreAllMocks();
  });

  describe('checkAPIStatus', () => {
    it('should confirm API access when OpenAI API key is valid', async () => {
      aiLogger.log('Running test: should confirm API access when OpenAI API key is valid');
      
      const result = await checkAPIStatus();
      
      aiLogger.log('API status check result:', result);
      
      expect(result.hasAccess).toBe(true);
      expect(result.message).toBe('API access confirmed');
      expect(ai.streamText).toHaveBeenCalled();
    });

    it('should report missing API key when OpenAI API key is not set', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const result = await checkAPIStatus();
      
      expect(result.hasAccess).toBe(false);
      expect(result.message).toBe('OpenAI API key is not configured');
      
      // Restore key for other tests
      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should handle API quota exceeded errors', async () => {
      // Use a completely new implementation that throws an error
      vi.spyOn(ai, 'streamText').mockImplementationOnce(() => {
        const error = new Error('insufficient_quota: You exceeded your current quota');
        aiLogger.log('Simulating quota exceeded error:', error.message);
        throw error;
      });
      
      const result = await checkAPIStatus();
      
      aiLogger.log('Quota exceeded test result:', result);
      
      expect(result.hasAccess).toBe(false);
      expect(result.message).toContain('API quota exceeded');
    });

    it('should handle general API errors', async () => {
      // Use a completely new implementation that throws an error
      vi.spyOn(ai, 'streamText').mockImplementationOnce(() => {
        const error = new Error('General API error');
        aiLogger.log('Simulating general API error:', error.message);
        throw error;
      });
      
      const result = await checkAPIStatus();
      
      aiLogger.log('General API error test result:', result);
      
      expect(result.hasAccess).toBe(false);
      expect(result.message).toContain('API error:');
    });
  });

  describe('analyzeConflict', () => {
    it.only('should analyze dinner preferences correctly', async () => {
      // Use dietary conflict scenario
      const dietaryConflict = {
        partner1: formatDialogData(testDialogs.dinner.dietary.partner1),
        partner2: formatDialogData(testDialogs.dinner.dietary.partner2)
      };

      aiLogger.log('Running dinner preference test with dietary conflict:', {
        partner1: dietaryConflict.partner1.name,
        partner2: dietaryConflict.partner2.name
      });

      vi.spyOn(ai, 'streamText').mockImplementation((options) => {
        // Log the input prompt
        aiLogger.log('AI Request Prompt:', options?.messages);
        
        const mockResponse = {
          textStream: (async function* () {
            const response = 'VERDICT: Choose a vegetarian Italian restaurant. WHY: Both can find options they enjoy. ALTERNATIVES: Make pizza at home with both vegan and meat options.';
            yield response;
          })(),
          text: 'VERDICT: Choose a vegetarian Italian restaurant. WHY: Both can find options they enjoy. ALTERNATIVES: Make pizza at home with both vegan and meat options.',
          choices: [],
          usage: { promptTokens: 150, completionTokens: 35, totalTokens: 185 },
          finishReason: 'stop'
        };
        
        // Log the response
        aiLogger.log('AI Response for dinner test:', mockResponse);
        
        return mockResponse as any;
      });

      const result = await analyzeConflict(
        dietaryConflict.partner1.data,
        dietaryConflict.partner2.data,
        'dinner',
        false,
        dietaryConflict.partner1.name,
        dietaryConflict.partner2.name
      );
      
      aiLogger.log('Parsed analysis result:', JSON.parse(result));
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(parsed).toHaveProperty('timestamp');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system', 
            content: expect.stringContaining('meal planning assistant')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('**FORMAT**')
          })
        ])
      }));
    });

    it('should analyze entertainment preferences correctly', async () => {
      // Use conflicting entertainment preferences
      const entertainmentConflict = {
        partner1: formatDialogData(testDialogs.entertainment.conflicting.partner1),
        partner2: formatDialogData(testDialogs.entertainment.conflicting.partner2)
      };

      const result = await analyzeConflict(
        entertainmentConflict.partner1.data,
        entertainmentConflict.partner2.data,
        'entertainment',
        false,
        entertainmentConflict.partner1.name,
        entertainmentConflict.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system', 
            content: expect.stringContaining('entertainment recommender')
          })
        ])
      }));
    });

    it('should analyze live arguments correctly', async () => {
      // Use relationship chores scenario
      const choresConflict = {
        partner1: formatDialogData(testDialogs.relationship.chores.partner1),
        partner2: formatDialogData(testDialogs.relationship.chores.partner2)
      };

      const result = await analyzeConflict(
        choresConflict.partner1.data,
        choresConflict.partner2.data,
        'counselor',
        true, // isLiveArgument = true
        choresConflict.partner1.name,
        choresConflict.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('live argument')
          })
        ])
      }));
    });

    it('should analyze separate perspectives correctly', async () => {
      const result = await analyzeConflict(
        mockData.partner1.data,
        mockData.partner2.data,
        'evaluator',
        false,
        mockData.partner1.name,
        mockData.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('perspectives')
          })
        ])
      }));
    });

    it('should handle missing partner2 data', async () => {
      const result = await analyzeConflict(
        mockData.partner1.data,
        '', // empty partner2 data
        'counselor',
        false,
        mockData.partner1.name,
        mockData.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
    });

    it('should throw an error when OpenAI returns empty response', async () => {
      // Create a mock that returns an empty response
      vi.spyOn(ai, 'streamText').mockImplementationOnce(() => {
        const emptyResponse = {
          textStream: (async function* () {
            // Yield nothing to simulate empty response
          })(),
          text: '',
          choices: [],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'stop'
        };
        
        aiLogger.log('Simulating empty AI response:', emptyResponse);
        return emptyResponse as any;
      });
      
      aiLogger.log('Testing empty response handling...');
      
      let error;
      try {
        await analyzeConflict(
          mockData.partner1.data,
          mockData.partner2.data,
          'counselor',
          false,
          mockData.partner1.name,
          mockData.partner2.name
        );
      } catch (e) {
        error = e;
        aiLogger.log('Caught error from empty response test:', e);
      }
      
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain('Analysis failed');
      } else {
        expect(String(error)).toContain('Analysis failed');
      }
    });

    it('should handle errors during analysis', async () => {
      vi.spyOn(ai, 'streamText').mockImplementationOnce(() => {
        const error = new Error('API error during analysis');
        aiLogger.log('Simulating API error during analysis:', error.message);
        throw error;
      });
      
      aiLogger.log('Testing error during analysis handling...');
      
      let error;
      try {
        await analyzeConflict(
          mockData.partner1.data,
          mockData.partner2.data,
          'counselor',
          false,
          mockData.partner1.name,
          mockData.partner2.name
        );
      } catch (e) {
        error = e;
        aiLogger.log('Caught error during analysis test:', e);
      }
      
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain('Analysis failed');
      } else {
        expect(String(error)).toContain('Analysis failed');
      }
    });
  });

  describe('createAnalysisStream', () => {
    it('should stream analysis for dinner mode', async () => {
      const onCompleteMock = vi.fn();
      
      // Reset the mock to ensure it's called in this test
      vi.spyOn(ai, 'streamText').mockImplementation((options) => {
        aiLogger.log('Streaming API request for dinner mode:', options?.messages);
        
        const mockResponse = {
          textStream: (async function* () {
            const chunks = [
              'VERDICT: This is a dinner recommendation',
              ' WHY: Point 1, Point 2.',
              ' ALTERNATIVES: Option 1, Option 2.'
            ];
            
            for (const chunk of chunks) {
              aiLogger.log('Streaming chunk:', chunk);
              yield chunk;
            }
          })(),
          text: 'VERDICT: This is a dinner recommendation WHY: Point 1, Point 2. ALTERNATIVES: Option 1, Option 2.',
          choices: [],
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          finishReason: 'stop'
        };
        
        aiLogger.log('Mock streaming response created');
        return mockResponse as any;
      });
      
      // Use compatible dinner preferences
      const dinnerScenario = testDialogs.dinner.compatible;
      
      aiLogger.log('Running streaming test with dinner scenario:', {
        partner1: dinnerScenario.partner1.name,
        partner2: dinnerScenario.partner2.name
      });
      
      const result = await createAnalysisStream({
        partner1Name: dinnerScenario.partner1.name,
        partner2Name: dinnerScenario.partner2.name,
        partner1Transcription: dinnerScenario.partner1.text,
        partner2Transcription: dinnerScenario.partner2.text,
        mode: 'dinner',
        isLiveArgument: false,
        sessionId: 123,
        onComplete: (response) => {
          aiLogger.log('Stream complete callback triggered with response:', response);
          return onCompleteMock(response);
        }
      });
      
      aiLogger.log('Stream analysis result:', result);
      
      expect(result).toHaveProperty('aiResponse');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('meal planning assistant')
          })
        ])
      }));
      expect(onCompleteMock).toHaveBeenCalled();
    });

    it('should stream analysis for entertainment mode', async () => {
      const onCompleteMock = vi.fn();
      
      // Reset the mock to ensure it's called in this test
      vi.spyOn(ai, 'streamText').mockImplementation(() => ({
        textStream: (async function* () {
          yield 'VERDICT: This is an entertainment recommendation';
          yield ' WHY: Point 1, Point 2.';
          yield ' ALTERNATIVES: Option 1, Option 2.';
        })(),
        text: 'VERDICT: This is an entertainment recommendation WHY: Point 1, Point 2. ALTERNATIVES: Option 1, Option 2.',
        choices: [],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop'
      } as any));
      
      const result = await createAnalysisStream({
        partner1Name: mockData.partner1.name,
        partner2Name: mockData.partner2.name,
        partner1Transcription: 'I like sci-fi',
        partner2Transcription: 'I prefer comedy',
        mode: 'entertainment',
        isLiveArgument: true,
        sessionId: 123,
        onComplete: onCompleteMock
      });
      
      expect(result).toHaveProperty('aiResponse');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('entertainment recommender')
          })
        ])
      }));
      expect(onCompleteMock).toHaveBeenCalled();
    });

    it('should stream analysis for relationship counseling mode', async () => {
      const onCompleteMock = vi.fn();
      
      // Reset the mock to ensure it's called in this test
      vi.spyOn(ai, 'streamText').mockImplementation(() => ({
        textStream: (async function* () {
          yield 'VERDICT: This is a relationship analysis';
          yield ' KEY POINTS: Point 1, Point 2.';
          yield ' ADVICE: Advice 1, Advice 2.';
        })(),
        text: 'VERDICT: This is a relationship analysis KEY POINTS: Point 1, Point 2. ADVICE: Advice 1, Advice 2.',
        choices: [],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop'
      } as any));
      
      const result = await createAnalysisStream({
        partner1Name: mockData.partner1.name,
        partner2Name: mockData.partner2.name,
        partner1Transcription: 'We disagree about chores',
        partner2Transcription: 'I do my share differently',
        mode: 'counselor',
        isLiveArgument: true,
        sessionId: 123,
        onComplete: onCompleteMock
      });
      
      expect(result).toHaveProperty('aiResponse');
      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('relationship analyst')
          })
        ])
      }));
      expect(onCompleteMock).toHaveBeenCalled();
    });

    it('should handle errors during streaming', async () => {
      // Use a completely new implementation that throws an error
      vi.spyOn(ai, 'streamText').mockImplementationOnce(() => {
        throw new Error('Streaming error');
      });
      
      await expect(createAnalysisStream({
        partner1Name: mockData.partner1.name,
        partner2Name: mockData.partner2.name,
        partner1Transcription: 'Test',
        partner2Transcription: 'Test',
        mode: 'counselor',
        isLiveArgument: false,
        sessionId: 123,
        onComplete: vi.fn()
      })).rejects.toThrow('Analysis failed');
    });
  });
}); 
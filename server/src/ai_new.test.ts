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

// Add delay between tests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Set longer timeout for all tests (30 seconds)
const TEST_TIMEOUT = 30000;

describe('AI Module', () => {
  // Add delay between each test
  beforeEach(async () => {
    await delay(2000); // 2 second delay between tests
  });

  describe('checkAPIStatus', () => {
    it('should confirm API access when OpenAI API key is valid', async () => {
      const result = await checkAPIStatus();
      expect(result.hasAccess).toBe(true);
      expect(result.message).toBe('API access confirmed');
    }, TEST_TIMEOUT);

    it('should report missing API key when OpenAI API key is not set', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const result = await checkAPIStatus();
      
      expect(result.hasAccess).toBe(false);
      expect(result.message).toBe('OpenAI API key is not configured');
      
      process.env.OPENAI_API_KEY = originalKey;
    }, TEST_TIMEOUT);
  });

  describe('analyzeConflict', () => {
    it('should analyze dinner preferences correctly', async () => {
      const dietaryConflict = {
        partner1: formatDialogData(testDialogs.dinner.dietary.partner1),
        partner2: formatDialogData(testDialogs.dinner.dietary.partner2)
      };

      const result = await analyzeConflict(
        dietaryConflict.partner1.data,
        dietaryConflict.partner2.data,
        'dinner',
        false,
        dietaryConflict.partner1.name,
        dietaryConflict.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.verdict).toContain('**VERDICT**');
      expect(parsed.verdict).toContain('**WHY**');
      expect(parsed.verdict).toContain('**ALTERNATIVES**');
    }, TEST_TIMEOUT);

    it.only('should analyze entertainment preferences correctly', async () => {
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
      expect(parsed.verdict).toContain('**VERDICT**');
      expect(parsed.verdict).toContain('**WHY**');
      expect(parsed.verdict).toContain('**ALTERNATIVES**');
    }, TEST_TIMEOUT);

    it('should analyze live arguments correctly', async () => {
      const choresConflict = {
        partner1: formatDialogData(testDialogs.relationship.chores.partner1),
        partner2: formatDialogData(testDialogs.relationship.chores.partner2)
      };

      const result = await analyzeConflict(
        choresConflict.partner1.data,
        choresConflict.partner2.data,
        'counselor',
        true,
        choresConflict.partner1.name,
        choresConflict.partner2.name
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(parsed.verdict).toContain('**VERDICT**');
      expect(parsed.verdict).toContain('**KEY POINTS**');
      expect(parsed.verdict).toContain('**ADVICE**');
    }, TEST_TIMEOUT);

    it('should handle missing partner2 data', async () => {
      const result = await analyzeConflict(
        formatDialogData(testDialogs.dinner.compatible.partner1).data,
        '',
        'counselor',
        false,
        'Alice',
        'Bob'
      );
      
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('verdict');
      expect(parsed.verdict).toContain('**VERDICT**');
    }, TEST_TIMEOUT);
  });

  describe('createAnalysisStream', () => {
    it('should stream analysis for dinner mode', async () => {
      const onCompleteMock = vi.fn();
      const dinnerScenario = testDialogs.dinner.compatible;
      
      const result = await createAnalysisStream({
        partner1Name: dinnerScenario.partner1.name,
        partner2Name: dinnerScenario.partner2.name,
        partner1Transcription: dinnerScenario.partner1.text,
        partner2Transcription: dinnerScenario.partner2.text,
        mode: 'dinner',
        isLiveArgument: false,
        sessionId: 123,
        onComplete: async (response) => {
          aiLogger.log('Stream complete callback triggered with response:', response);
          await onCompleteMock(response);
        }
      });
      
      expect(result).toHaveProperty('aiResponse');
      expect(result.aiResponse).toContain('**VERDICT**');
      expect(result.aiResponse).toContain('**WHY**');
      expect(result.aiResponse).toContain('**ALTERNATIVES**');
      expect(onCompleteMock).toHaveBeenCalled();
    }, TEST_TIMEOUT);

    it('should stream analysis for entertainment mode', async () => {
      const onCompleteMock = vi.fn();
      
      const result = await createAnalysisStream({
        partner1Name: 'Alice',
        partner2Name: 'Bob',
        partner1Transcription: 'I like sci-fi movies and shows like Star Trek',
        partner2Transcription: 'I prefer comedy shows and light entertainment',
        mode: 'entertainment',
        isLiveArgument: false,
        sessionId: 123,
        onComplete: async (response) => await onCompleteMock(response)
      });
      
      expect(result).toHaveProperty('aiResponse');
      expect(result.aiResponse).toContain('**VERDICT**');
      expect(result.aiResponse).toContain('**WHY**');
      expect(result.aiResponse).toContain('**ALTERNATIVES**');
      expect(onCompleteMock).toHaveBeenCalled();
    }, TEST_TIMEOUT);

    it('should handle missing partner2 transcription', async () => {
      const onCompleteMock = vi.fn();
      
      const result = await createAnalysisStream({
        partner1Name: 'Alice',
        partner2Name: 'Bob',
        partner1Transcription: 'I like pasta and Italian food',
        partner2Transcription: null,
        mode: 'dinner',
        isLiveArgument: false,
        sessionId: 123,
        onComplete: async (response) => await onCompleteMock(response)
      });
      
      expect(result).toHaveProperty('aiResponse');
      expect(result.aiResponse).toContain('**VERDICT**');
      expect(onCompleteMock).toHaveBeenCalled();
    }, TEST_TIMEOUT);
  });
}); 
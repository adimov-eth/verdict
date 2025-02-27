import { vi } from 'vitest';
import { Readable } from 'stream';

// Mock environment variables
process.env.OPENAI_API_KEY = 'mock-api-key';

// Mock ai package
vi.mock('ai', () => {
  const mockStream = async function* mockTextStream() {
    yield 'This is ';
    yield 'a mock ';
    yield 'streamed response.';
  };

  return {
    streamText: vi.fn().mockImplementation(() => ({
      textStream: mockStream(),
    })),
    createStreamableUI: vi.fn(),
    createStreamableValue: vi.fn(),
    experimental_StreamData: vi.fn(),
  };
});

// Mock @ai-sdk/openai package
vi.mock('@ai-sdk/openai', () => {
  return {
    openai: vi.fn().mockImplementation((model) => model),
  };
}); 
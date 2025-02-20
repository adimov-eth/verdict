import OpenAI from "openai";
import type { CounselingMode } from "@shared/schema";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { FormData } from 'formdata-polyfill/esm.min.js';
import { ReadableStream } from 'web-streams-polyfill';
import { exec as execCallback } from 'child_process';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // Increase timeout to 60 seconds
  maxRetries: 3,
});

const writeFile = promisify(fs.writeFile);
const exec = promisify(execCallback);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkAPIStatus(): Promise<{ hasAccess: boolean, message: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { 
        hasAccess: false, 
        message: 'OpenAI API key is not configured' 
      };
    }

    // Try a simple API call to test access
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1
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

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('insufficient_quota')) {
        throw error;
      }
      console.log(`Retry attempt ${i + 1} failed, waiting ${initialDelay * Math.pow(2, i)}ms`);
      await sleep(initialDelay * Math.pow(2, i));
    }
  }
  throw lastError;
}

export async function transcribeAudio(audioBase64: string): Promise<string> {
  let tempFile: string | null = null;
  let wavFile: string | null = null;

  try {
    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    // Create temporary files
    const tempDir = tmpdir();
    tempFile = path.join(tempDir, `audio-${Date.now()}.webm`);
    wavFile = path.join(tempDir, `audio-${Date.now()}.wav`);

    // Convert base64 to buffer and write to temp file
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    await writeFile(tempFile, audioBuffer);

    // Verify file exists and has content
    const stats = await fs.promises.stat(tempFile);
    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }

    console.log('Converting audio format...');

    // Convert WebM to WAV using ffmpeg with optimized settings for speech
    try {
      await exec(`ffmpeg -i "${tempFile}" -acodec pcm_s16le -ar 16000 -ac 1 -y "${wavFile}"`);
    } catch (error: any) {
      console.error('FFmpeg conversion error:', error);
      throw new Error('Failed to convert audio format: ' + error.message);
    }

    // Get audio duration using ffprobe
    try {
      const { stdout } = await exec(`ffprobe -i "${wavFile}" -show_entries format=duration -v quiet -of csv="p=0"`);
      const duration = parseFloat(stdout.trim());
      console.log('Audio duration:', duration, 'seconds');

      if (duration < 0.1) {
        throw new Error('Audio recording is too short. Please record for at least 1-2 seconds.');
      }
    } catch (error: any) {
      console.error('FFprobe duration check error:', error);
      throw new Error('Failed to verify audio duration: ' + error.message);
    }

    console.log('Sending transcription request to OpenAI...');

    // Implement retryWithBackoff for the transcription request
    return await retryWithBackoff(async () => {
      const formData = new FormData();
      const file = await fs.promises.readFile(wavFile!);
      formData.append('file', new Blob([file], { type: 'audio/wav' }));
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.type === 'insufficient_quota') {
            throw new Error('OpenAI API quota exceeded. Please check your billing status and ensure you have available credits.');
          }
          throw new Error(`OpenAI API error: ${errorJson.error?.message || errorText}`);
        } catch (e: any) {
          if (e.message.includes('quota')) throw e;
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('Transcription received successfully');

      if (!result.text) {
        throw new Error('No transcription received from API');
      }

      return JSON.stringify({
        text: result.text,
        segments: result.segments,
        words: result.words
      });
    });

  } catch (error: any) {
    // Clean up temp files
    if (tempFile) {
      fs.unlink(tempFile, () => {});
    }
    if (wavFile) {
      fs.unlink(wavFile, () => {});
    }

    console.error('Transcription error:', error);
    throw error;
  } finally {
    // Ensure cleanup happens even if successful
    if (tempFile) fs.unlink(tempFile, () => {});
    if (wavFile) fs.unlink(wavFile, () => {});
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
  try {
    const partner1Data = JSON.parse(partner1Text);
    const partner2Data = isLiveArgument ? null : JSON.parse(partner2Text);

    let analysisPrompt = '';
    let systemPrompt = "You are a direct and decisive relationship analyst. Always start with a clear verdict. Be concise, keeping responses under 150 words.";

    if (mode === "dinner") {
      systemPrompt = "You are a decisive meal planning assistant. Always start with a clear recommendation. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = isLiveArgument 
        ? `Based on ${partner1Name} and ${partner2Name}'s dinner discussion, provide:

${JSON.stringify(partner1Data.segments, null, 2)}

FORMAT:
VERDICT: Start with "You should eat [specific recommendation]"
WHY: 2-3 bullet points explaining why
ALTERNATIVES: 1-2 backup options`
        : `Based on ${partner1Name} and ${partner2Name}'s separate food preferences:

${partner1Name}'s preferences: ${partner1Data.text}
${partner2Name}'s preferences: ${partner2Data.text}

FORMAT:
VERDICT: Start with "You should eat [specific recommendation]"
WHY: 2-3 bullet points explaining why
ALTERNATIVES: 1-2 backup options`;
    } 
    else if (mode === "entertainment") {
      systemPrompt = "You are a decisive entertainment recommender. Always start with a clear show/movie pick. Be specific and concise, keeping responses under 150 words.";
      analysisPrompt = isLiveArgument
        ? `Based on ${partner1Name} and ${partner2Name}'s discussion:

${JSON.stringify(partner1Data.segments, null, 2)}

FORMAT:
VERDICT: Start with "Watch [specific show/movie]"
WHY: 2-3 bullet points on why it's perfect
ALTERNATIVES: 1-2 backup recommendations`
        : `Based on ${partner1Name} and ${partner2Name}'s entertainment preferences:

${partner1Name}'s preferences: ${partner1Data.text}
${partner2Name}'s preferences: ${partner2Data.text}

FORMAT:
VERDICT: Start with "Watch [specific show/movie]"
WHY: 2-3 bullet points on why it's perfect
ALTERNATIVES: 1-2 backup recommendations`;
    }
    else if (isLiveArgument) {
      systemPrompt = "You are a direct and decisive relationship analyst. Always start with a clear verdict. Be concise, keeping responses under 150 words.";
      analysisPrompt = `Analyze this live argument between ${partner1Name} and ${partner2Name}:

${JSON.stringify(partner1Data.segments, null, 2)}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    } 
    else {
      analysisPrompt = `Analyze these perspectives from ${partner1Name} and ${partner2Name}:

${partner1Name}'s view: ${partner1Data.text}
${partner2Name}'s view: ${partner2Data.text}

FORMAT:
VERDICT: Start with a clear one-sentence judgment
KEY POINTS: 2-3 bullet points supporting your verdict
${mode === "counselor" 
  ? "ADVICE: 2 specific suggestions for better communication"
  : "WINNER: One clear sentence declaring the winner and why"}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 300,
    });

    return response.choices[0].message.content || "Analysis failed";
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('Analysis failed. Please try again.');
  }
}
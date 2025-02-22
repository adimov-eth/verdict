import fs from "fs";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { exec as execCallback } from 'child_process';

const writeFile = promisify(fs.writeFile);
const exec = promisify(execCallback);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    console.log('[Transcribe] Starting transcription process');
    
    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    console.log('[Transcribe] Audio base64 length:', audioBase64.length);

    // Create temporary files
    const tempDir = tmpdir();
    tempFile = path.join(tempDir, `audio-${Date.now()}.webm`);
    wavFile = path.join(tempDir, `audio-${Date.now()}.wav`);

    // Convert base64 to buffer and write to temp file
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    await writeFile(tempFile, audioBuffer);
    console.log('[Transcribe] Wrote audio buffer to temp file:', {
      tempFile,
      bufferLength: audioBuffer.length
    });

    // Verify file exists and has content
    const stats = await fs.promises.stat(tempFile);
    console.log('[Transcribe] Temp file stats:', {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    });

    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }

    console.log('[Transcribe] Converting audio format...');

    // Convert WebM to WAV using ffmpeg with optimized settings for speech
    try {
      await exec(`ffmpeg -i "${tempFile}" -acodec pcm_s16le -ar 16000 -ac 1 -y "${wavFile}"`);
      const wavStats = await fs.promises.stat(wavFile);
      console.log('[Transcribe] WAV conversion complete:', {
        wavFile,
        size: wavStats.size
      });
    } catch (error: any) {
      console.error('[Transcribe] FFmpeg conversion error:', error);
      throw new Error('Failed to convert audio format: ' + error.message);
    }

    // Get audio duration using ffprobe
    try {
      const { stdout } = await exec(`ffprobe -i "${wavFile}" -show_entries format=duration -v quiet -of csv="p=0"`);
      const duration = parseFloat(stdout.trim());
      console.log('[Transcribe] Audio duration:', duration, 'seconds');

      if (duration < 0.1) {
        throw new Error('Audio recording is too short. Please record for at least 1-2 seconds.');
      }
    } catch (error: any) {
      console.error('[Transcribe] FFprobe duration check error:', error);
      throw new Error('Failed to verify audio duration: ' + error.message);
    }

    console.log('[Transcribe] Sending request to OpenAI...');

    // Implement retryWithBackoff for the transcription request
    return await retryWithBackoff(async () => {
      const form = new FormData();
      const file = await fs.promises.readFile(wavFile!);
      const blob = new Blob([file], { type: 'audio/wav' });
      form.append('file', blob, 'audio.wav');
      form.append('model', 'whisper-1');
      form.append('response_format', 'json');

      console.log('[Transcribe] Sending file to OpenAI:', {
        blobSize: blob.size,
        blobType: blob.type
      });

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Transcribe] OpenAI API Error Response:', errorText);

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
      console.log('[Transcribe] Raw OpenAI response:', result);
      console.log('[Transcribe] Transcription received:', {
        textLength: result.text?.length || 0,
        hasSegments: Boolean(result.segments),
        segmentsCount: result.segments?.length || 0
      });

      if (!result.text) {
        throw new Error('No transcription received from API');
      }

      const transcriptionResult = JSON.stringify({
        text: result.text,
        segments: result.segments,
        words: result.words
      });

      console.log('[Transcribe] Final transcription result:', {
        resultLength: transcriptionResult.length,
        textPreview: result.text.substring(0, 100) + '...'
      });

      return transcriptionResult;
    });

  } catch (error) {
    // Clean up temp files
    if (tempFile) {
      fs.unlink(tempFile, () => {});
    }
    if (wavFile) {
      fs.unlink(wavFile, () => {});
    }

    console.error('[Transcribe] Transcription error:', error);
    throw error;
  } finally {
    // Ensure cleanup happens even if successful
    if (tempFile) fs.unlink(tempFile, () => {});
    if (wavFile) fs.unlink(wavFile, () => {});
  }
} 
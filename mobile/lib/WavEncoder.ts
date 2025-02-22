export class WavEncoder {
    private sampleRate: number;
    private channels: number;
    private audioData: Float32Array | null;
  
    constructor({ sampleRate = 16000, channels = 1 }: { sampleRate?: number; channels?: number } = {}) {
      this.sampleRate = sampleRate;
      this.channels = channels;
      this.audioData = null;
    }
  
    // Instead of receiving an AudioBuffer, pass a Float32Array directly.
    setInput(channelData: Float32Array): void {
      this.audioData = channelData;
    }
  
    getData(): ArrayBuffer {
      if (!this.audioData) {
        throw new Error('No audio data set');
      }
      const buffer = new ArrayBuffer(44 + this.audioData.length * 2);
      const view = new DataView(buffer);
  
      // Write WAV header helper function
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
  
      writeString(0, 'RIFF'); // ChunkID
      view.setUint32(4, 36 + this.audioData.length * 2, true); // ChunkSize
      writeString(8, 'WAVE'); // Format
      writeString(12, 'fmt '); // Subchunk1ID
      view.setUint32(16, 16, true); // Subchunk1Size
      view.setUint16(20, 1, true); // AudioFormat (PCM)
      view.setUint16(22, this.channels, true); // NumChannels
      view.setUint32(24, this.sampleRate, true); // SampleRate
      view.setUint32(28, this.sampleRate * this.channels * 2, true); // ByteRate
      view.setUint16(32, this.channels * 2, true); // BlockAlign
      view.setUint16(34, 16, true); // BitsPerSample
      writeString(36, 'data'); // Subchunk2ID
      view.setUint32(40, this.audioData.length * 2, true); // Subchunk2Size
  
      // Write audio data samples (convert float [-1,1] to 16-bit PCM)
      const offset = 44;
      for (let i = 0; i < this.audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, this.audioData[i]));
        view.setInt16(offset + i * 2, sample * 0x7fff, true);
      }
  
      return buffer;
    }
  }
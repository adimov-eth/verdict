export type CounselingMode = 'counselor' | 'evaluator' | 'dinner' | 'entertainment';

export interface AudioRecording {
  uri: string;
  duration: number;
}

export interface AnalysisResponse {
  verdict: string;
  keyPoints: string[];
  advice?: string[];
}

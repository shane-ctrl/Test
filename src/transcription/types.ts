export type TranscriptEvent = {
  text: string;
  isFinal: boolean;
  /** Milliseconds since session start */
  timestamp: number;
};

export type TranscriptionProviderStatus =
  | "idle"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

export type TranscriptionProviderCallbacks = {
  onTranscript: (event: TranscriptEvent) => void;
  onStatusChange: (status: TranscriptionProviderStatus) => void;
  onError: (message: string) => void;
};

/**
 * Abstract speech-to-text interface.
 * MVP uses Web Speech API; Deepgram streaming can implement the same contract later.
 */
export interface TranscriptionProvider {
  readonly name: string;
  isSupported(): boolean;
  start(callbacks: TranscriptionProviderCallbacks): Promise<void>;
  stop(): void;
  getStatus(): TranscriptionProviderStatus;
}

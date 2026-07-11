import type {
  TranscriptionProvider,
  TranscriptionProviderCallbacks,
  TranscriptionProviderStatus,
} from "@/transcription/types";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
  message?: string;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser-native speech-to-text via the Web Speech API (Chrome/Edge).
 * Auto-restarts on `onend` while the session is active — the API often dies randomly.
 */
export class WebSpeechTranscriptionProvider implements TranscriptionProvider {
  readonly name = "web-speech";

  private recognition: SpeechRecognitionLike | null = null;
  private callbacks: TranscriptionProviderCallbacks | null = null;
  private status: TranscriptionProviderStatus = "idle";
  private sessionActive = false;
  private sessionStartMs = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  getStatus(): TranscriptionProviderStatus {
    return this.status;
  }

  async start(callbacks: TranscriptionProviderCallbacks): Promise<void> {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setStatus("unsupported");
      callbacks.onStatusChange("unsupported");
      callbacks.onError(
        "Web Speech API is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    this.callbacks = callbacks;
    this.sessionActive = true;
    this.sessionStartMs = Date.now();

    // Probe mic permission early so we can toast on denial
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      this.sessionActive = false;
      this.setStatus("denied");
      callbacks.onStatusChange("denied");
      callbacks.onError(
        "Microphone permission denied. Allow mic access to fact-check a live debate."
      );
      return;
    }

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.setStatus("listening");
    };

    this.recognition.onresult = (event) => {
      const now = Date.now() - this.sessionStartMs;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        this.callbacks?.onTranscript({
          text,
          isFinal: result.isFinal,
          timestamp: now,
        });
      }
    };

    this.recognition.onerror = (event) => {
      // "aborted" / "no-speech" are common and recoverable
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      if (event.error === "not-allowed") {
        this.sessionActive = false;
        this.setStatus("denied");
        this.callbacks?.onError("Microphone permission denied.");
        return;
      }
      this.setStatus("error");
      this.callbacks?.onError(event.message || `Speech recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      // Web Speech API dies randomly — auto-restart while session is active
      if (this.sessionActive) {
        this.scheduleRestart();
      } else {
        this.setStatus("idle");
      }
    };

    try {
      this.recognition.start();
      this.setStatus("listening");
    } catch (err) {
      this.setStatus("error");
      this.callbacks?.onError(
        err instanceof Error ? err.message : "Failed to start speech recognition"
      );
    }
  }

  stop(): void {
    this.sessionActive = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.setStatus("idle");
  }

  private scheduleRestart(): void {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (!this.sessionActive || !this.recognition) return;
      try {
        this.recognition.start();
      } catch {
        // Already started — ignore
      }
    }, 250);
  }

  private setStatus(status: TranscriptionProviderStatus): void {
    this.status = status;
    this.callbacks?.onStatusChange(status);
  }
}

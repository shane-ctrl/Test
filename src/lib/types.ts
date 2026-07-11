export type VerdictRating =
  | "true"
  | "mostly-true"
  | "misleading"
  | "false"
  | "unverifiable";

export type ClaimStatus = "queued" | "checking" | "done" | "error";

export type VerdictSource = {
  title: string;
  url: string;
  note?: string;
};

export type Verdict = {
  rating: VerdictRating;
  confidence: number;
  summary: string;
  sources: VerdictSource[];
};

export type Claim = {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  status: ClaimStatus;
  verdict?: Verdict;
  errorMessage?: string;
};

export type TranscriptSegment = {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
};

export type MicStatus = "idle" | "listening" | "denied" | "unsupported" | "error";

export type ExtractRequest = {
  transcript: string;
  existingClaims: string[];
};

export type ExtractResponse = {
  claims: string[];
};

export type VerifyRequest = {
  claim: string;
};

export type VerifyResponse = Verdict;

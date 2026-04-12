// Shape of the data the app stores for each exchange.
// Designed to support a future engagement-based reward system:
//   - every answer is timestamped and themed
//   - certainty scores quantify how absolute the user sounded
//   - contradictions / resistance patterns track friction against deepening
//   - sessionId groups a single contiguous questioning

export interface PsycheEntry {
  id: string;
  sessionId: string;
  index: number; // 0-based position in the session
  question: string;
  answer: string;
  timestamp: number; // epoch ms
  themes: string[];
  certaintyScore: number; // 0..1
  contradictions: string[];
  resistance: string[];
  // Reward-system scaffolding (not consumed yet, but present in the record):
  depthTier: number; // derived from index — simple ladder 0,1,2,3…
  wordCount: number;
  engagement: {
    // Seconds the user spent typing the answer, populated when available.
    dwellMs?: number;
    // Whether the user used 'Back' to revise this answer.
    revised: boolean;
  };
}

export interface PsycheSession {
  sessionId: string;
  startedAt: number;
  entries: PsycheEntry[];
}

export interface QuestionRequestBody {
  history: Array<{ question: string; answer: string }>;
}

export interface QuestionResponseBody {
  question: string;
}

export interface AnalyzeRequestBody {
  question: string;
  answer: string;
  priorThemes?: string[];
}

export interface AnalyzeResponseBody {
  themes: string[];
  certaintyScore: number;
  contradictions: string[];
  resistance: string[];
}

import { EngineDifficulty, EngineStatus } from "../ChessTypes";
export interface EngineSearchOptions {
  depth?: number;
  movetime?: number;
  skillLevel?: number;
}
export interface EngineMove {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
  rawUci: string;
}
export interface EngineAnalysis extends EngineMove {
  pv: string[];
  score?: number;
  mate?: number;
}
export interface ChessEngine {
  initialize(): Promise<void>;
  setPosition(fen: string): Promise<void>;
  getBestMove(fen: string, options?: EngineSearchOptions): Promise<EngineMove>;
  setDifficulty(difficulty: EngineDifficulty): Promise<void>;
  getStatus(): EngineStatus;
  stop(): void;
  dispose(): void;
}
export const DIFFICULTY_CONFIG: Record<
  EngineDifficulty,
  { skill: number; depth: number; movetime: number }
> = {
  beginner: { skill: 1, depth: 3, movetime: 250 },
  easy: { skill: 5, depth: 6, movetime: 500 },
  medium: { skill: 10, depth: 10, movetime: 800 },
  hard: { skill: 15, depth: 14, movetime: 1200 },
  expert: { skill: 20, depth: 18, movetime: 1800 },
};
export class StockfishEngine implements ChessEngine {
  private worker: Worker | null = null;
  private status: EngineStatus = "uninitialized";
  private difficulty: EngineDifficulty = "medium";
  private initPromise: Promise<void> | null = null;
  private handlers = new Set<(s: string) => void>();
  private cancelInit?: () => void;
  private cancelSearch?: () => void;
  private generation = 0;
  getStatus() {
    return this.status;
  }
  initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.status = "loading";
    const initialization = new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.handlers.delete(handler);
        this.cancelInit = undefined;
        if (error) {
          this.status = "error";
          reject(error);
        } else {
          this.status = "ready";
          void this.setDifficulty(this.difficulty);
          resolve();
        }
      };
      const handler = (s: string) => {
        if (s === "uciok") this.send("isready");
        if (s === "readyok") finish();
      };
      this.cancelInit = () =>
        finish(new Error("Engine initialization cancelled"));
      try {
        const base = import.meta.env?.BASE_URL ?? "/";
        this.worker = new Worker(`${base}stockfish.js`);
        this.worker.onmessage = (e) => {
          if (typeof e.data === "string")
            this.handlers.forEach((h) => h(e.data));
        };
        this.worker.onerror = () => {
          const cancelInit = this.cancelInit;
          this.cancelSearch?.();
          cancelInit?.();
          this.worker?.terminate();
          this.worker = null;
          this.handlers.clear();
          this.initPromise = null;
          this.status = "error";
        };
        this.handlers.add(handler);
        timer = setTimeout(
          () => finish(new Error("Engine startup timed out")),
          10000,
        );
        this.send("uci");
      } catch (e) {
        finish(e instanceof Error ? e : new Error("Engine unavailable"));
      }
    });
    this.initPromise = initialization;
    void initialization.catch(() => {
      if (this.initPromise === initialization) this.initPromise = null;
    });
    return initialization;
  }
  async setDifficulty(d: EngineDifficulty) {
    this.difficulty = d;
    if (this.status === "ready")
      this.send(
        `setoption name Skill Level value ${DIFFICULTY_CONFIG[d].skill}`,
      );
  }
  async setPosition(fen: string) {
    await this.initialize();
    this.send(`position fen ${fen}`);
  }
  async getBestMove(fen: string, options?: EngineSearchOptions) {
    return this.analyze(fen, options);
  }
  async analyze(
    fen: string,
    options: EngineSearchOptions = {},
  ): Promise<EngineAnalysis> {
    const generation = this.generation;
    await this.initialize();
    if (generation !== this.generation) throw Error("Search cancelled");
    if (this.cancelSearch) throw Error("Engine is busy");
    const config = DIFFICULTY_CONFIG[this.difficulty],
      movetime = options.movetime ?? config.movetime;
    return new Promise((resolve, reject) => {
      let pv: string[] = [],
        score: number | undefined,
        mate: number | undefined;
      const finish = () => {
        clearTimeout(timer);
        this.handlers.delete(handler);
        this.cancelSearch = undefined;
        this.status = "ready";
      };
      const handler = (line: string) => {
        if (line.startsWith("info ")) {
          const p = line.match(/\spv (.+)/),
            s = line.match(/score (cp|mate) (-?\d+)/);
          if (p) pv = p[1].trim().split(/\s+/);
          if (s) {
            score = s[1] === "cp" ? Number(s[2]) : undefined;
            mate = s[1] === "mate" ? Number(s[2]) : undefined;
          }
        }
        if (line.startsWith("bestmove ")) {
          const raw = line.split(/\s+/)[1];
          finish();
          if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(raw)) {
            reject(Error("No legal engine move"));
            return;
          }
          resolve({
            from: raw.slice(0, 2),
            to: raw.slice(2, 4),
            promotion: raw[4] as EngineMove["promotion"],
            rawUci: raw,
            pv: pv.length ? pv : [raw],
            score,
            mate,
          });
        }
      };
      const timer = setTimeout(() => {
        finish();
        this.dispose();
        reject(Error("Engine search timed out"));
      }, movetime + 6000);
      this.cancelSearch = () => {
        finish();
        reject(Error("Search cancelled"));
      };
      this.status = "thinking";
      this.handlers.add(handler);
      this.send(`position fen ${fen}`);
      this.send(
        `go depth ${options.depth ?? config.depth} movetime ${movetime}`,
      );
    });
  }
  stop() {
    this.generation++;
    if (this.status === "thinking" || this.status === "loading") this.dispose();
  }
  dispose() {
    this.generation++;
    this.cancelSearch?.();
    this.cancelInit?.();
    this.worker?.terminate();
    this.worker = null;
    this.handlers.clear();
    this.initPromise = null;
    this.status = "uninitialized";
  }
  private send(s: string) {
    this.worker?.postMessage(s);
  }
}

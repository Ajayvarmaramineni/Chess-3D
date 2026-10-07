import { useState, useRef, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { ChessController } from "../../../chess/ChessController";
import {
  MoveCommand,
  MoveResult,
  ChessGameState,
} from "../../../chess/ChessTypes";
import {
  CrystalChessBoardProps,
  BoardPiece,
  MoveAnimation,
  CaptureAnimation,
} from "../game/types";
import { squareToWorld } from "../game/coordinates";

export function piecesFromFen(fen: string): BoardPiece[] {
  return new Chess(fen)
    .board()
    .flat()
    .filter(Boolean)
    .map((p) => ({
      id: `${p!.color}-${p!.type}-${p!.square}`,
      square: p!.square,
      type: p!.type,
      color: p!.color === "w" ? "white" : "purple",
    }));
}
export interface CrystalEffect {
  id: number;
  square: Square;
  kind: "capture" | "promotion";
  color: "white" | "purple";
  start: number;
}
export const SAVE_KEY = "crystal-chess-game-v1";
export function useChessGame(props: CrystalChessBoardProps) {
  const [controller] = useState(
    () => new ChessController({ initialFen: props.initialFen }),
  );
  const [state, setState] = useState(() => controller.getState());
  const [pieces, setPieces] = useState(() => piecesFromFen(state.fen));
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [activeAnimations, setAnimations] = useState<
    Record<string, MoveAnimation>
  >({});
  const [captures, setCaptures] = useState<Record<string, CaptureAnimation>>(
    {},
  );
  const [effects, setEffects] = useState<CrystalEffect[]>([]);
  const [promotion, setPromotion] = useState<MoveCommand | null>(null);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  const delegate = useRef<((m: MoveCommand) => Promise<MoveResult>) | null>(
    null,
  );
  const blocked = useRef(false);
  const onEvent = useRef<
    (state: ChessGameState, kind: string, square?: string) => void
  >(() => {});
  useEffect(() => {
    const sync = (fen: string) => {
      setPieces(piecesFromFen(fen));
      setAnimations({});
      setCaptures({});
      setSelectedSquare(null);
      setPromotion(null);
    };
    const unsubscribe = controller.subscribe((e) => {
      if (e.type === "game.started") sync(e.fen);
      if (e.type === "state.changed") {
        setState(e.state);
        if (!e.state.isAnimating) {
          setPieces(piecesFromFen(e.state.fen));
          setAnimations({});
          setCaptures({});
        }
        if (e.state.mode !== "online" && e.state.mode !== "puzzle")
          try {
            localStorage.setItem(
              SAVE_KEY,
              JSON.stringify(controller.serialize()),
            );
          } catch {
            setStorageError(true);
          }
      }
      if (e.type === "move.started") {
        setSelectedSquare(null);
        setPromotion(null);
        const anim: Record<string, MoveAnimation> = {};
        const add = (from: Square, to: Square) => {
          const piece = piecesRef.current.find((p) => p.square === from);
          if (piece)
            anim[piece.id] = {
              pieceId: piece.id,
              from: squareToWorld(from),
              to: squareToWorld(to),
              startTime: performance.now(),
              duration: controller.moveAnimationDuration,
            };
        };
        add(e.from, e.to);
        const king = piecesRef.current.find(
          (p) => p.square === e.from && p.type === "k",
        );
        if (king && Math.abs(e.from.charCodeAt(0) - e.to.charCodeAt(0)) === 2) {
          const rank = e.from[1];
          add(
            `${e.to[0] === "g" ? "h" : "a"}${rank}` as Square,
            `${e.to[0] === "g" ? "f" : "d"}${rank}` as Square,
          );
        }
        setAnimations(anim);
      }
      if (e.type === "piece.captured") {
        const piece = piecesRef.current.find((p) => p.square === e.square);
        if (piece) {
          setCaptures({
            [piece.id]: {
              pieceId: piece.id,
              startTime: performance.now(),
              duration: 220,
            },
          });
          setEffects((prev) => [
            ...prev.slice(-3),
            {
              id: performance.now(),
              square: e.square,
              kind: "capture",
              color: piece.color,
              start: performance.now(),
            },
          ]);
        }
      }
      if (e.type === "move.completed" && e.result.move) {
        const m = e.result.move;
        if (m.promotion)
          setEffects((prev) => [
            ...prev.slice(-3),
            {
              id: performance.now(),
              square: m.to,
              kind: "promotion",
              color: m.color === "w" ? "white" : "purple",
              start: performance.now(),
            },
          ]);
        onEvent.current(
          controller.getState(),
          m.promotion ? "promotion" : m.captured ? "capture" : "move",
          m.to,
        );
        props.onMove?.({
          from: m.from,
          to: m.to,
          san: m.san,
          fen: e.result.fen,
        });
        props.onPositionChange?.(e.result.fen);
      }
      if (e.type === "check" || e.type === "checkmate")
        onEvent.current(controller.getState(), e.type);
    });
    if (!location.hash.startsWith("#room=")) {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved && !props.initialFen) controller.restore(JSON.parse(saved));
      } catch {
        setMessage(
          "The previous save could not be restored. A fresh board is ready.",
        );
      }
      void controller.start();
    }
    const interval = setInterval(() => {
      if (controller.getState().mode !== "online") controller.tick();
    }, 200);
    return () => {
      clearInterval(interval);
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);
  const submit = useCallback(
    async (command: MoveCommand): Promise<MoveResult> => {
      if (blocked.current)
        return {
          success: false,
          error: "Return to the live game to move.",
          fen: controller.getFen(),
        };
      const result = await (delegate.current
        ? delegate.current(command)
        : controller.move(command));
      if (result.errorCode === "PROMOTION_REQUIRED") setPromotion(command);
      setMessage(result.success ? "" : (result.error ?? "Move failed"));
      return result;
    },
    [controller],
  );
  const handleSquareClick = useCallback(
    async (square: Square) => {
      const s = controller.getState();
      if (
        blocked.current ||
        s.gameOver ||
        s.isAnimating ||
        s.isComputerThinking ||
        props.interactive === false
      )
        return;
      if (
        (s.mode === "computer" || s.mode === "online") &&
        s.turn !== s.humanColor
      )
        return;
      const piece = piecesRef.current.find((p) => p.square === square),
        turnColor = s.turn === "white" ? "white" : "purple";
      if (piece?.color === turnColor) {
        setSelectedSquare(selectedSquare === square ? null : square);
        return;
      }
      if (selectedSquare) {
        if (
          controller.getLegalMoves(selectedSquare).some((m) => m.to === square)
        )
          await submit({ from: selectedSquare, to: square });
        setSelectedSquare(null);
      }
    },
    [controller, selectedSquare, submit, props.interactive],
  );
  return {
    controller,
    state,
    pieces,
    selectedSquare,
    legalMoves: selectedSquare ? controller.getLegalMoves(selectedSquare) : [],
    checkSquare: state.checkSquare ?? null,
    activeAnimations,
    captures,
    effects,
    handleSquareClick,
    handlePieceClick: handleSquareClick,
    submit,
    promotion,
    setPromotion,
    message,
    setMessage,
    storageError,
    onEvent,
    delegate,
    blocked,
  };
}

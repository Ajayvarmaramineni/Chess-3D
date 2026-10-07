import { useCallback, useEffect, useRef, useState } from 'react';
import { MoveCommand, MoveResult } from '../../../chess/ChessTypes';
import { resolveVoiceCommand } from '../../../chess/commands/VoiceChessCommand';

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorLike { error: string }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceChessOptions {
  fen: string;
  blocked: boolean;
  onMove: (command: MoveCommand) => Promise<MoveResult>;
  onUndo: () => Promise<string | void>;
  onResign: () => string | void;
  onNewGame: () => Promise<void>;
}

export function useVoiceChess(options: VoiceChessOptions) {
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const restartTimer = useRef<number | undefined>(undefined);
  const enabledRef = useRef(false);
  const processing = useRef(false);
  const queuedTranscript = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    setListening(false);
    setFeedback('Voice mode off.');
    window.clearTimeout(restartTimer.current);
    recognition.current?.stop();
  }, []);

  const handleTranscript = useCallback(async (spoken: string) => {
    if (processing.current) {
      queuedTranscript.current = spoken;
      return;
    }
    processing.current = true;
    try {
      let next: string | null = spoken;
      while (next) {
        queuedTranscript.current = null;
        setTranscript(next);
        const command = resolveVoiceCommand(next, optionsRef.current.fen);
        if (command.type === 'stopVoice') {
          stop();
        } else if (command.type === 'move') {
          if (optionsRef.current.blocked) {
            setFeedback('Please wait. The board is not ready for a move.');
          } else {
            const result = await optionsRef.current.onMove(command.command);
            setFeedback(result.success ? 'Move played.' : (result.error ?? 'That move is not legal.'));
          }
        } else if (command.type === 'undo') {
          const response = await optionsRef.current.onUndo();
          setFeedback(response ?? 'Move taken back.');
        } else if (command.type === 'resign') {
          const response = optionsRef.current.onResign();
          setFeedback(response ?? 'Game resigned.');
        } else if (command.type === 'newGame') {
          await optionsRef.current.onNewGame();
          setFeedback('New game started.');
        } else {
          setFeedback('I could not understand that move. Try “e two to e four.”');
        }
        next = queuedTranscript.current;
      }
    } finally {
      processing.current = false;
    }
  }, [stop]);

  const begin = useCallback(() => {
    if (!supported || enabledRef.current) return;
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) return;
    const instance = new Constructor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.onstart = () => setListening(true);
    instance.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim() ?? '';
        if (result.isFinal && text) void handleTranscript(text);
        else interim += text;
      }
      if (interim) setTranscript(interim);
    };
    instance.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        enabledRef.current = false;
        setEnabled(false);
        setFeedback('Microphone permission was denied. Enable it in your browser settings.');
      } else if (event.error === 'audio-capture') {
        enabledRef.current = false;
        setEnabled(false);
        setFeedback('No microphone is available.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setFeedback('Voice recognition paused. Retrying…');
      }
    };
    instance.onend = () => {
      setListening(false);
      if (enabledRef.current) {
        restartTimer.current = window.setTimeout(() => {
          try { instance.start(); } catch { /* already restarting */ }
        }, 250);
      }
    };
    recognition.current = instance;
    enabledRef.current = true;
    setEnabled(true);
    setFeedback('');
    try {
      instance.start();
    } catch {
      enabledRef.current = false;
      setEnabled(false);
      setFeedback('Voice recognition could not start.');
    }
  }, [handleTranscript, supported]);

  useEffect(() => () => {
    enabledRef.current = false;
    window.clearTimeout(restartTimer.current);
    recognition.current?.abort();
  }, []);

  return { supported, enabled, listening, transcript, feedback, begin, stop };
}

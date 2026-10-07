import { useState, useRef, MutableRefObject, useEffect, useCallback } from 'react';

export function useVideoExport(
  stageRef: MutableRefObject<HTMLDivElement | null>,
  gameSetMessage: (msg: string) => void,
  historyLength: number,
  setReplay: (idx: number) => void,
  setOrbit: (orbit: boolean) => void,
  setPlaying: (playing: boolean) => void,
  cinematic: boolean
) {
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(recordTimer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
      }
      activeStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function exportHighlight() {
    const canvas = stageRef.current?.querySelector("canvas");
    if (
      !canvas ||
      !("captureStream" in canvas) ||
      typeof MediaRecorder === "undefined"
    ) {
      gameSetMessage(
        "Video export is not supported by this browser. Try Chrome or Edge.",
      );
      return;
    }
    try {
      const type = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!type) throw Error("No supported video encoder");
      const stream = (canvas as any).captureStream(30),
        chunks: Blob[] = [];
      activeStream.current = stream;
      const media = new MediaRecorder(stream, {
        mimeType: type,
        videoBitsPerSecond: 5000000,
      });
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        activeStream.current = null;
        recorder.current = null;
        if (!isMounted.current) return;
        setRecording(false);
        const url = URL.createObjectURL(new Blob(chunks, { type }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `crystal-chess-highlight.${type.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      };
      media.onerror = () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        activeStream.current = null;
        recorder.current = null;
        if (!isMounted.current) return;
        gameSetMessage("The browser could not encode the highlight.");
        setRecording(false);
      };
      setReplay(Math.max(0, historyLength - 6));
      setOrbit(cinematic);
      setPlaying(false);
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        try {
          media.start();
          setPlaying(true);
        } catch {
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          activeStream.current = null;
          recorder.current = null;
          if (isMounted.current) {
            setRecording(false);
            gameSetMessage("Video export could not start in this browser.");
          }
        }
      }, 600);
    } catch {
      gameSetMessage("Video export could not start in this browser.");
      setRecording(false);
    }
  }

  const stopRecordingGracefully = useCallback(() => {
    if (recorder.current?.state === "recording") {
      recordTimer.current = setTimeout(() => recorder.current?.stop(), 900);
    }
  }, []);

  return { recording, exportHighlight, recorder, recordTimer, stopRecordingGracefully };
}

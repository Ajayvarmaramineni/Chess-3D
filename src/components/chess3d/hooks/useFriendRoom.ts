import { useState, useRef, useEffect } from "react";
import { ChessController } from "../../../chess/ChessController";
import {
  MoveCommand,
  MoveResult,
  StandardColor,
  TimeControl,
} from "../../../chess/ChessTypes";
export function useFriendRoom(controller: ChessController) {
  const clientId = useRef<string>("");
  if (!clientId.current) {
    try {
      clientId.current = sessionStorage.getItem("crystal-room-client") ?? crypto.randomUUID();
      sessionStorage.setItem("crystal-room-client", clientId.current);
    } catch {
      clientId.current = crypto.randomUUID();
    }
  }
  const [room, setRoom] = useState(""),
    [color, setColor] = useState<StandardColor>("white"),
    [status, setStatus] = useState(""),
    [ready, setReady] = useState(false),
    [connected, setConnected] = useState(false),
    [peers, setPeers] = useState(0),
    [drawOffer, setDrawOffer] = useState<StandardColor | undefined>(),
    [rematchVotes, setRematchVotes] = useState<StandardColor[]>([]);
  const socket = useRef<WebSocket | null>(null),
    retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    active = useRef(false),
    request = useRef<AbortController | null>(null),
    generation = useRef(0),
    syncChain = useRef(Promise.resolve());
  const pending = useRef(
    new Map<
      string,
      { resolve: (r: MoveResult) => void; timer: ReturnType<typeof setTimeout> }
    >(),
  );
  function clearPending() {
    pending.current.forEach((p) => {
      clearTimeout(p.timer);
      p.resolve({
        success: false,
        error: "Connection lost. Reconnecting…",
        fen: controller.getFen(),
      });
    });
    pending.current.clear();
  }
  function connect(roomId: string, seat: StandardColor, token: number) {
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/room-socket?room=${roomId}`,
    );
    socket.current = ws;
    ws.onopen = () => {
      if (token !== generation.current) return ws.close();
      setConnected(true);
      setStatus("Connected");
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "state") {
          syncChain.current = syncChain.current
            .then(() => controller.syncRemote(data.saved, seat))
            .catch(() => setStatus("Could not sync this room. Reconnect to retry."));
          setReady(data.ready);
          setPeers(data.connected);
          setDrawOffer(data.drawOffer);
          setRematchVotes(Array.isArray(data.rematchVotes) ? data.rematchVotes : []);
          setStatus(
            data.ready ? "Match in progress" : "Waiting for your friend",
          );
        }
        if (data.type === "clock") {
          controller.syncRemoteClocks(data.clocks);
          setReady(data.ready === true);
          setPeers(Number(data.connected) || 0);
          setStatus(data.ready ? "Match in progress" : "Waiting for your friend");
        }
        if (data.type === "result") {
          const p = pending.current.get(data.id);
          if (p) {
            clearTimeout(p.timer);
            p.resolve(data.result);
            pending.current.delete(data.id);
          }
        }
      } catch {
        setStatus("Could not sync this room. Reconnect to retry.");
      }
    };
    ws.onclose = (e) => {
      setConnected(false);
      clearPending();
      if (active.current && token === generation.current && e.code !== 4001) {
        setStatus("Connection lost. Reconnecting…");
        retry.current = setTimeout(() => connect(roomId, seat, token), 2000);
      } else if (e.code === 4001) {
        active.current = false;
        setStatus("This seat is open in another tab.");
      }
    };
    ws.onerror = () => setStatus("Cannot reach the room server.");
  }
  async function enter(
    roomId?: string,
    seat: StandardColor = "white",
    timeControl: TimeControl = "untimed",
  ) {
    leave(false);
    const token = generation.current;
    const abort = new AbortController();
    request.current = abort;
    setStatus("Connecting…");
    try {
      const response = await fetch(
        roomId ? `/api/rooms/${roomId}/join` : "/api/rooms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: seat, timeControl, clientId: clientId.current }),
          signal: abort.signal,
        },
      );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw Error(
          "The room server is unavailable. Start the app with npm run dev.",
        );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (token !== generation.current) return;
      active.current = true;
      setRoom(data.room);
      setColor(data.color);
      location.hash = `room=${data.room}`;
      connect(data.room, data.color, token);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (token !== generation.current) return;
      setStatus(e instanceof Error ? e.message : "Could not create room");
      if (roomId) {
        history.replaceState(null, "", location.pathname + location.search);
        await controller.start();
      }
    } finally {
      if (request.current === abort) request.current = null;
    }
  }
  function leave(clearHash = true) {
    generation.current++;
    request.current?.abort();
    request.current = null;
    active.current = false;
    clearTimeout(retry.current);
    if (socket.current) {
      socket.current.onclose = null;
      socket.current.close();
      socket.current = null;
    }
    clearPending();
    setRoom("");
    setReady(false);
    setConnected(false);
    setDrawOffer(undefined);
    setRematchVotes([]);
    if (clearHash && location.hash.startsWith("#room="))
      history.replaceState(null, "", location.pathname + location.search);
  }
  function move(command: MoveCommand): Promise<MoveResult> {
    if (!ready || socket.current?.readyState !== WebSocket.OPEN)
      return Promise.resolve({
        success: false,
        error: "Waiting for your friend and a live connection.",
        fen: controller.getFen(),
      });
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        pending.current.delete(id);
        resolve({
          success: false,
          error: "The server did not confirm the move. Check your connection.",
          fen: controller.getFen(),
        });
      }, 8000);
      pending.current.set(id, { resolve, timer });
      socket.current!.send(JSON.stringify({ type: "move", id, command }));
    });
  }
  function resign() {
    socket.current?.send(JSON.stringify({ type: "resign" }));
  }
  function offerDraw() { socket.current?.send(JSON.stringify({type:'draw_offer'})); }
  function answerDraw(accept:boolean) { socket.current?.send(JSON.stringify({type:'draw_response',accept})); }
  function requestRematch() { socket.current?.send(JSON.stringify({type:'rematch'})); }
  useEffect(() => {
    const match = location.hash.match(/^#room=([a-f0-9]{48})$/);
    const timer = match ? window.setTimeout(() => void enter(match[1]), 0) : undefined;
    return () => {
      window.clearTimeout(timer);
      leave(false);
    };
  }, []);
  return {
    room,
    color,
    status,
    ready,
    connected,
    peers,
    enter,
    leave,
    move,
    resign,
    drawOffer,
    rematchVotes,
    offerDraw,
    answerDraw,
    requestRematch,
    invite: room ? `${location.origin}${location.pathname}#room=${room}` : "",
  };
}

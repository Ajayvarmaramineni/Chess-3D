import React from 'react';
import { Check, Copy, Users } from 'lucide-react';
import { Dialog } from './Dialog';
import { StandardColor, GameSettings } from '../../../chess/ChessTypes';
import { useFriendRoom } from '../hooks/useFriendRoom';
import { Puzzle } from '../../../chess/puzzles';

export function FriendsDialog({
  dialog,
  setDialog,
  room,
  setup,
  setSetup,
  setPuzzle,
  puzzleRef,
  setReplay,
  setPlaying,
  setResultDismissed,
  copyInvite,
  copied,
}: {
  dialog: 'setup' | 'puzzles' | 'resign' | 'friends' | null;
  setDialog: (v: 'setup' | 'puzzles' | 'resign' | 'friends' | null) => void;
  room: ReturnType<typeof useFriendRoom>;
  setup: GameSettings & { side: StandardColor | 'random' };
  setSetup: React.Dispatch<React.SetStateAction<GameSettings & { side: StandardColor | 'random' }>>;
  setPuzzle: (p: Puzzle | null) => void;
  puzzleRef: React.MutableRefObject<Puzzle | null>;
  setReplay: (v: number | null) => void;
  setPlaying: (v: boolean) => void;
  setResultDismissed: (v: boolean) => void;
  copyInvite: () => Promise<void>;
  copied: boolean;
}) {
  if (dialog !== 'friends') return null;

  return (
    <Dialog title="A table for two" onClose={() => setDialog(null)}>
      <p>Send an invitation. Your friend takes the other seat.</p>
      {room.room ? (
        <>
          <label className="invite-label">
            Invitation link
            <input
              aria-label="Invitation link"
              readOnly
              value={room.invite}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            className="primary full"
            onClick={() => void copyInvite()}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied" : "Copy invitation"}
          </button>
          <div className="friend-status">
            {room.status} · You play {room.color}
          </div>
          <button
            className="full"
            onClick={() => {
              room.leave();
              setDialog("setup");
            }}
          >
            Leave room
          </button>
        </>
      ) : (
        <>
          <div className="setup-fields">
            <label>
              Your side
              <select
                aria-label="Friend match side"
                value={setup.side === "random" ? "white" : setup.side}
                onChange={(e) =>
                  setSetup((s) => ({
                    ...s,
                    side: e.target.value as StandardColor,
                  }))
                }
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </label>
            <label>
              Clock
              <select
                aria-label="Friend match clock"
                value={setup.timeControl}
                onChange={(e) =>
                  setSetup((s) => ({
                    ...s,
                    timeControl: e.target
                      .value as GameSettings["timeControl"],
                  }))
                }
              >
                <option value="untimed">Untimed</option>
                <option value="3+2">3 + 2</option>
                <option value="5+0">5 minutes</option>
                <option value="10+0">10 minutes</option>
              </select>
            </label>
          </div>
          <button
            className="primary full"
            onClick={() => {
              setPuzzle(null);
              puzzleRef.current = null;
              setReplay(null);
              setPlaying(false);
              setResultDismissed(false);
              void room.enter(
                undefined,
                setup.side === "random" ? "white" : setup.side,
                setup.timeControl,
              );
            }}
          >
            <Users size={16} />
            Create invitation
          </button>
          <div className="friend-status" role="status">
            {room.status}
          </div>
        </>
      )}
      <small className="dialog-note">
        Rooms last up to 24 hours while the server is running. Keep the
        invitation private.
      </small>
    </Dialog>
  );
}

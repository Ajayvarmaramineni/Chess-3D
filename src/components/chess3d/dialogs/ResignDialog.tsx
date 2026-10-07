import { Dialog } from './Dialog';
import { ChessGameState } from '../../../chess/ChessTypes';
import { ChessController } from '../../../chess/ChessController';

import { useFriendRoom } from '../hooks/useFriendRoom';

export function ResignDialog({
  dialog,
  setDialog,
  state,
  room,
  controller,
  setResultDismissed,
}: {
  dialog: 'setup' | 'puzzles' | 'resign' | 'friends' | null;
  setDialog: (v: 'setup' | 'puzzles' | 'resign' | 'friends' | null) => void;
  state: ChessGameState;
  room: ReturnType<typeof useFriendRoom>;
  controller: ChessController;
  setResultDismissed: (v: boolean) => void;
}) {
  if (dialog !== 'resign') return null;

  return (
    <Dialog title="Concede this game?" onClose={() => setDialog(null)}>
      <p>
        {state.humanColor === "white" ? "Black" : "White"} will win by
        resignation. You can still replay the game afterward.
      </p>
      <div className="dialog-actions">
        <button onClick={() => setDialog(null)}>Keep playing</button>
        <button
          className="primary"
          onClick={() => {
            setResultDismissed(false);
            if (state.mode === "online") room.resign();
            else controller.resign();
            setDialog(null);
          }}
        >
          Confirm resignation
        </button>
      </div>
    </Dialog>
  );
}

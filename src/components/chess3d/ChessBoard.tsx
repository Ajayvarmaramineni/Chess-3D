import React, { useMemo } from "react";
import { Square } from "chess.js";
import { Text } from "@react-three/drei";
import { FILES, RANKS, SQUARE_SIZE } from "./game/coordinates";
import { ChessSquare } from "./ChessSquare";
import { materials } from "./materials";

interface ChessBoardProps {
  selectedSquare: Square | null;
  legalMoves: { to: Square; isCapture: boolean }[];
  checkSquare: Square | null;
  onSquareClick: (square: Square) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  selectedSquare,
  legalMoves,
  checkSquare,
  onSquareClick,
}) => {
  // Generate all 64 squares
  const allSquares = useMemo(() => {
    const list: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        list.push(`${FILES[f]}${RANKS[r]}` as Square);
      }
    }
    return list;
  }, []);

  const legalTargetMap = useMemo(() => {
    const map = new Map<Square, boolean>();
    legalMoves.forEach((m) => map.set(m.to, m.isCapture));
    return map;
  }, [legalMoves]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. The 64 Playfield Squares */}
      {allSquares.map((sq) => {
        const isLegal = legalTargetMap.has(sq);
        const isCapture = legalTargetMap.get(sq) || false;
        return (
          <ChessSquare
            key={sq}
            square={sq}
            isSelected={selectedSquare === sq}
            isLegalTarget={isLegal}
            isCaptureTarget={isCapture}
            isCheckSquare={checkSquare === sq}
            onClick={onSquareClick}
          />
        );
      })}

      {/* 2. Inset Base Plate underneath playing squares */}
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[8.06, 0.04, 8.06]} />
        <primitive
          object={materials.getBevelTrimMaterial()}
          attach="material"
        />
      </mesh>

      {/* 3. Clean Crystal Outer Frame around the 8x8 playfield */}
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.85, 0.18, 8.85]} />
        <primitive
          object={materials.getBoardFrameMaterial()}
          attach="material"
        />
      </mesh>

      {/* 4. Elegant Beveled Crystal Sub-Base under the playfield */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[9.0, 0.06, 9.0]} />
        <primitive
          object={materials.getBevelTrimMaterial()}
          attach="material"
        />
      </mesh>

      {/* 5. Notation Labels (Files a-h and Ranks 1-8) along the frame border ONLY */}
      {FILES.map((file, idx) => {
        const x = (idx - 3.5) * SQUARE_SIZE;
        return (
          <React.Fragment key={`file-coord-${file}`}>
            {/* White side (bottom / +Z) */}
            <Text
              position={[x, 0.145, 4.24]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.24}
              fontWeight="bold"
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              characters="abcdefgh12345678"
            >
              {file.toUpperCase()}
            </Text>
            {/* Purple side (top / -Z) */}
            <Text
              position={[x, 0.145, -4.24]}
              rotation={[-Math.PI / 2, 0, Math.PI]}
              fontSize={0.24}
              fontWeight="bold"
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              characters="abcdefgh12345678"
            >
              {file.toUpperCase()}
            </Text>
          </React.Fragment>
        );
      })}

      {RANKS.map((rank, idx) => {
        const z = (3.5 - idx) * SQUARE_SIZE;
        return (
          <React.Fragment key={`rank-coord-${rank}`}>
            {/* Left side (File a / -X) */}
            <Text
              position={[-4.24, 0.145, z]}
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
              fontSize={0.24}
              fontWeight="bold"
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              characters="abcdefgh12345678"
            >
              {rank}
            </Text>
            {/* Right side (File h / +X) */}
            <Text
              position={[4.24, 0.145, z]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              fontSize={0.24}
              fontWeight="bold"
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              characters="abcdefgh12345678"
            >
              {rank}
            </Text>
          </React.Fragment>
        );
      })}
    </group>
  );
};

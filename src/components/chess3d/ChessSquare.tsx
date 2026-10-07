import React from "react";
import { Square } from "chess.js";
import { isDarkSquare, squareToWorld, SQUARE_SIZE } from "./game/coordinates";
import { materials } from "./materials";

interface ChessSquareProps {
  square: Square;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCaptureTarget: boolean;
  isCheckSquare: boolean;
  onClick: (square: Square) => void;
}

export const ChessSquare: React.FC<ChessSquareProps> = ({
  square,
  isSelected,
  isLegalTarget,
  isCaptureTarget,
  isCheckSquare,
  onClick,
}) => {
  const isDark = isDarkSquare(square);
  const [x, y, z] = squareToWorld(square);

  const tileMaterial = isDark
    ? materials.getDarkSquareMaterial()
    : materials.getLightSquareMaterial();

  return (
    <group position={[x, y - 0.05, z]}>
      {/* Physical 3D Square Tile */}
      <mesh
        receiveShadow
        castShadow
        material={tileMaterial}
        onClick={(e) => {
          e.stopPropagation();
          onClick(square);
        }}
      >
        <boxGeometry args={[SQUARE_SIZE * 0.992, 0.1, SQUARE_SIZE * 0.992]} />
      </mesh>

      {/* Check indicator: Soft restrained red/violet tint on King's square */}
      {isCheckSquare && (
        <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SQUARE_SIZE * 0.96, SQUARE_SIZE * 0.96]} />
          <primitive
            object={materials.getCheckMarkerMaterial()}
            attach="material"
          />
        </mesh>
      )}

      {/* Selected Piece Glow underneath square */}
      {isSelected && (
        <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SQUARE_SIZE * 0.94, SQUARE_SIZE * 0.94]} />
          <primitive
            object={materials.getSelectionMarkerMaterial()}
            attach="material"
          />
        </mesh>
      )}

      {/* Legal Move Marker: subtle translucent circular disc on empty square */}
      {isLegalTarget && !isCaptureTarget && (
        <mesh position={[0, 0.054, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 32]} />
          <primitive
            object={materials.getLegalMoveMarkerMaterial()}
            attach="material"
          />
        </mesh>
      )}

      {/* Legal Capture Marker: subtle ring around capturable enemy piece */}
      {isLegalTarget && isCaptureTarget && (
        <mesh position={[0, 0.054, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.44, 36]} />
          <primitive
            object={materials.getCaptureMarkerMaterial()}
            attach="material"
          />
        </mesh>
      )}
    </group>
  );
};

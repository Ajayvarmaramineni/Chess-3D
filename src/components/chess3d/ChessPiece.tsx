import React, { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { BoardPiece, MoveAnimation, CaptureAnimation } from "./game/types";
import { squareToWorld } from "./game/coordinates";
import { getPieceGeometry } from "./geometry";
import { materials } from "./materials";

interface ChessPieceProps {
  piece: BoardPiece;
  animation?: MoveAnimation;
  capture?: CaptureAnimation;
  onClick: (square: any) => void;
  fallen?: boolean;
}

// Smooth cubic bezier easing for physical chess piece lift and glide
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  animation,
  capture,
  onClick,
  fallen = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [hovered, setHovered] = useState(false);

  React.useEffect(() => {
    return () => {
      if (hovered) {
        document.body.style.cursor = "auto";
      }
    };
  }, [hovered]);

  // Target world position based on chess square
  const basePosition = useMemo(
    () => squareToWorld(piece.square),
    [piece.square],
  );

  // Geometry and Material
  const geometry = useMemo(() => getPieceGeometry(piece.type), [piece.type]);
  const material = useMemo(
    () => materials.getPieceMaterial(piece.color),
    [piece.color],
  );

  // Default rotation (Knights face forward toward opponent)
  const defaultRotationY = useMemo(() => {
    if (piece.type === "n") {
      // White faces -Z (0 rad), Purple faces +Z (Math.PI rad)
      return piece.color === "white" ? 0 : Math.PI;
    }
    return 0;
  }, [piece.type, piece.color]);

  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const now = performance.now();
    mesh.visible = true;
    mesh.rotation.z = THREE.MathUtils.lerp(
      mesh.rotation.z,
      fallen ? -Math.PI / 2.4 : 0,
      0.08,
    );
    if (animation || capture || Math.abs(mesh.rotation.z - (fallen ? -Math.PI / 2.4 : 0)) > 0.002)
      invalidate();

    // 1. Capture Animation (fade & shrink down into square)
    if (capture) {
      const elapsed = now - capture.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / capture.duration));
      const scale = 1 - progress * 0.95;
      mesh.scale.set(scale, scale, scale);
      mesh.position.y = basePosition[1] - progress * 0.1;
      if (progress >= 1) {
        mesh.visible = false;
      }
      return;
    }

    if (piece.captured) {
      mesh.visible = false;
      return;
    }

    // 2. Movement Animation (arc upward 0.16 units, travel, and settle gently)
    if (animation && now - animation.startTime < animation.duration) {
      const elapsed = now - animation.startTime;
      const t = Math.min(1, Math.max(0, elapsed / animation.duration));
      const easedT = easeInOutCubic(t);

      // Interpolate X and Z linearly
      const currentX = THREE.MathUtils.lerp(
        animation.from[0],
        animation.to[0],
        easedT,
      );
      const currentZ = THREE.MathUtils.lerp(
        animation.from[2],
        animation.to[2],
        easedT,
      );

      // Arc Y upwards: parabolic lift of ~0.16 units
      const lift = Math.sin(t * Math.PI) * 0.16;
      const currentY = animation.to[1] + lift;

      mesh.position.set(currentX, currentY, currentZ);
    } else {
      // Static rest position
      mesh.position.set(basePosition[0], basePosition[1], basePosition[2]);
      mesh.scale.set(1, 1, 1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={basePosition}
      geometry={geometry}
      material={material}
      rotation={[0, defaultRotationY, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick(piece.square);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    />
  );
};

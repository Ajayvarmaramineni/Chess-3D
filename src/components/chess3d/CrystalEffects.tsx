import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CrystalEffect } from "./hooks/useChessGame";
import { squareToWorld } from "./game/coordinates";
function Burst({ effect, color }: { effect: CrystalEffect; color: string }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useFrame(() => {
    if (!group.current) return;
    const t = (performance.now() - effect.start) / 850;
    if (t < 1) invalidate();
    group.current.visible = t >= 0 && t < 1;
    group.current.children.forEach((child, i) => {
      const angle = i * 2.39996;
      const radius = (0.2 + (i % 4) * 0.1) * t * 2;
      child.position.set(
        Math.cos(angle) * radius,
        0.25 + Math.sin(Math.PI * t) * (0.4 + (i % 3) * 0.2),
        Math.sin(angle) * radius,
      );
      child.rotation.set(t * 4 + i, t * 3, t * 5);
      child.scale.setScalar(
        Math.max(0, 1 - t) * (effect.kind === "promotion" ? 1.4 : 1),
      );
    });
  });
  return (
    <group ref={group} position={squareToWorld(effect.square)}>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
export function CrystalEffects({
  effects,
  color,
}: {
  effects: CrystalEffect[];
  color: string;
}) {
  return (
    <>
      {effects.map((e) => (
        <Burst
          key={e.id}
          effect={e}
          color={e.color === "white" ? "#e7efff" : color}
        />
      ))}
    </>
  );
}

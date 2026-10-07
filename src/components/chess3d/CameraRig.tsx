import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ViewMode } from "./game/types";

interface CameraRigProps {
  viewMode: ViewMode;
  enableCameraControls: boolean;
  flipped?: boolean;
  cinematic?: boolean;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  viewMode,
  enableCameraControls,
  flipped = false,
  cinematic = false,
}) => {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Target camera position and look target for smooth transition
  const targetPos = useRef(new THREE.Vector3(7.5, 7.0, 9.0));
  const targetLook = useRef(new THREE.Vector3(0, 0.4, 0));
  const isTransitioning = useRef(false);

  useEffect(() => {
    if (viewMode === "2d") {
      // Direct top-down 2D orthographic-like perspective directly over the board center
      targetPos.current.set(0, 13.6, flipped ? -0.001 : 0.001); // optimal height for zero clipping and reduced rank 8 parallax distortion
      targetLook.current.set(0, 0.2, 0);
      isTransitioning.current = true;
    } else {
      // Immersive angled 3D luxury perspective
      targetPos.current.set(flipped ? -8 : 8, 8.5, flipped ? -11 : 11);
      targetLook.current.set(0, 0.4, 0);
      isTransitioning.current = true;
    }
  }, [viewMode, flipped]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;
    invalidate();

    // Smooth lerp camera towards desired angle
    const step = Math.min(1, delta * 6.0);
    camera.position.lerp(targetPos.current, step);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, step);
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(targetPos.current) < 0.04) {
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLook.current);
        controlsRef.current.update();
      }
      isTransitioning.current = false;
    }
  });

  useFrame(() => {
    if (cinematic && viewMode === "3d") invalidate();
  });

  return (
    <DreiOrbitControls
      ref={controlsRef}
      makeDefault
      autoRotate={cinematic && viewMode === "3d"}
      autoRotateSpeed={0.7}
      enablePan={false}
      enableRotate={enableCameraControls && viewMode === "3d"}
      enableZoom={enableCameraControls}
      enableDamping
      dampingFactor={0.06}
      minDistance={viewMode === "2d" ? 6 : 4.5}
      maxDistance={viewMode === "2d" ? 18 : 22}
      minPolarAngle={viewMode === "2d" ? 0.001 : Math.PI / 8}
      maxPolarAngle={viewMode === "2d" ? 0.005 : Math.PI / 2 - 0.04}
      target={[0, 0.4, 0]}
    />
  );
};

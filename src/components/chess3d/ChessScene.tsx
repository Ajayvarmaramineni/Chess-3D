import React, { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { ChessBoard } from "./ChessBoard";
import { ChessPiece } from "./ChessPiece";
import { CameraRig } from "./CameraRig";
import { CrystalChessBoardProps, ViewMode } from "./game/types";
import { useChessGame } from "./hooks/useChessGame";
import { CrystalEffects } from "./CrystalEffects";
import { materials } from "./materials";

import { Html, useProgress } from '@react-three/drei';

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-sm opacity-50 tracking-widest whitespace-nowrap">
        LOADING {Math.round(progress)}%
      </div>
    </Html>
  );
}

interface ChessSceneProps extends CrystalChessBoardProps {
  viewMode: ViewMode;
  gameStateProps: Pick<
    ReturnType<typeof useChessGame>,
    | "pieces"
    | "selectedSquare"
    | "legalMoves"
    | "checkSquare"
    | "activeAnimations"
    | "captures"
    | "handlePieceClick"
    | "handleSquareClick"
  >;
  theme?: "amethyst" | "obsidian" | "frost";
  effects?: ReturnType<typeof useChessGame>["effects"];
  cinematic?: boolean;
  flipped?: boolean;
  orbit?: boolean;
  defeated?: "white" | "purple";
  isRecording?: boolean;
  quality?: "performance" | "studio" | "medium" | "high" | "ultra";
  onWebGLFailure?: () => void;
}

export const ChessScene: React.FC<ChessSceneProps> = ({
  enableCameraControls = true,
  viewMode = "3d",
  gameStateProps,
  theme = "amethyst",
  effects = [],
  cinematic = true,
  flipped = false,
  orbit = false,
  defeated,
  isRecording = false,
  quality = "studio",
  onWebGLFailure,
}) => {
  const isPerf = quality === "performance" || quality === "medium";
  const {
    pieces,
    selectedSquare,
    legalMoves,
    checkSquare,
    activeAnimations,
    captures,
    handlePieceClick,
    handleSquareClick,
  } = gameStateProps;

  useEffect(() => {
    materials.setTheme(theme);
  }, [theme]);
  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <Canvas
        frameloop="demand"
        shadows={cinematic ? { type: THREE.PCFShadowMap } : false}
        gl={{
          antialias: true,
          preserveDrawingBuffer: isRecording,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={isPerf ? 1 : [1, 1.5]}
        onCreated={({ gl, scene }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          scene.background = new THREE.Color(0x15151b);
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            onWebGLFailure?.();
          }, { once: true });
        }}
        camera={{
          position: [8, 8.5, 11],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        className="w-full h-full outline-none"
      >
        <Suspense fallback={<Loader />}>
          {cinematic && (
            <CrystalEffects
              effects={effects}
              color={
                theme === "amethyst"
                  ? "#b69ad9"
                  : theme === "frost"
                    ? "#7cd4ee"
                    : "#e2be75"
              }
            />
          )}
          {/* Controlled Professional Studio Reflection Environment - Active in BOTH 3D and 2D Modes */}
          <Environment resolution={isPerf ? 128 : 256}>
            <group>
              {/* Overhead softbox reflection panel providing luminous top-down facet reflections */}
              <Lightformer
                form="rect"
                intensity={viewMode === "2d" ? 2.0 : 1.6}
                position={[0, 14, 0]}
                scale={viewMode === "2d" ? [18, 18, 1] : [16, 16, 1]}
                rotation={[Math.PI / 2, 0, 0]}
                color="#ffffff"
              />
              {/* Four perimeter studio reflector strips catching crystal facets and rims across all 64 squares */}
              {!isPerf && (
                <>
                  <Lightformer
                    form="rect"
                    intensity={1.5}
                    position={[-8, 8, 8]}
                    scale={[6, 12, 1]}
                    rotation={[0.4, 0.6, 0]}
                    color="#f8fafc"
                  />
                  <Lightformer
                    form="rect"
                    intensity={1.3}
                    position={[8, 8, 8]}
                    scale={[6, 12, 1]}
                    rotation={[0.4, -0.6, 0]}
                    color="#f1f5f9"
                  />
                  <Lightformer
                    form="rect"
                    intensity={1.5}
                    position={[6, 8, -8]}
                    scale={[6, 12, 1]}
                    rotation={[-0.4, -0.5, 0]}
                    color="#e2e8f0"
                  />
                  <Lightformer
                    form="rect"
                    intensity={1.5}
                    position={[-6, 8, -8]}
                    scale={[6, 12, 1]}
                    rotation={[-0.4, 0.5, 0]}
                    color="#e0f2fe"
                  />
                </>
              )}
            </group>
          </Environment>

          {/* Clean ambient fill */}
          <ambientLight
            intensity={viewMode === "2d" ? 1.1 : 0.85}
            color="#f8fafc"
          />

          {/* 1. Overhead key light (Active in 3D mode for casting board shadows; disabled in 2D to eliminate center hotspot glare) */}
          {viewMode === "3d" && (
            <directionalLight
              position={[0, 12, 0.1]}
              intensity={2.2}
              color="#ffffff"
              castShadow
              shadow-mapSize-width={isPerf ? 1024 : 2048}
              shadow-mapSize-height={isPerf ? 1024 : 2048}
              shadow-camera-near={0.5}
              shadow-camera-far={25}
              shadow-camera-left={-6}
              shadow-camera-right={6}
              shadow-camera-top={6}
              shadow-camera-bottom={-6}
              shadow-bias={-0.0003}
            />
          )}

          {/* 2. Diagonal fill lights: 2 in perf mode, 4 in studio mode */}
          <directionalLight
            position={[-7, 8.5, 7.5]}
            intensity={viewMode === "2d" ? 1.25 : 1.8}
            color="#ffffff"
          />
          <directionalLight
            position={[7, 8.5, -7.5]}
            intensity={viewMode === "2d" ? 1.25 : 1.8}
            color="#ffffff"
          />
          {!isPerf && (
            <>
              <directionalLight
                position={[7, 8.5, 7.5]}
                intensity={viewMode === "2d" ? 1.25 : 1.8}
                color="#f8fafc"
              />
              <directionalLight
                position={[-7, 8.5, -7.5]}
                intensity={viewMode === "2d" ? 1.25 : 1.8}
                color="#ffffff"
              />
            </>
          )}

          {/* Soft Ground Contact Shadows right beneath the board base */}
          <ContactShadows
            position={[0, -0.1, 0]}
            opacity={isPerf ? 0.25 : viewMode === "2d" ? 0.35 : 0.55}
            scale={isPerf ? 8 : 10}
            blur={isPerf ? 1.0 : 1.6}
            far={1.5}
            color="#08090c"
          />

          {/* The Luxury 8x8 Chessboard */}
          <ChessBoard
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            checkSquare={checkSquare}
            onSquareClick={handleSquareClick}
          />

          {/* The 32 Chess Pieces */}
          <group position={[0, 0, 0]}>
            {pieces.map((p) => {
              const anim = activeAnimations[p.id];
              const cap = captures[p.id];

              return (
                <ChessPiece
                  key={p.id}
                  piece={p}
                  fallen={cinematic && p.type === "k" && p.color === defeated}
                  animation={anim}
                  capture={cap}
                  onClick={handlePieceClick}
                />
              );
            })}
          </group>

          {/* Dynamic 2D / 3D Smooth Camera Rig & Controls */}
          <CameraRig
            viewMode={viewMode}
            flipped={flipped}
            cinematic={orbit}
            enableCameraControls={enableCameraControls}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
export default ChessScene;

import * as THREE from "three";
import { PieceSymbol } from "chess.js";
import { createPawnGeometry } from "./createPawnGeometry";
import { createRookGeometry } from "./createRookGeometry";
import { createKnightGeometry } from "./createKnightGeometry";
import { createBishopGeometry } from "./createBishopGeometry";
import { createQueenGeometry } from "./createQueenGeometry";
import { createKingGeometry } from "./createKingGeometry";

const geometryCache: Partial<Record<PieceSymbol, THREE.BufferGeometry>> = {};

export function getPieceGeometry(type: PieceSymbol): THREE.BufferGeometry {
  if (geometryCache[type]) {
    return geometryCache[type]!;
  }

  let geo: THREE.BufferGeometry;
  switch (type) {
    case "p":
      geo = createPawnGeometry();
      break;
    case "r":
      geo = createRookGeometry();
      break;
    case "n":
      geo = createKnightGeometry();
      break;
    case "b":
      geo = createBishopGeometry();
      break;
    case "q":
      geo = createQueenGeometry();
      break;
    case "k":
      geo = createKingGeometry();
      break;
    default:
      geo = createPawnGeometry();
  }

  geometryCache[type] = geo;
  return geo;
}

export function disposeAllGeometries() {
  Object.values(geometryCache).forEach((geo) => {
    geo?.dispose();
  });
}

import * as THREE from "three";
import { createPurpleCrystalMaterial } from "./PurpleCrystalMaterial";
import { createWhiteCrystalMaterial } from "./WhiteCrystalMaterial";
import {
  createDarkSquareMaterial,
  createLightSquareMaterial,
  createBoardFrameMaterial,
  createBevelTrimMaterial,
  createSelectionMarkerMaterial,
  createLegalMoveMarkerMaterial,
  createCaptureMarkerMaterial,
  createCheckMarkerMaterial,
} from "./BoardMaterials";
import { PieceColor } from "../game/types";

/**
 * Singleton material manager enforcing strict material reuse:
 * - ONE shared PurpleCrystalMaterial across all 16 purple pieces
 * - ONE shared WhiteCrystalMaterial across all 16 white pieces
 * - Zero unnecessary material allocations or re-renders
 */
class MaterialManager {
  private purpleCrystal: THREE.MeshPhysicalMaterial | null = null;
  private whiteCrystal: THREE.MeshPhysicalMaterial | null = null;

  private darkSquare: THREE.MeshPhysicalMaterial | null = null;
  private lightSquare: THREE.MeshPhysicalMaterial | null = null;
  private boardFrame: THREE.MeshPhysicalMaterial | null = null;
  private bevelTrim: THREE.MeshStandardMaterial | null = null;

  private selectionMarker: THREE.MeshBasicMaterial | null = null;
  private legalMoveMarker: THREE.MeshBasicMaterial | null = null;
  private captureMarker: THREE.MeshBasicMaterial | null = null;
  private checkMarker: THREE.MeshBasicMaterial | null = null;

  getPieceMaterial(color: PieceColor): THREE.MeshPhysicalMaterial {
    if (color === "purple") {
      if (!this.purpleCrystal) {
        this.purpleCrystal = createPurpleCrystalMaterial();
      }
      return this.purpleCrystal;
    } else {
      if (!this.whiteCrystal) {
        this.whiteCrystal = createWhiteCrystalMaterial();
      }
      return this.whiteCrystal;
    }
  }

  getDarkSquareMaterial() {
    if (!this.darkSquare) this.darkSquare = createDarkSquareMaterial();
    return this.darkSquare;
  }

  getLightSquareMaterial() {
    if (!this.lightSquare) this.lightSquare = createLightSquareMaterial();
    return this.lightSquare;
  }

  getBoardFrameMaterial() {
    if (!this.boardFrame) this.boardFrame = createBoardFrameMaterial();
    return this.boardFrame;
  }

  getBevelTrimMaterial() {
    if (!this.bevelTrim) this.bevelTrim = createBevelTrimMaterial();
    return this.bevelTrim;
  }

  getSelectionMarkerMaterial() {
    if (!this.selectionMarker)
      this.selectionMarker = createSelectionMarkerMaterial();
    return this.selectionMarker;
  }

  getLegalMoveMarkerMaterial() {
    if (!this.legalMoveMarker)
      this.legalMoveMarker = createLegalMoveMarkerMaterial();
    return this.legalMoveMarker;
  }

  getCaptureMarkerMaterial() {
    if (!this.captureMarker) this.captureMarker = createCaptureMarkerMaterial();
    return this.captureMarker;
  }

  getCheckMarkerMaterial() {
    if (!this.checkMarker) this.checkMarker = createCheckMarkerMaterial();
    return this.checkMarker;
  }

  setTheme(theme: "amethyst" | "obsidian" | "frost") {
    const colors = {
      amethyst: ["#704897", "#eee8ff", "#31243e", "#b9a6c9"],
      obsidian: ["#20232a", "#fff0d2", "#242528", "#b4a384"],
      frost: ["#176581", "#eafaff", "#173e4e", "#a9cbd6"],
    }[theme];
    this.getPieceMaterial("purple").color.set(colors[0]);
    this.getPieceMaterial("purple").attenuationColor.set(colors[0]);
    this.getPieceMaterial("white").color.set(colors[1]);
    this.getDarkSquareMaterial().color.set(colors[2]);
    this.getLightSquareMaterial().color.set(colors[3]);
    this.getBoardFrameMaterial().color.set(colors[2]);
    this.getBevelTrimMaterial().color.set(colors[3]);
  }

  dispose() {
    this.purpleCrystal?.dispose();
    this.whiteCrystal?.dispose();
    this.darkSquare?.dispose();
    this.lightSquare?.dispose();
    this.boardFrame?.dispose();
    this.bevelTrim?.dispose();
    this.selectionMarker?.dispose();
    this.legalMoveMarker?.dispose();
    this.captureMarker?.dispose();
    this.checkMarker?.dispose();
  }
}

export const materials = new MaterialManager();

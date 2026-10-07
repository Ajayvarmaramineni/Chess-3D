import * as THREE from "three";
import { getBasePedestalPoints, mergePieceGeometries } from "./geometryUtils";

/**
 * Creates the architectural crystal Rook geometry:
 * - Weighted multi-stage luxury pedestal with continuous classical mouldings
 * - Tapered tower shaft with integrated architectural fluted pilasters
 * - Stepped cornice mouldings with clean shadow grooves
 * - Upper parapet reading as a single sculpted castle crown:
 *   thinner battlement walls, deeper inner walkway well, subtle precision bevels,
 *   and cohesive radial spacing (no toy-like decorative bumps)
 */
export function createRookGeometry(): THREE.BufferGeometry {
  const baseScale = 0.98; // Base radius ~0.38
  const basePoints = getBasePedestalPoints(baseScale, 1.0);

  // Tower body profile with flared parapet and deep interior walkway well
  const towerPoints: [number, number][] = [
    [0.175, 0.44],
    [0.225, 0.5], // Tower base collar
    [0.238, 0.54], // Lower pilaster base plinth
    [0.23, 0.65], // Tapered shaft
    [0.22, 0.85],
    [0.212, 1.05],
    [0.228, 1.16], // Upper shaft collar
    [0.26, 1.22], // Projecting cornice ledge
    [0.275, 1.25], // Cornice bead
    [0.245, 1.28], // Recessed shadow line
    [0.305, 1.35], // Flared parapet base
    [0.315, 1.45], // Outer parapet wall
    [0.255, 1.45], // Parapet wall thickness rim (slender, architectural)
    [0.245, 1.3], // Deeper interior walkway drop
    [0.15, 1.3], // Walkway floor
    [0.14, 1.33], // Central raised well roof
    [0.0, 1.33],
  ];

  const fullLathePoints = [
    ...basePoints.filter((p) => p.y < 0.44),
    ...towerPoints.map(([r, y]) => new THREE.Vector2(r, y)),
  ];

  const bodyGeo = new THREE.LatheGeometry(fullLathePoints, 80);

  // 12 Clean Integrated Vertical Architectural Fluting Ribs
  // Terminate cleanly into cornice without toy-like spherical bumps
  const flutingGeos: THREE.BufferGeometry[] = [];
  const numRibs = 12;
  const ribHeight = 0.58;
  const ribMidY = 0.86;

  for (let i = 0; i < numRibs; i++) {
    const angle = (i / numRibs) * Math.PI * 2;
    // Tapered trapezoidal column rib with beveled faces
    const ribGeo = new THREE.CylinderGeometry(0.014, 0.018, ribHeight, 8);
    ribGeo.scale(1.2, 1.0, 0.55); // Flatten against tower surface
    ribGeo.rotateY(angle);

    // Position along the tapered tower surface
    const rad = 0.222;
    ribGeo.translate(Math.sin(angle) * rad, ribMidY, Math.cos(angle) * rad);
    flutingGeos.push(ribGeo);
  }

  // 6 Cohesive Architectural Battlements with Subtle Precision Bevels
  // Reads as a single unified castle crown rather than isolated blocks
  const battlementGeos: THREE.BufferGeometry[] = [];
  const numCrenels = 6;
  const crownRadius = 0.28;
  const crenelHeight = 0.2;
  const crenelWidth = 0.142;
  const crenelDepth = 0.082; // Thinner, more architectural wall thickness

  for (let i = 0; i < numCrenels; i++) {
    const angle = (i / numCrenels) * Math.PI * 2;

    // Beveled battlement main block
    const mainBlock = new THREE.BoxGeometry(
      crenelWidth,
      crenelHeight,
      crenelDepth,
    );
    mainBlock.translate(0, crenelHeight / 2, 0);

    // Clean top chamfer
    const topCap = new THREE.CylinderGeometry(
      crenelWidth * 0.44,
      crenelWidth * 0.52,
      0.024,
      4,
    );
    topCap.rotateY(Math.PI / 4);
    topCap.scale(1.0, 1.0, crenelDepth / crenelWidth);
    topCap.translate(0, crenelHeight + 0.012, 0);

    const crenelParts = [mainBlock, topCap];
    crenelParts.forEach((part) => {
      part.rotateY(angle);
      part.translate(
        Math.sin(angle) * crownRadius,
        1.43,
        Math.cos(angle) * crownRadius,
      );
    });

    battlementGeos.push(...crenelParts);
  }

  return mergePieceGeometries([bodyGeo, ...flutingGeos, ...battlementGeos]);
}

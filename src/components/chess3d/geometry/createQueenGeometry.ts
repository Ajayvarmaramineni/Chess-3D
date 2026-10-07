import * as THREE from "three";
import { getBasePedestalPoints, mergePieceGeometries } from "./geometryUtils";

/**
 * Creates the jewelry-level luxury crystal Queen geometry:
 * - Shared multi-stage luxury pedestal with continuous curvature
 * - Slender feminine hourglass stem with refined gemstone-faceted mid-band
 * - Compact, regal coronet chalice cup
 * - 8 elegant, moderately-scaled crown points with delicate pearl tips (not open, spiky, or cage-like)
 * - Beautiful central crystal jewel orb nestled inside the coronet
 * - Unmistakably royal from gameplay distance
 */
export function createQueenGeometry(): THREE.BufferGeometry {
  const baseScale = 0.98; // Base radius ~0.38
  const basePoints = getBasePedestalPoints(baseScale, 1.0);

  // Slender hourglass stem, delicate mid-band, double royal collar, and coronet bowl
  const stemPoints: [number, number][] = [
    [0.17, 0.44],
    [0.145, 0.68],
    [0.13, 0.82], // Slender concave waist
    [0.148, 0.88], // Delicate faceted band flare
    [0.165, 0.92], // Faceted band peak
    [0.142, 0.96], // Stepped return
    [0.135, 1.15],
    [0.155, 1.32], // Upper stem expansion
    [0.235, 1.38], // Lower royal collar disc
    [0.25, 1.41],
    [0.195, 1.44], // Recessed shadow groove
    [0.255, 1.48], // Upper royal collar disc
    [0.215, 1.52],
    // Compact, elegant Coronet Chalice Bowl (Y: 1.52 -> 1.86)
    [0.23, 1.6],
    [0.255, 1.74],
    [0.27, 1.86], // Outer rim lip (controlled width, not splayed)
    [0.225, 1.86], // Inner rim wall
    [0.17, 1.76], // Inner bowl floor
    [0.0, 1.76],
  ];

  const fullLathePoints = [
    ...basePoints.filter((p) => p.y < 0.44),
    ...stemPoints.map(([r, y]) => new THREE.Vector2(r, y)),
  ];

  const bodyGeo = new THREE.LatheGeometry(fullLathePoints, 80);

  // 8 Refined Crystal Crown Petals (Controlled height, elegant negative space)
  const crownParts: THREE.BufferGeometry[] = [];
  const numProngs = 8;
  const rimRadius = 0.255;

  // Shortened, graceful petal contour
  const petalShape = new THREE.Shape();
  petalShape.moveTo(-0.028, 0);
  petalShape.bezierCurveTo(-0.032, 0.05, -0.022, 0.11, -0.01, 0.155);
  petalShape.lineTo(0.0, 0.185); // Tip: controlled height (no sharp spikes)
  petalShape.lineTo(0.01, 0.155);
  petalShape.bezierCurveTo(0.022, 0.11, 0.032, 0.05, 0.028, 0);
  petalShape.closePath();

  // Fine jewelry extrusion settings
  const petalExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.008,
    bevelSegments: 3,
  };

  for (let i = 0; i < numProngs; i++) {
    const angle = (i / numProngs) * Math.PI * 2;
    const isCardinal = i % 2 === 0;
    const heightMultiplier = isCardinal ? 1.0 : 0.85;
    const pearlRadius = isCardinal ? 0.024 : 0.019;

    const prongGeo = new THREE.ExtrudeGeometry(
      petalShape,
      petalExtrudeSettings,
    );
    prongGeo.scale(1.0, heightMultiplier, 1.0);
    // Subtle, regal upright flare (not wide or cage-like)
    prongGeo.rotateX(0.11);
    prongGeo.rotateY(Math.PI / 2 - angle);

    const tipHeight = 1.86 + 0.175 * heightMultiplier;
    const posX = Math.cos(angle) * rimRadius;
    const posZ = Math.sin(angle) * rimRadius;

    prongGeo.translate(posX, 1.86, posZ);
    crownParts.push(prongGeo);

    // Smooth crystal pearl orb at petal apex
    const orbGeo = new THREE.SphereGeometry(pearlRadius, 16, 14);
    const flareOffset = 0.016 * heightMultiplier;
    orbGeo.translate(
      Math.cos(angle) * (rimRadius + flareOffset),
      tipHeight + pearlRadius * 0.5,
      Math.sin(angle) * (rimRadius + flareOffset),
    );
    crownParts.push(orbGeo);
  }

  // Central crystal jewel inside crown bowl
  const centralSphere = new THREE.SphereGeometry(0.075, 32, 24);
  centralSphere.scale(1.0, 1.15, 1.0);
  centralSphere.translate(0, 1.88, 0);
  crownParts.push(centralSphere);

  // Delicate apex highlight bead
  const topBead = new THREE.SphereGeometry(0.02, 16, 12);
  topBead.translate(0, 1.98, 0);
  crownParts.push(topBead);

  return mergePieceGeometries([bodyGeo, ...crownParts]);
}

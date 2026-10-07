import * as THREE from "three";
import { getBasePedestalPoints, mergePieceGeometries } from "./geometryUtils";

/**
 * Creates the luxury hand-cut crystal Pawn geometry:
 * - Shared multi-stage weighted pedestal with continuous classical mouldings
 * - Hourglass bell stem with concave waist and subtle faceted decorative band
 * - Multi-tiered saucer collar with clean shadow grooves
 * - Pure, classical polished crystal spherical head resting in a precision seat
 *   (top pebble/finial completely removed for pure Staunton silhouette)
 */
export function createPawnGeometry(): THREE.BufferGeometry {
  const baseScale = 0.88; // Base radius ~0.34
  const basePoints = getBasePedestalPoints(baseScale, 0.95);

  // Hourglass stem, decorative ring, and multi-tier saucer collar
  const stemCollarPoints: [number, number][] = [
    [0.155, 0.44],
    [0.135, 0.54],
    [0.12, 0.62], // Narrow waist
    [0.138, 0.67], // Mid-stem faceted band start
    [0.148, 0.7], // Mid-stem faceted band peak
    [0.13, 0.73], // Inset step
    [0.125, 0.79],
    [0.145, 0.84], // Lower collar flare
    [0.19, 0.88], // First collar step
    [0.225, 0.91], // Wide thin saucer collar rim
    [0.225, 0.93], // Collar rim edge
    [0.16, 0.955], // Inward collar bevel
    [0.135, 0.98], // Recessed neck groove
    [0.155, 1.01], // Head seat bead
    [0.11, 1.04], // Head seat cup
    [0.0, 1.04],
  ];

  const fullLathePoints = [
    ...basePoints.filter((p) => p.y < 0.44),
    ...stemCollarPoints.map(([r, y]) => new THREE.Vector2(r, y)),
  ];

  const bodyGeo = new THREE.LatheGeometry(fullLathePoints, 80);

  // Pure Classical Crystal Head Orb (No top pebble or finial)
  // Subtly compressed optical sphere with faceted equatorial crystal girdle
  const headParts: THREE.BufferGeometry[] = [];

  const sphereGeo = new THREE.SphereGeometry(0.185, 48, 36);
  sphereGeo.scale(1.0, 0.96, 1.0);
  sphereGeo.translate(0, 1.18, 0);
  headParts.push(sphereGeo);

  // Subtle crystal facet girdle around equator catching specular glints
  const girdleGeo = new THREE.CylinderGeometry(0.187, 0.187, 0.035, 16);
  girdleGeo.translate(0, 1.18, 0);
  headParts.push(girdleGeo);

  return mergePieceGeometries([bodyGeo, ...headParts]);
}

import * as THREE from "three";
import { getBasePedestalPoints, mergePieceGeometries } from "./geometryUtils";

/**
 * Creates the monumental luxury crystal King geometry:
 * - Authoritative architectural proportions with stately presence
 * - Shared multi-stage luxury pedestal with continuous classical mouldings
 * - Architectural column stem with refined mid-waist bead and double royal collar
 * - Regal crown cap with stepped circular bevels and royal crystal dome
 * - Stately, crisp, regal 3D Sculpted Crystal Cross Pattée (widened slightly for readability from all camera angles)
 * - Faceted central gemstone node and refined finial cap
 */
export function createKingGeometry(): THREE.BufferGeometry {
  const baseScale = 1.04; // Base radius ~0.41
  const basePoints = getBasePedestalPoints(baseScale, 0.96);

  // Authoritative column stem, mid-shaft bead, double royal collar, and crown bowl
  const stemPoints: [number, number][] = [
    [0.185, 0.44],
    [0.165, 0.65],
    [0.15, 0.78], // Controlled waist
    [0.18, 0.84], // Mid-stem bead flare
    [0.205, 0.88], // Mid-stem bead peak
    [0.17, 0.92], // Stepped return
    [0.158, 1.14],
    [0.185, 1.34], // Upper stem flare
    [0.26, 1.41], // Lower royal collar disc
    [0.285, 1.45],
    [0.22, 1.48], // Deep shadow groove
    [0.275, 1.53], // Upper royal collar disc
    [0.235, 1.57],
    // Royal Crown Cap Body (Y: 1.57 -> 1.92)
    [0.26, 1.65],
    [0.31, 1.8],
    [0.295, 1.88], // Upper crown shoulder
    [0.2, 1.92], // Crown rim step
    [0.0, 1.92],
  ];

  const fullLathePoints = [
    ...basePoints.filter((p) => p.y < 0.44),
    ...stemPoints.map(([r, y]) => new THREE.Vector2(r, y)),
  ];

  const bodyGeo = new THREE.LatheGeometry(fullLathePoints, 80);

  const crownParts: THREE.BufferGeometry[] = [];

  // Regal Crown Dome (Y: 1.92 -> 2.05)
  const domeGeo = new THREE.SphereGeometry(0.165, 36, 24);
  domeGeo.scale(1.1, 0.6, 1.1);
  domeGeo.translate(0, 1.94, 0);
  crownParts.push(domeGeo);

  // Clean, slender Cross Mount Pedestal
  const crossPedestal = new THREE.CylinderGeometry(0.06, 0.09, 0.06, 24);
  crossPedestal.translate(0, 2.04, 0);
  crownParts.push(crossPedestal);

  // Regal 3D Sculpted Crystal Cross Pattée (Widened slightly for superior camera readability)
  const crossShape = new THREE.Shape();
  const cW = 0.03; // Slender waist half-width

  // Flared Cross Pattée outline (widened horizontal arms ~0.264 total width)
  crossShape.moveTo(-0.052, -0.125);
  crossShape.lineTo(0.052, -0.125);
  crossShape.lineTo(cW, -0.028);
  crossShape.lineTo(0.132, -0.048);
  crossShape.lineTo(0.132, 0.048);
  crossShape.lineTo(cW, 0.028);
  crossShape.lineTo(0.058, 0.145);
  crossShape.lineTo(-0.058, 0.145);
  crossShape.lineTo(-cW, 0.028);
  crossShape.lineTo(-0.132, 0.048);
  crossShape.lineTo(-0.132, -0.048);
  crossShape.lineTo(-cW, -0.028);
  crossShape.closePath();

  const crossExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.046,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.011,
    bevelSegments: 3,
  };

  const crossGeo = new THREE.ExtrudeGeometry(crossShape, crossExtrudeSettings);
  crossGeo.center();
  crossGeo.translate(0, 2.21, 0);
  crownParts.push(crossGeo);

  // Central Faceted Gemstone Node
  const centerGem = new THREE.OctahedronGeometry(0.038);
  centerGem.scale(1.0, 1.0, 0.85);
  centerGem.translate(0, 2.21, 0);
  crownParts.push(centerGem);

  // Apex crystal pyramid bead at top of cross
  const finialTip = new THREE.ConeGeometry(0.024, 0.038, 4);
  finialTip.rotateY(Math.PI / 4);
  finialTip.translate(0, 2.375, 0);
  crownParts.push(finialTip);

  return mergePieceGeometries([bodyGeo, ...crownParts]);
}

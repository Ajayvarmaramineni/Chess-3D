import * as THREE from "three";
import {
  getBasePedestalPoints,
  mergePieceGeometries,
  createLoftedBody,
  LoftSection,
} from "./geometryUtils";

/**
 * Creates the traditional classical crystal Bishop geometry:
 * - Shared multi-stage luxury pedestal
 * - Graceful concave rising stem with refined double saucer collar
 * - Vertically elongated flame/oval mitre head (width ~0.23, height ~0.34, depth ~0.21)
 * - Authentic narrow diagonal slash cut formed by two complementary tapered 3D lobes
 * - Rounded flame apex with understated crystal pearl finial
 * - Completely eliminates rectangular slab / flat extruded box artifacts
 */
export function createBishopGeometry(): THREE.BufferGeometry {
  const baseScale = 0.94; // Base radius ~0.37
  const basePoints = getBasePedestalPoints(baseScale, 0.94);

  // Slender rising stem, concave waist, and clean double saucer collar
  const stemCollarPoints: [number, number][] = [
    [0.165, 0.44],
    [0.138, 0.62],
    [0.12, 0.78], // Slender concave waist
    [0.135, 0.9],
    [0.165, 0.96], // Lower collar flare
    [0.215, 1.0], // Lower saucer rim
    [0.215, 1.02],
    [0.16, 1.04], // Inward waist between saucers
    [0.215, 1.08], // Upper saucer rim
    [0.215, 1.1],
    [0.135, 1.13], // Mitre seat bead
    [0.115, 1.16], // Mitre base transition
    [0.0, 1.16],
  ];

  const fullStemLathe = [
    ...basePoints.filter((p) => p.y < 0.44),
    ...stemCollarPoints.map(([r, y]) => new THREE.Vector2(r, y)),
  ];

  const lowerGeo = new THREE.LatheGeometry(fullStemLathe, 80);

  const mitreParts: THREE.BufferGeometry[] = [];

  // Front Lower Lobe (tapered 3D oval rising to diagonal cut plane)
  const frontSections: LoftSection[] = [
    {
      center: new THREE.Vector3(0, 1.16, 0.0),
      radiusX: 0.105,
      radiusZFront: 0.095,
      radiusZBack: 0.095,
    },
    {
      center: new THREE.Vector3(0, 1.23, -0.01),
      radiusX: 0.116,
      radiusZFront: 0.102,
      radiusZBack: 0.08,
    },
    {
      center: new THREE.Vector3(0, 1.29, -0.02),
      radiusX: 0.11,
      radiusZFront: 0.098,
      radiusZBack: 0.06,
      rotationX: 0.65,
    },
    {
      center: new THREE.Vector3(0, 1.34, -0.035),
      radiusX: 0.082,
      radiusZFront: 0.075,
      radiusZBack: 0.025,
      rotationX: 0.7,
    },
  ];
  const frontLobe = createLoftedBody(frontSections, 24);
  mitreParts.push(frontLobe);

  // Rear Upper Lobe (tapered 3D oval rising from diagonal cut plane to rounded flame tip)
  const rearSections: LoftSection[] = [
    {
      center: new THREE.Vector3(0, 1.28, 0.035),
      radiusX: 0.082,
      radiusZFront: 0.025,
      radiusZBack: 0.082,
      rotationX: 0.65,
    },
    {
      center: new THREE.Vector3(0, 1.35, 0.02),
      radiusX: 0.108,
      radiusZFront: 0.068,
      radiusZBack: 0.098,
      rotationX: 0.45,
    },
    {
      center: new THREE.Vector3(0, 1.42, 0.01),
      radiusX: 0.088,
      radiusZFront: 0.078,
      radiusZBack: 0.088,
      rotationX: 0.2,
    },
    {
      center: new THREE.Vector3(0, 1.47, 0.0),
      radiusX: 0.052,
      radiusZFront: 0.052,
      radiusZBack: 0.052,
      rotationX: 0.0,
    },
    {
      center: new THREE.Vector3(0, 1.5, 0.0),
      radiusX: 0.022,
      radiusZFront: 0.022,
      radiusZBack: 0.022,
    },
  ];
  const rearLobe = createLoftedBody(rearSections, 24);
  mitreParts.push(rearLobe);

  // Apex Crystal Pearl Finial
  const finialPearl = new THREE.SphereGeometry(0.028, 20, 16);
  finialPearl.scale(0.9, 1.15, 0.9);
  finialPearl.translate(0, 1.52, 0);
  mitreParts.push(finialPearl);

  return mergePieceGeometries([lowerGeo, ...mitreParts]);
}

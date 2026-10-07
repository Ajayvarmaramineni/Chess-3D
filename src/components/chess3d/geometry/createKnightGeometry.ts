import * as THREE from "three";
import { getBasePedestalPoints, mergePieceGeometries } from "./geometryUtils";

/**
 * Luxury crystal Staunton knight.
 *
 * The horse is built from a beveled side-profile sculpture instead of stacked
 * spheres. That gives the piece the long forehead, tapered muzzle, arched neck,
 * crisp chest and carved crystal silhouette shown in the visual reference.
 * Local forward direction is -Z.
 */
export function createKnightGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // --- Classical weighted pedestal -------------------------------------------------
  const basePoints = getBasePedestalPoints(0.98, 0.96);
  const pedestalPoints = basePoints.filter((p) => p.y <= 0.445);
  pedestalPoints.push(
    new THREE.Vector2(0.215, 0.445),
    new THREE.Vector2(0.195, 0.468),
    new THREE.Vector2(0.17, 0.486),
    new THREE.Vector2(0.0, 0.486),
  );
  parts.push(new THREE.LatheGeometry(pedestalPoints, 80));

  // Converts a 2D side silhouette (horizontal = forward, vertical = up) into
  // a centered, beveled 3D crystal carving. Positive silhouette X faces -Z.
  const extrudeProfile = (
    shape: THREE.Shape,
    thickness: number,
    bevelSize: number,
    bevelThickness: number,
    curveSegments = 24,
  ): THREE.BufferGeometry => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize,
      bevelThickness,
      curveSegments,
    });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-thickness / 2, 0, 0);
    return geometry;
  };

  // --- Main horse sculpture --------------------------------------------------------
  // One continuous silhouette: chest -> throat -> jaw -> muzzle -> forehead ->
  // poll -> rear neck -> shoulder. This is the key to avoiding the old blob/joker look.
  const horse = new THREE.Shape();
  horse.moveTo(-0.185, 0.475); // rear foot of neck
  horse.bezierCurveTo(-0.23, 0.59, -0.25, 0.745, -0.235, 0.9);
  horse.bezierCurveTo(-0.22, 1.06, -0.18, 1.215, -0.12, 1.335); // rear neck
  horse.bezierCurveTo(-0.095, 1.39, -0.07, 1.435, -0.035, 1.475); // poll
  horse.bezierCurveTo(0.03, 1.515, 0.115, 1.515, 0.18, 1.475); // crown/forehead root
  horse.bezierCurveTo(0.26, 1.425, 0.335, 1.35, 0.405, 1.275); // long forehead
  horse.bezierCurveTo(0.47, 1.21, 0.535, 1.165, 0.6, 1.145); // upper muzzle
  horse.bezierCurveTo(0.635, 1.132, 0.655, 1.105, 0.65, 1.075); // rounded nose tip
  horse.bezierCurveTo(0.642, 1.04, 0.61, 1.02, 0.565, 1.022); // lower nose
  horse.bezierCurveTo(0.495, 1.025, 0.43, 1.05, 0.37, 1.075); // mouth/jaw
  horse.bezierCurveTo(0.3, 1.105, 0.25, 1.125, 0.205, 1.115); // jaw hinge
  horse.bezierCurveTo(0.155, 1.095, 0.125, 1.045, 0.11, 0.98); // throat
  horse.bezierCurveTo(0.08, 0.84, 0.075, 0.7, 0.105, 0.585); // chest
  horse.bezierCurveTo(0.125, 0.525, 0.11, 0.49, 0.07, 0.475);
  horse.closePath();
  parts.push(extrudeProfile(horse, 0.245, 0.018, 0.02, 32));

  // --- Sculpted cheek plane ---------------------------------------------------------
  // A shallow secondary crystal facet gives the head readable anatomy without
  // turning it into a pile of spherical primitives.
  const cheek = new THREE.Shape();
  cheek.moveTo(0.115, 1.405);
  cheek.bezierCurveTo(0.205, 1.39, 0.285, 1.325, 0.33, 1.245);
  cheek.bezierCurveTo(0.285, 1.18, 0.215, 1.145, 0.145, 1.165);
  cheek.bezierCurveTo(0.09, 1.22, 0.075, 1.33, 0.115, 1.405);
  cheek.closePath();
  parts.push(extrudeProfile(cheek, 0.278, 0.009, 0.01, 20));

  // --- Two elegant pointed ears -----------------------------------------------------
  const makeEar = (side: number): THREE.BufferGeometry => {
    const ear = new THREE.Shape();
    ear.moveTo(-0.015, 1.465);
    ear.bezierCurveTo(-0.01, 1.535, 0.0, 1.615, 0.025, 1.705);
    ear.bezierCurveTo(0.07, 1.645, 0.078, 1.555, 0.06, 1.475);
    ear.closePath();
    const g = extrudeProfile(ear, 0.072, 0.007, 0.008, 16);
    g.translate(side * 0.072, 0, 0);
    g.rotateZ(side * -0.055);
    return g;
  };
  parts.push(makeEar(-1), makeEar(1));

  // --- Flowing carved mane ----------------------------------------------------------
  // Separate tapered crystal feathers, overlapping into one flowing crest. These are
  // beveled profile blades — never spheres/beads. They intentionally echo the faceted
  // mane in the generated reference image.
  const maneBlades = [
    { x: -0.105, y: 1.455, len: 0.175, drop: 0.06, width: 0.075 },
    { x: -0.145, y: 1.39, len: 0.205, drop: 0.075, width: 0.082 },
    { x: -0.175, y: 1.31, len: 0.225, drop: 0.09, width: 0.086 },
    { x: -0.198, y: 1.22, len: 0.235, drop: 0.1, width: 0.088 },
    { x: -0.215, y: 1.125, len: 0.23, drop: 0.105, width: 0.085 },
    { x: -0.225, y: 1.025, len: 0.215, drop: 0.105, width: 0.08 },
    { x: -0.23, y: 0.925, len: 0.19, drop: 0.1, width: 0.074 },
    { x: -0.225, y: 0.83, len: 0.16, drop: 0.09, width: 0.066 },
  ];

  for (const blade of maneBlades) {
    const s = new THREE.Shape();
    s.moveTo(blade.x, blade.y + blade.width * 0.45);
    s.bezierCurveTo(
      blade.x - blade.len * 0.38,
      blade.y + blade.width * 0.25,
      blade.x - blade.len * 0.78,
      blade.y - blade.drop * 0.35,
      blade.x - blade.len,
      blade.y - blade.drop,
    );
    s.bezierCurveTo(
      blade.x - blade.len * 0.68,
      blade.y - blade.drop * 0.72,
      blade.x - blade.len * 0.25,
      blade.y - blade.width * 0.48,
      blade.x,
      blade.y - blade.width * 0.42,
    );
    s.closePath();
    parts.push(extrudeProfile(s, 0.185, 0.007, 0.009, 18));
  }

  // --- Subtle brow ridge -------------------------------------------------------------
  // Thin carved brow; no cartoon eyeball sphere.
  const brow = new THREE.Shape();
  brow.moveTo(0.175, 1.39);
  brow.bezierCurveTo(0.215, 1.405, 0.255, 1.395, 0.285, 1.365);
  brow.bezierCurveTo(0.245, 1.37, 0.205, 1.365, 0.17, 1.35);
  brow.closePath();
  parts.push(extrudeProfile(brow, 0.292, 0.004, 0.005, 12));

  // --- Mouth cut as a very slim raised/refractive facet -----------------------------
  const mouth = new THREE.Shape();
  mouth.moveTo(0.42, 1.075);
  mouth.bezierCurveTo(0.485, 1.058, 0.545, 1.055, 0.6, 1.068);
  mouth.bezierCurveTo(0.545, 1.073, 0.485, 1.08, 0.425, 1.09);
  mouth.closePath();
  parts.push(extrudeProfile(mouth, 0.286, 0.003, 0.004, 12));

  const result = mergePieceGeometries(parts);
  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

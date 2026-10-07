import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Safely merges an array of BufferGeometries into a single unified BufferGeometry,
 * normalizing all geometries to non-indexed representations with matching
 * 'position' and 'normal' attributes, welding close vertices and recalculating smooth normals.
 */
export function mergePieceGeometries(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry {
  const validGeos = geometries.filter(
    (g) =>
      g &&
      g.attributes &&
      g.attributes.position &&
      g.attributes.position.count > 0,
  );
  if (validGeos.length === 0) {
    return new THREE.BufferGeometry();
  }

  // Ensure all geometries are non-indexed with clean position and normal attributes
  const normalized = validGeos.map((geo) => {
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();

    if (!nonIndexed.attributes.normal) {
      nonIndexed.computeVertexNormals();
    }

    const cleanGeo = new THREE.BufferGeometry();
    cleanGeo.setAttribute("position", nonIndexed.attributes.position);
    cleanGeo.setAttribute("normal", nonIndexed.attributes.normal);

    return cleanGeo;
  });

  try {
    const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
    if (merged) {
      const optimized = BufferGeometryUtils.mergeVertices(merged, 0.0005);
      optimized.computeVertexNormals();
      return finalizePieceGeometry(optimized);
    }
  } catch (err) {
    console.warn(
      "mergePieceGeometries failed, falling back to first geometry:",
      err,
    );
  }

  return finalizePieceGeometry(validGeos[0]);
}

/**
 * Ensures strict geometry alignment:
 * - Minimum Y is positioned flush at exactly Y = 0.0 (no hovering, no penetration)
 * - X and Z are centered symmetrically at 0.0
 * - Vertex normals and bounding volumes are accurately precalculated
 */
export function finalizePieceGeometry(
  geo: THREE.BufferGeometry,
): THREE.BufferGeometry {
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    const minY = geo.boundingBox.min.y;
    const centerX = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
    const centerZ = (geo.boundingBox.min.z + geo.boundingBox.max.z) / 2;

    // Shift to center X and ground Y at 0, preserving base center at Z=0
    geo.translate(-centerX, -minY, -centerZ);
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Takes a list of 2D profile control points [radius, y] and generates a smooth,
 * curvature-continuous profile by spline interpolation.
 */
export function sampleProfileCurve(
  keyPoints: [number, number][],
  subdivisions = 4,
): THREE.Vector2[] {
  if (keyPoints.length < 2) {
    return keyPoints.map(([r, y]) => new THREE.Vector2(r, y));
  }

  const v3Points = keyPoints.map(([r, y]) => new THREE.Vector3(r, y, 0));
  const curve = new THREE.CatmullRomCurve3(v3Points, false, "centripetal", 0.5);

  const totalSamples = (keyPoints.length - 1) * subdivisions;
  const samples: THREE.Vector2[] = [];

  for (let i = 0; i <= totalSamples; i++) {
    const pt = curve.getPoint(i / totalSamples);
    samples.push(new THREE.Vector2(Math.max(0, pt.x), pt.y));
  }

  return samples;
}

/**
 * Creates the unified luxury pedestal profile points for LatheGeometry.
 * Refined to eliminate "stacked donuts" and create ONE cohesive classical moulding:
 * - Broad grounded base with subtle 45-deg chamfer (Y: 0.0 -> 0.04)
 * - Single elegant convex torus bead (Y: 0.04 -> 0.13)
 * - Crisp recessed shadow groove / fillet (Y: 0.13 -> 0.17)
 * - Flowing, continuous concave scotia sweep (Y: 0.17 -> 0.35)
 * - Crisp architectural plinth step collar (Y: 0.35 -> 0.44)
 * - Smooth transition directly into piece stem (Y: 0.44 -> 0.47)
 */
export function getBasePedestalPoints(
  scale = 1.0,
  heightScale = 1.0,
): THREE.Vector2[] {
  const rawPoints: [number, number][] = [
    [0.0, 0.0],
    [0.39, 0.0], // Flat bottom footprint
    [0.39, 0.03], // Vertical bottom edge
    [0.375, 0.055], // Subtle chamfer
    [0.365, 0.075], // Transition into torus
    [0.378, 0.115], // Single primary torus bead peak
    [0.36, 0.145], // Torus return
    [0.325, 0.17], // Crisp recessed shadow groove
    [0.315, 0.19], // Base of scotia
    [0.265, 0.255], // Mid-scotia sweep (graceful concave curve)
    [0.23, 0.33], // Upper scotia curve
    [0.22, 0.375], // Scotia throat
    [0.238, 0.405], // Plinth collar flare
    [0.238, 0.425], // Plinth rim edge
    [0.205, 0.45], // Plinth bevel into stem
    [0.175, 0.475], // Stem start
  ];

  return rawPoints.map(
    ([r, y]) => new THREE.Vector2(r * scale, y * heightScale),
  );
}

/**
 * Specification for a single cross-section of a 3D lofted body.
 */
export interface LoftSection {
  center: THREE.Vector3;
  radiusX: number; // Lateral half-width (left/right)
  radiusZFront: number; // Forward depth from center (-Z in standard view)
  radiusZBack: number; // Backward depth from center (+Z in standard view)
  rotationX?: number; // Pitch angle (tilt forward/backward in radians)
  rotationY?: number; // Yaw angle (radians)
  crestSharpness?: number; // 0 = smooth oval, >0 = sharp crest ridge at rear (+Z)
  lateralFlattening?: number; // 0 = standard oval, >0 = flattened cheek/neck planes
}

/**
 * Builds a continuous, watertight, 2-manifold lofted BufferGeometry along an arbitrary 3D spine.
 * Avoids any internal overlapping primitives and calculates smooth vertex normals.
 */
export function createLoftedBody(
  sections: LoftSection[],
  radialSegments = 32,
): THREE.BufferGeometry {
  if (sections.length < 2) {
    return new THREE.BufferGeometry();
  }

  const positions: number[] = [];
  const indices: number[] = [];

  const numSections = sections.length;
  const M = radialSegments;

  // Generate vertices for each cross-section ring
  for (let s = 0; s < numSections; s++) {
    const sec = sections[s];
    const rotX = sec.rotationX || 0;
    const rotY = sec.rotationY || 0;
    const crest = sec.crestSharpness || 0;
    const flatten = sec.lateralFlattening || 0;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    for (let j = 0; j < M; j++) {
      const theta = (j / M) * Math.PI * 2; // 0 is front (-Z), PI is back (+Z)
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Local lateral X
      let lx = sinT * sec.radiusX;
      if (flatten > 0) {
        // Flatten lateral sides (when sinT is large)
        const flatFactor = 1 - flatten * Math.pow(Math.abs(sinT), 3) * 0.25;
        lx *= flatFactor;
      }

      // Local depth Z: front is -cosT * frontRadius, back is +cosT * backRadius
      let lz: number;
      if (cosT >= 0) {
        // Front half (-Z)
        lz = -cosT * sec.radiusZFront;
      } else {
        // Rear half (+Z)
        let rz = sec.radiusZBack;
        if (crest > 0) {
          // Sharpen the rear spine/crest
          const spineFactor = 1 + crest * Math.pow(-cosT, 2) * 0.35;
          rz *= spineFactor;
        }
        lz = -cosT * rz;
      }

      // Local Y starts at 0, then rotated by pitch (rotX) and yaw (rotY)
      // Standard Euler rotation (pitch around X then yaw around Y)
      const y1 = -lz * sinX;
      const z1 = lz * cosX;

      const x2 = lx * cosY + z1 * sinY;
      const y2 = y1;
      const z2 = -lx * sinY + z1 * cosY;

      // Translate to section center
      positions.push(sec.center.x + x2, sec.center.y + y2, sec.center.z + z2);
    }
  }

  // Create quad faces between adjacent sections
  for (let s = 0; s < numSections - 1; s++) {
    const rowA = s * M;
    const rowB = (s + 1) * M;

    for (let j = 0; j < M; j++) {
      const nextJ = (j + 1) % M;

      const a0 = rowA + j;
      const a1 = rowA + nextJ;
      const b0 = rowB + j;
      const b1 = rowB + nextJ;

      // Two triangles per quad with outward counter-clockwise winding
      indices.push(a0, b0, a1);
      indices.push(a1, b0, b1);
    }
  }

  // Bottom cap (fan to center at section 0)
  const bottomCenterIndex = positions.length / 3;
  positions.push(
    sections[0].center.x,
    sections[0].center.y,
    sections[0].center.z,
  );
  for (let j = 0; j < M; j++) {
    const nextJ = (j + 1) % M;
    indices.push(bottomCenterIndex, nextJ, j);
  }

  // Top/tip cap (fan to center at last section)
  const topCenterIndex = positions.length / 3;
  const lastSec = sections[numSections - 1];
  positions.push(lastSec.center.x, lastSec.center.y, lastSec.center.z);
  const lastRow = (numSections - 1) * M;
  for (let j = 0; j < M; j++) {
    const nextJ = (j + 1) % M;
    indices.push(topCenterIndex, lastRow + j, lastRow + nextJ);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

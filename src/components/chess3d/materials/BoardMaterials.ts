import * as THREE from "three";

/**
 * Dark Squares: Deep smoked obsidian slate
 * Polished enough for subtle crystal reflections, with controlled roughness so squares remain distinct.
 */
export function createDarkSquareMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x141820), // Refined smoked obsidian slate with distinct visual contrast
    roughness: 0.25,
    metalness: 0.04,
    clearcoat: 0.35, // Softened clearcoat to eliminate blinding specular hot spots in 2D top-down view
    clearcoatRoughness: 0.12,
    specularColor: new THREE.Color(0x475569),
    reflectivity: 0.4,
  });
}

/**
 * Light Squares: Frosted smoky quartz / platinum ice
 * Provides crisp visual contrast with the dark squares from every viewing angle.
 */
export function createLightSquareMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x64748b), // Frosted platinum slate
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.08,
    roughness: 0.16,
    metalness: 0.02,
    clearcoat: 0.55,
    clearcoatRoughness: 0.08,
    specularColor: new THREE.Color(0xf8fafc),
    transmission: 0.15, // Subtle translucent crystal depth
    thickness: 0.4,
    ior: 1.45,
    transparent: true,
  });
}

/**
 * Board Frame: Mirror-polished jet obsidian with platinum specular reflection
 */
export function createBoardFrameMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x090a0d), // Mirror-polished jet obsidian
    roughness: 0.15,
    metalness: 0.06,
    clearcoat: 0.65,
    clearcoatRoughness: 0.06,
    specularColor: new THREE.Color(0x475569),
  });
}

/**
 * Bevel Trim: Smoked platinum-chrome metallic accent
 */
export function createBevelTrimMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x282e38),
    roughness: 0.2,
    metalness: 0.65,
  });
}

export function createSelectionMarkerMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x38bdf8), // Electric diamond cyan
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createLegalMoveMarkerMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x0ea5e9), // Diamond ice-blue indicator
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createCaptureMarkerMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xf43f5e), // Ruby crimson
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createCheckMarkerMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xe11d48), // Garnet red
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

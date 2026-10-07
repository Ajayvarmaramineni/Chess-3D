import * as THREE from "three";

/**
 * Reusable shared physically based luxury Clear / Frosted White Quartz Crystal material.
 * Conforms to museum-quality Waterford / Swarovski / Rock Crystal quartz:
 * - Bright white body readability from EVERY viewing direction
 * - True optical transmission (0.76) and refraction (IOR 1.52) revealing crystal geometry
 * - Soft internal white crystalline scattering (milky rock crystal / white quartz, NOT plastic/porcelain)
 * - Brilliant silver-white polished surface reflections and crisp rim highlights
 */
export function createWhiteCrystalMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xf8fafc), // Pristine optical icy white quartz
    emissive: new THREE.Color(0x1e293b), // Micro-touch (0.04) to maintain white value in deep shadows without glow
    emissiveIntensity: 0.04,
    metalness: 0.0,
    roughness: 0.05, // Polished crystal facet smoothness
    transmission: 0.76, // Balanced optical depth: transparent crystal refractions with crisp white quartz silhouette
    ior: 1.52, // Optical quartz crystal index
    thickness: 2.0,
    transparent: true,
    opacity: 1.0,
    envMapIntensity: 2.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.02, // Mirror-smooth outer crystal facet polish
    attenuationColor: new THREE.Color(0xf1f5f9), // Subtle cool quartz depth
    attenuationDistance: 2.2,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff), // Brilliant silver-white specular highlights
    depthWrite: true,
  });
}

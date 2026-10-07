import * as THREE from "three";

/**
 * Reusable shared physically based luxury optical Smoked Obsidian / Black Crystal material.
 * Conforms to museum-quality Baccarat / Lalique black crystal / smoked quartz:
 * - Deep smoked charcoal-black glass body
 * - True optical transmission (0.72) and refraction (IOR 1.55) revealing internal facet reflections
 * - Volumetric depth attenuation: thick bases and bodies deepen to jet black,
 *   while thin carved edges (knight mane, ears, king cross, queen crown tips) transmit luminous smoked graphite
 * - Mirror-polished outer crystal surface with razor-sharp platinum-white specular highlights
 * - Zero flat plastic or opaque dullness — unmistakably luxury optical black crystal
 */
export function createPurpleCrystalMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1a1c22), // Deep smoked charcoal-black crystal body
    emissive: new THREE.Color(0x0a0c10), // Micro-touch (0.04) to maintain facet visibility in deep shadows without glow
    emissiveIntensity: 0.04,
    metalness: 0.0,
    roughness: 0.04, // Mirror-smooth hand-polished crystal surface
    transmission: 0.58, // Balanced optical transmission preserving solid silhouette while refracting light
    ior: 1.58, // Lead crystal refractive index for strong Fresnel rim reflections
    thickness: 2.0, // Optical volume absorption depth
    transparent: true,
    opacity: 1.0,
    envMapIntensity: 2.8, // High-contrast studio reflections on faceted edges
    clearcoat: 0.95, // Deep luxury lacquer/glass clearcoat
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0x060709), // Volumetric depth absorption into jet obsidian in thick sections
    attenuationDistance: 1.6,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff), // Brilliant platinum-white specular rim reflections
    depthWrite: true,
  });
}

import * as THREE from 'three';

export interface BoundingBoxInfo {
  center: THREE.Vector3;
  size: THREE.Vector3;
  maxDimension: number;
}

/**
 * Computes the center, dimensions, and maximum bounding dimension of a Three.js Box3.
 */
export function computeBoundingBoxInfo(box: THREE.Box3): BoundingBoxInfo {
  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDimension = Math.max(size.x, size.y, size.z);
  return { center, size, maxDimension };
}

/**
 * Computes optimal camera distance to frame an object of given max dimension
 * without clipping within the camera field of view.
 *
 * Formula: distance = (maxDim / 2) / tan(fovRad / 2) * paddingFactor
 */
export function computeCameraFitDistance(
  maxDimension: number,
  fovInDegrees: number,
  paddingFactor: number = 1.55
): number {
  if (fovInDegrees <= 0 || fovInDegrees >= 180) {
    throw new Error('FOV must be between 0 and 180 degrees');
  }
  const fovRad = THREE.MathUtils.degToRad(fovInDegrees);
  const halfFov = fovRad / 2;
  const distance = (maxDimension / 2 / Math.tan(halfFov)) * paddingFactor;
  return Math.max(0.1, distance);
}

/**
 * Computes the 3D camera position given a look-at target and spherical orbital coordinates.
 */
export function computeCameraPositionFromSpherical(
  target: THREE.Vector3,
  spherical: THREE.Spherical
): THREE.Vector3 {
  const offset = new THREE.Vector3().setFromSpherical(spherical);
  return target.clone().add(offset);
}

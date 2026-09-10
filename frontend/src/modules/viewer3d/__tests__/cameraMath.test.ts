import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  computeBoundingBoxInfo,
  computeCameraFitDistance,
  computeCameraPositionFromSpherical,
} from '../cameraMath';

describe('cameraMath module', () => {
  describe('computeBoundingBoxInfo', () => {
    it('correctly calculates center, size, and maxDimension of a symmetric box', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(-2, -3, -4),
        new THREE.Vector3(2, 3, 4)
      );
      const info = computeBoundingBoxInfo(box);

      expect(info.center.x).toBeCloseTo(0);
      expect(info.center.y).toBeCloseTo(0);
      expect(info.center.z).toBeCloseTo(0);

      expect(info.size.x).toBeCloseTo(4);
      expect(info.size.y).toBeCloseTo(6);
      expect(info.size.z).toBeCloseTo(8);

      expect(info.maxDimension).toBeCloseTo(8);
    });

    it('handles translated bounding boxes', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(10, 20, 30),
        new THREE.Vector3(12, 22, 32)
      );
      const info = computeBoundingBoxInfo(box);

      expect(info.center.x).toBeCloseTo(11);
      expect(info.center.y).toBeCloseTo(21);
      expect(info.center.z).toBeCloseTo(31);

      expect(info.size.x).toBeCloseTo(2);
      expect(info.size.y).toBeCloseTo(2);
      expect(info.size.z).toBeCloseTo(2);

      expect(info.maxDimension).toBeCloseTo(2);
    });

    it('handles flat / 2D bounding boxes', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(-5, 0, -10),
        new THREE.Vector3(5, 0, 10)
      );
      const info = computeBoundingBoxInfo(box);

      expect(info.size.y).toBeCloseTo(0);
      expect(info.maxDimension).toBeCloseTo(20);
    });
  });

  describe('computeCameraFitDistance', () => {
    it('computes distance preventing mesh clipping according to trigonometry', () => {
      const fov = 45;
      const maxDim = 10;
      const paddingFactor = 1.55;

      const distance = computeCameraFitDistance(maxDim, fov, paddingFactor);

      // Frustum half-height at distance: h = distance * tan(fovRad / 2)
      const fovRad = THREE.MathUtils.degToRad(fov);
      const halfHeightAtDistance = distance * Math.tan(fovRad / 2);

      // halfHeightAtDistance should equal (maxDim / 2) * paddingFactor
      expect(halfHeightAtDistance).toBeCloseTo((maxDim / 2) * paddingFactor, 5);
      // The distance must strictly be greater than half dimension to avoid near-plane collision
      expect(halfHeightAtDistance).toBeGreaterThan(maxDim / 2);
    });

    it('scales proportionally with object size', () => {
      const fov = 60;
      const d1 = computeCameraFitDistance(5, fov);
      const d2 = computeCameraFitDistance(10, fov);

      expect(d2).toBeCloseTo(d1 * 2, 5);
    });

    it('increases distance for narrower FOV', () => {
      const maxDim = 5;
      const distNarrow = computeCameraFitDistance(maxDim, 30);
      const distWide = computeCameraFitDistance(maxDim, 90);

      expect(distNarrow).toBeGreaterThan(distWide);
    });

    it('throws error on invalid FOV', () => {
      expect(() => computeCameraFitDistance(10, 0)).toThrow();
      expect(() => computeCameraFitDistance(10, 180)).toThrow();
      expect(() => computeCameraFitDistance(10, -10)).toThrow();
    });
  });

  describe('computeCameraPositionFromSpherical', () => {
    it('computes camera position correctly around origin target', () => {
      const target = new THREE.Vector3(0, 0, 0);
      // radius = 10, phi = Math.PI / 2 (equator), theta = 0 (+Z axis)
      const spherical = new THREE.Spherical(10, Math.PI / 2, 0);
      const pos = computeCameraPositionFromSpherical(target, spherical);

      expect(pos.x).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(0);
      expect(pos.z).toBeCloseTo(10);
    });

    it('computes camera position around offset target', () => {
      const target = new THREE.Vector3(5, 10, -3);
      // radius = 5, phi = 0 (top / +Y), theta = 0
      const spherical = new THREE.Spherical(5, 0, 0);
      const pos = computeCameraPositionFromSpherical(target, spherical);

      expect(pos.x).toBeCloseTo(5);
      expect(pos.y).toBeCloseTo(15);
      expect(pos.z).toBeCloseTo(-3);
    });
  });
});

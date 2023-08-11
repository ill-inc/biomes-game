import type * as THREE from "three";

export class Ray {
  constructor(
    public readonly source: THREE.Vector3,
    public readonly direction: THREE.Vector3,
    private maxTravelDistance?: number | undefined
  ) {
    this.direction = direction.normalize();
  }

  // Check if a position is close enough to be a valid hit.
  hitWithinRange(position: THREE.Vector3): boolean {
    if (this.maxTravelDistance === undefined) {
      return true;
    }

    const distance = this.source.distanceTo(position);
    return distance <= this.maxTravelDistance;
  }

  // Ray traveling from {from} to {to}.
  static fromPoints(from: THREE.Vector3, to: THREE.Vector3): Ray {
    const direction = to.clone().sub(from).normalize();
    return new Ray(from, direction);
  }
}

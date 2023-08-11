import {
  intersectRayAabb,
  intersectsAABB,
  makeOrthoProjection,
  makeYRotate,
  mulm4,
  viewProjFrustumIntersectsAABB,
} from "@/shared/math/linear";
import { assertNear, assertNearArray } from "@/shared/math/test";
import assert from "assert";
import * as THREE from "three";

describe("Linear", () => {
  it("intersectRayAabb", () => {
    assert.deepEqual(
      intersectRayAabb(
        [0, 0, 0],
        [1, 0, 0],
        [
          [2, -1, -1],
          [3, 1, 1],
        ]
      ),
      { distance: 2, pos: [2, 0, 0] }
    );
    assert.deepEqual(
      intersectRayAabb(
        [0, 0, 0],
        [0, 1, 0],
        [
          [-1, 2, -1],
          [1, 3, 1],
        ]
      ),
      { distance: 2, pos: [0, 2, 0] }
    );
    assert.deepEqual(
      intersectRayAabb(
        [0, 0, 0],
        [0, 0, 1],
        [
          [-1, -1, 2],
          [1, 1, 3],
        ]
      ),
      { distance: 2, pos: [0, 0, 2] }
    );
    assert.deepEqual(
      intersectRayAabb(
        [5, 0, 0],
        [-1, 0, 0],
        [
          [2, -1, -1],
          [3, 1, 1],
        ]
      ),
      { distance: 2, pos: [3, 0, 0] }
    );
    assert.deepEqual(
      intersectRayAabb(
        [0, 5, 0],
        [0, -1, 0],
        [
          [-1, 2, -1],
          [1, 3, 1],
        ]
      ),
      { distance: 2, pos: [0, 3, 0] }
    );
    assert.deepEqual(
      intersectRayAabb(
        [0, 0, 5],
        [0, 0, -1],
        [
          [-1, -1, 2],
          [1, 1, 3],
        ]
      ),
      { distance: 2, pos: [0, 0, 3] }
    );

    // AABB is behind the ray.
    assert.deepEqual(
      intersectRayAabb(
        [0, 5, 0],
        [0, 1, 0],
        [
          [-1, 2, -1],
          [1, 3, 1],
        ]
      ),
      undefined
    );

    const sqrt3 = Math.sqrt(3);
    const invSqrt3 = 1 / sqrt3;
    const diagResult = intersectRayAabb(
      [0, 0, 0],
      [invSqrt3, invSqrt3, invSqrt3],
      [
        [1, 0, 0],
        [2, 2, 2],
      ]
    );
    assert(diagResult !== undefined);
    assertNear(diagResult.distance, sqrt3);
    assertNearArray(diagResult.pos, [1, 1, 1]);
  });

  it("intersectAabb", () => {
    assert(
      intersectsAABB(
        [
          [0, 0, 0],
          [2, 2, 2],
        ],
        [
          [1, 1, 1],
          [3, 3, 3],
        ]
      )
    );
    assert(
      !intersectsAABB(
        [
          [0, 0, 0],
          [2, 2, 2],
        ],
        [
          [3, 3, 3],
          [4, 4, 4],
        ]
      )
    );
    assert(
      intersectsAABB(
        [
          [0, 0, 0],
          [4, 4, 4],
        ],
        [
          [1, 1, 1],
          [2, 2, 2],
        ]
      )
    );
    assert(
      intersectsAABB(
        [
          [1, 1, 1],
          [2, 2, 2],
        ],
        [
          [0, 0, 0],
          [4, 4, 4],
        ]
      )
    );
    assert(
      intersectsAABB(
        [
          [0, 0, 0],
          [4, 4, 4],
        ],
        [
          [1, -1, 1],
          [2, 5, 2],
        ]
      )
    );
  });
  it("intersectFrustumAabb", () => {
    const ortho = makeOrthoProjection(-1, 1, -1, 1, 1, -1);
    assert(
      viewProjFrustumIntersectsAABB(ortho, [
        [0, 0, 0],
        [1, 1, -1],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(ortho, [
        [1.5, 0, 0],
        [2.5, 1, -1],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(ortho, [
        [-2.5, 0, 0],
        [-1.5, 1, -1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(ortho, [
        [0.5, 0, 0],
        [1.5, 1, -1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(ortho, [
        [-1.5, 0, 0],
        [-0.5, 1, -1],
      ])
    );

    const largeOrtho = makeOrthoProjection(-10, 10, -10, 10, 10, -10);
    assert(
      viewProjFrustumIntersectsAABB(largeOrtho, [
        [0, 0, 0],
        [1, 1, -1],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(largeOrtho, [
        [11, 0, 0],
        [12, 1, -1],
      ])
    );

    const longOrtho = makeOrthoProjection(1, 100, -1, 1, 1, -1);
    assert(
      !viewProjFrustumIntersectsAABB(longOrtho, [
        [0, 0, -0.5],
        [1, 1, 0],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longOrtho, [
        [0, 0, -1.5],
        [1, 1, -0.5],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longOrtho, [
        [0, 0, -100.5],
        [1, 1, -99.5],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(longOrtho, [
        [0, 0, -101.5],
        [1, 1, -100.5],
      ])
    );

    const longThreeOrtho = new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      1,
      100
    ).projectionMatrix.toArray();
    assert(
      !viewProjFrustumIntersectsAABB(longThreeOrtho, [
        [0, 0, -0.5],
        [1, 1, 0],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longThreeOrtho, [
        [0, 0, -1.5],
        [1, 1, -0.5],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longThreeOrtho, [
        [0, 0, -100.5],
        [1, 1, -99.5],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(longThreeOrtho, [
        [0, 0, -101.5],
        [1, 1, -100.5],
      ])
    );

    const offCenterOrtho = makeOrthoProjection(-1, 1, 100, 101, -51, -50);
    assert(
      !viewProjFrustumIntersectsAABB(offCenterOrtho, [
        [98, -51, -1],
        [99, -50, 1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(offCenterOrtho, [
        [99, -51, -1],
        [100.5, -50, 1],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(offCenterOrtho, [
        [100, -53, -1],
        [101, -52, 1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(offCenterOrtho, [
        [100, -52, -1],
        [101, -50.5, 1],
      ])
    );

    const threePerspective = new THREE.PerspectiveCamera(
      45,
      1,
      1,
      100
    ).projectionMatrix.toArray();
    assert(
      !viewProjFrustumIntersectsAABB(threePerspective, [
        [0, 0, -0.5],
        [1, 1, 0],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(threePerspective, [
        [0, 0, -1.5],
        [1, 1, -0.5],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(threePerspective, [
        [0, 0, -100.5],
        [1, 1, -99.5],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(threePerspective, [
        [0, 0, -101.5],
        [1, 1, -100.5],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(threePerspective, [
        [20, 20, -11],
        [21, 21, -10],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(threePerspective, [
        [20, 20, -81],
        [21, 21, -80],
      ])
    );

    const longRotatedOrtho = mulm4(
      makeOrthoProjection(1, 100, -1, 1, 1, -1),
      makeYRotate(Math.PI / 2)
    );
    assert(
      !viewProjFrustumIntersectsAABB(longRotatedOrtho, [
        [0, 0, 0],
        [0.5, 1, -1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longRotatedOrtho, [
        [0.5, 0, 0],
        [1.5, 1, -1],
      ])
    );
    assert(
      viewProjFrustumIntersectsAABB(longRotatedOrtho, [
        [99.5, 0, 0],
        [100.5, 1, -1],
      ])
    );
    assert(
      !viewProjFrustumIntersectsAABB(longRotatedOrtho, [
        [100.5, 0, 0],
        [101.5, 1, -1],
      ])
    );
  });
});

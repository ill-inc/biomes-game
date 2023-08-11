import random
from math import cos, pi, sin, sqrt
from typing import Tuple

import numpy as np
import numpy.typing as npt

Quaternion = Tuple[float, float, float, float]


def quat_to_matrix(quat: Quaternion) -> npt.NDArray:
    q0 = quat[0]
    q1 = quat[1]
    q2 = quat[2]
    q3 = quat[3]

    r00 = 2 * (q3 * q3 + q0 * q0) - 1
    r01 = 2 * (q0 * q1 - q3 * q2)
    r02 = 2 * (q0 * q2 + q3 * q1)

    r10 = 2 * (q0 * q1 + q3 * q2)
    r11 = 2 * (q3 * q3 + q1 * q1) - 1
    r12 = 2 * (q1 * q2 - q3 * q0)

    r20 = 2 * (q0 * q2 - q3 * q1)
    r21 = 2 * (q1 * q2 + q3 * q0)
    r22 = 2 * (q3 * q3 + q2 * q2) - 1

    # 3x3 rotation matrix
    return np.array([[r00, r01, r02], [r10, r11, r12], [r20, r21, r22]])


def random_quat(seed: int) -> Quaternion:
    # From http://planning.cs.uiuc.edu/node198.html,
    random.seed(seed)
    u = random.random()
    v = random.random()
    w = random.random()
    return (
        sqrt(1 - u) * sin(2 * pi * v),
        sqrt(1 - u) * cos(2 * pi * v),
        sqrt(u) * sin(2 * pi * w),
        sqrt(u) * cos(2 * pi * w),
    )


def axis_angle(axis: Tuple[float, float, float], angle: float) -> Quaternion:
    return (
        axis[0] * sin(0.5 * angle),
        axis[1] * sin(0.5 * angle),
        axis[2] * sin(0.5 * angle),
        cos(0.5 * angle),
    )

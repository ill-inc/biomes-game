export type GaussianDistribution = {
  mean: number;
  variance: number;
};

export type TruncatedGaussianDistribution = {
  mean: number;
  variance: number;
  lowerBound?: number;
  upperBound?: number;
};

// Sample from a Gaussian distribution using the Box-Muller transform.
// https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
// Return the results in polar coordinates where transforming to cartesian
// coordinates would give two gaussian distributed samples on the x and y axis
// with mean 0 and the specified variance.
function sampleGaussianPolar(variance: number) {
  // Convert from [0,1) -> (0,1], so we can safely take the logarithm of u1.
  const u1 = 1 - Math.random();
  const u2 = Math.random();

  return {
    magnitude: Math.sqrt(-2 * Math.log(u1) * variance),
    angle: 2 * Math.PI * u2,
  };
}

export function sampleGaussian(params: GaussianDistribution): number {
  const polar = sampleGaussianPolar(params.variance);
  return polar.magnitude * Math.cos(polar.angle) + params.mean;
}

export function sampleTruncatedGaussianDistribution(
  params: TruncatedGaussianDistribution
): number {
  let ret: number;
  do {
    ret = sampleGaussian(params);
  } while (
    (params.lowerBound !== undefined && ret < params.lowerBound) ||
    (params.upperBound && ret > params.upperBound)
  );
  return ret;
}

// Similar to sampleGaussian, but you get two for only a small amount more than
// the price of one!
export function sampleGaussianPair(
  params: GaussianDistribution
): [number, number] {
  const polar = sampleGaussianPolar(params.variance);
  return [
    polar.magnitude * Math.cos(polar.angle) + params.mean,
    polar.magnitude * Math.sin(polar.angle) + params.mean,
  ];
}

// https://en.wikipedia.org/wiki/Sum_of_normally_distributed_random_variables#Independent_random_variables
export function addGaussians(
  a: GaussianDistribution,
  b: GaussianDistribution
): GaussianDistribution {
  return { mean: a.mean + b.mean, variance: a.variance + b.variance };
}

// https://en.wikipedia.org/wiki/Sum_of_normally_distributed_random_variables#Independent_random_variables
export function scaleGaussian(
  scale: number,
  gaussian: GaussianDistribution
): GaussianDistribution {
  return { mean: gaussian.mean * scale, variance: gaussian.variance * scale };
}

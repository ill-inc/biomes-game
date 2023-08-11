const float PI = 3.1415926535897932384626433832795;
const mat3 ID = mat3(1.0);

uint randomHash(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

uint positionHash(uvec3 pos) {
  return randomHash(pos.x + randomHash(pos.y + randomHash(pos.z)));
}

// Random functions
uint rng_state;
uint rand_pcg() {
  uint state = rng_state;
  rng_state = rng_state * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

float rand1() {
  uint r = rand_pcg() / uint(1 << 8);
  return float(r) / float(1 << 24);
}

vec2 rand2() {
  return vec2(rand1(), rand1());
}

vec3 rand3() {
  return vec3(rand1(), rand1(), rand1());
}

float randomRange(float lo, float hi) {
  return lo + (hi - lo) * rand1();
}

vec3 randomRange(vec3 lo, vec3 hi) {
  return lo + (hi - lo) * rand3();
}

vec3 randomAxis() {
  vec2 uv = rand2();
  float z = 2.0 * uv.x - 1.0;
  float t = 2.0 * PI * uv.y;
  return vec3(sqrt(1.0 - z * z) * cos(t), sqrt(1.0 - z * z) * sin(t), z);
}

mat3 rotationXY(float angle) {
  float s = sin(angle);
  float c = cos(angle);

  return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

mat3 rotationXZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);

  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

// avro, graphics gems 3
mat3 randomRotation3d() {
  vec3 random = rand3();
  float theta = 2.0 * PI * random.x;
  float phi = 2.0 * PI * random.y;
  float z = random.z;
  vec3 v = vec3(cos(phi) * sqrt(z), sin(phi) * sqrt(z), sqrt(1.0 - z));
  return (2.0 * outerProduct(v, v) - ID) * rotationXY(theta);
}
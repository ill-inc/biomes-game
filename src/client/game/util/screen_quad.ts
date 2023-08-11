import * as THREE from "three";

const vertexShader = `
out vec2 _texCoord;

void main() {
  _texCoord = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const alphaMapFragmentShader = `
uniform lowp sampler2D alphaMap;
in vec2 _texCoord;

void main() {
  float alpha = texture(alphaMap, _texCoord).r;
  gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5 * alpha);
}
`;

export function makeScreenFillingAlphaMap(alphaMap?: THREE.Texture) {
  const ret = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: alphaMapFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        alphaMap: { value: alphaMap },
      },
    })
  );
  ret.frustumCulled = false;
  return ret;
}

export function updateScreenFillingAlphaMap(
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>,
  alphaMap?: THREE.Texture
) {
  mesh.material.uniforms.alphaMap.value = alphaMap;
  mesh.material.needsUpdate = true;
}

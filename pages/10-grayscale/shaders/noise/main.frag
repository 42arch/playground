#include ../../../../lib/webgl-noise/noise2D.glsl

varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform float uOpacity;
uniform float uSeed;
uniform float uScale;

void main() {
  vec2 pos = vUv * uSize;
  vec2 cell = floor(pos / uCellSize);
  
  float noise = snoise((cell + uSeed) * uScale);
  noise = (noise + 1.0) * 0.5; // [-1, 1] -> [0, 1]
  
  gl_FragColor = vec4(noise, noise, noise, uOpacity);
}
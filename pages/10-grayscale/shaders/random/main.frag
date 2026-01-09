varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform float uOpacity;
uniform float uRandom;

float random(vec2 n) { 
  return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 pos = vUv * uSize;
  vec2 cell = floor(pos / uCellSize);
  
  float value = random(cell + uRandom);
  // value = (value + 1.0) * 0.5;
  
  gl_FragColor = vec4(value, value, value, uOpacity);
}
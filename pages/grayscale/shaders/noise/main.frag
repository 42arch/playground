#include noise2D

varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform float uOpacity;
uniform float uSeed;
uniform float uScale;

void main() {
  // 将UV坐标转换为网格坐标
  vec2 pos = vUv * uSize;
  // 通过除以cellSize得到网格坐标（在第几个格子）
  vec2 cell = floor(pos / uCellSize);
  
  vec2 noisePos = vUv * uSize;
  float noise = snoise((cell + uSeed) * uScale);
  noise = (noise + 1.0) * 0.5;  // 
  
  // 应用不透明度
  gl_FragColor = vec4(noise, noise, noise, uOpacity);
}
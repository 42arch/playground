#define NUM_POINTS 3

varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec2 uPoints[NUM_POINTS];
uniform float uOpacity;

void main() {
  vec2 pos = (vUv - 0.5) * uSize;
  vec2 cell = floor(pos / uCellSize);
  vec2 cellCenter = (cell + 0.5) * uCellSize;

  // 初始化最小距离为一个大数
  float minDist = 1e10;
  
  // 遍历所有点，找到最近的点
  for(int i = 0; i < NUM_POINTS; i++) {
    float dist = distance(cellCenter, uPoints[i]);
    minDist = min(minDist, dist);
  }

  // 计算最大可能距离（从任意点到画布角落）
  float maxDist = length(vec2(uSize, uSize)) * 0.5;
  
  // 归一化并计算颜色
  float t = pow(clamp(minDist / maxDist, 0.0, 1.0), 0.5);
  vec3 color = mix(uColor1, uColor2, t);

  gl_FragColor = vec4(color, uOpacity);
}

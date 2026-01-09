
varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec2 uPoint;
uniform float uOpacity;

void main() {
  vec2 pos = (vUv - 0.5) * uSize;
  vec2 cell = floor(pos / uCellSize);

  // 计算每个格子的中心坐标（以格子坐标为单位）
  vec2 cellCenter = (cell + 0.5) * uCellSize;

  // 距离中心 (0, 0) 的距离
  // float dist = length(cellCenter);
  float dist = distance(cellCenter, uPoint);

  // 寻找最大可能的距离：对角角落
  float maxDistX = (uPoint.x > 0.0) ? -uSize : uSize;
  float maxDistY = (uPoint.y > 0.0) ? -uSize : uSize;
  float maxDist = distance(vec2(maxDistX, maxDistY) * 0.5, uPoint);

  // 归一化到 0~1
  float t = pow(clamp(dist / maxDist, 0.0, 1.0), 0.5);
  vec3 color = mix(uColor1, uColor2, t);

  gl_FragColor = vec4(color, uOpacity);
}

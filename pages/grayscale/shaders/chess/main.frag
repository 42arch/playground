varying vec2 vUv;
uniform float uSize;
uniform float uCellSize;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uOpacity;

void main() {
  // 把[0, 1]的uv坐标转换为[-0.5, 0.5]再乘以总大小，得到世界坐标
  vec2 pos = (vUv - 0.5) * uSize;
  // 通过除以cellSize得到网格坐标（在第几个格子）
  vec2 cell = floor(pos / uCellSize);
  // 根据横纵坐标之和的奇偶性来判断是黑白棋盘
  float pattern = mod(cell.x + cell.y, 2.0);
  // pattern小于0.5时，使用uColor1，否则使用uColor2：
  // step函数阈值为0.5，小于阈值返回0，大于阈值返回1，
  // mix函数根据pattern的值来插值，混合因子要么是0，要么是1，所以颜色值要么是uColor1，要么是uColor2
  vec3 color = mix(uColor1, uColor2, step(0.5, pattern));

  gl_FragColor = vec4(color, uOpacity);
}
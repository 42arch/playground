
attribute float vertexId;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uSegments;
uniform float uOpacity;
uniform float uRadius;
uniform vec3 uColor;
varying float vOpacity;
varying vec3 vColor;

void main() {
  float angle;
  vec2 pos;
  // 根据索引计算位置
  if (vertexId == 0.0) {
    angle = 0.0;
    pos = vec2(0.0, 0.0);
  } else {
    angle = (vertexId - 1.0) / uSegments * 2.0 * 3.14159;
    pos = vec2(cos(angle), sin(angle));
  }
  vOpacity = uOpacity;
  vColor = uColor;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos * uRadius, 0.0, 1.0);
}

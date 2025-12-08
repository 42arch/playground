precision highp float;
varying float vOpacity;
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, vOpacity);
}
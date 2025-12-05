uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uCloudTexture;
uniform vec3 uSunDirection;
uniform vec3 uAtomsphereDayColor;
uniform vec3 uAtomsphereTwilightColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
// uniform vec3 cameraPosition;

void main() {
  
  vec3 viewDirection = normalize(vPosition - cameraPosition);
  vec3 normal = normalize(vNormal);
  vec3 color = vec3(vUv, 1.0);

  // sun direction
  // vec3 uSunDirection = vec3(0.0, 0.0, 1.0);
  float sunOrientation = dot(uSunDirection, normal);


  // day night color
  float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
  vec3 dayColor = texture(uDayTexture, vUv).rgb;
  vec3 nightColor = texture(uNightTexture, vUv).rgb;
  color = mix(nightColor, dayColor, dayMix);

  // cloud
  vec2 specularCloudsColor = texture(uCloudTexture, vUv).rg;
  // color = vec3(specularCloudsColor, 0.0);
  float cloudMix = smoothstep(0.4, 1.0, specularCloudsColor.g);
  cloudMix *= dayMix;
  color = mix(color, vec3(1.0), cloudMix);

  // fresnal
  float fresnal = dot(viewDirection, normal) + 1.0;
  fresnal = pow(fresnal, 2.0);

  // atmosphere
  float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
  vec3 atmosphereColor = mix(uAtomsphereTwilightColor, uAtomsphereDayColor,atmosphereDayMix);
  // color = atmosphereColor;
  color = mix(color, atmosphereColor, fresnal * atmosphereDayMix);

  // Specular
  vec3 reflection = reflect(-uSunDirection, normal);
  float specular = - dot(reflection, viewDirection);
  specular = max(specular, 0.0);
  specular = pow(specular, 32.0);
  specular *= specularCloudsColor.r;

  vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnal);
  color += specular * specularColor;


  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
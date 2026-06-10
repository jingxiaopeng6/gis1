import * as THREE from 'three'

export const terrainVertexShader = `
  uniform sampler2D heightMap;
  uniform float terrainScale;
  uniform vec2 heightMapSize;

  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vNormal;

  void main() {
    vUv = uv;

    float height = texture2D(heightMap, uv).r;
    vElevation = height;

    vec3 pos = position;
    pos.y += height * terrainScale;

    vec2 texel = 1.0 / max(heightMapSize, vec2(1.0));
    float hL = texture2D(heightMap, uv - vec2(texel.x, 0.0)).r;
    float hR = texture2D(heightMap, uv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(heightMap, uv - vec2(0.0, texel.y)).r;
    float hU = texture2D(heightMap, uv + vec2(0.0, texel.y)).r;

    vec3 normal = normalize(vec3((hL - hR) * terrainScale, 2.0, (hD - hU) * terrainScale));
    vNormal = normalMatrix * normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const terrainFragmentShader = `
  uniform vec3 gradientColor;
  uniform vec3 gradientColor1;
  uniform vec3 gradientColor2;
  uniform vec3 gradientColor3;
  uniform vec3 gradientColor4;
  uniform vec3 gradientColor5;
  uniform vec3 gradientColor6;
  uniform float minElevation;
  uniform float maxElevation;
  uniform bool showContours;
  uniform float contourInterval;
  uniform vec3 contourColor;
  uniform bool showHillshade;
  uniform vec3 lightDirection;
  uniform sampler2D heightMap;
  uniform sampler2D overlayMap;
  uniform float overlayOpacity;
  uniform bool showOverlay;
  uniform vec2 heightMapSize;
  uniform vec2 overlayUvOffset;
  uniform vec2 overlayUvScale;
  uniform bool overlayAligned;

  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vNormal;

  void main() {
    float h = clamp(vElevation, 0.0, 1.0);

    vec3 color;
    if (h < 0.15) {
      color = mix(gradientColor, gradientColor1, h / 0.15);
    } else if (h < 0.3) {
      color = mix(gradientColor1, gradientColor2, (h - 0.15) / 0.15);
    } else if (h < 0.5) {
      color = mix(gradientColor2, gradientColor3, (h - 0.3) / 0.2);
    } else if (h < 0.7) {
      color = mix(gradientColor3, gradientColor4, (h - 0.5) / 0.2);
    } else if (h < 0.85) {
      color = mix(gradientColor4, gradientColor5, (h - 0.7) / 0.15);
    } else {
      color = mix(gradientColor5, gradientColor6, (h - 0.85) / 0.15);
    }

    float diffuse = max(dot(normalize(vNormal), normalize(lightDirection)), 0.0);
    float ambient = 0.55;
    float lightFactor = ambient + diffuse * 0.45;

    if (showHillshade) {
      color = mix(color * 0.82, color * lightFactor, 0.85);
    }

    if (showOverlay) {
      vec2 overlayUv;
      if (overlayAligned) {
        overlayUv = overlayUvOffset + vUv * overlayUvScale;
      } else {
        overlayUv = vUv;
      }
      bool inside = all(greaterThanEqual(overlayUv, vec2(0.0)))
                 && all(lessThanEqual(overlayUv, vec2(1.0)));
      if (inside) {
        vec4 overlay = texture2D(overlayMap, overlayUv);
        color = mix(color, overlay.rgb, clamp(overlay.a * overlayOpacity, 0.0, 1.0));
      }
    }

    if (showContours && h > 0.005) {
      float elevationRange = max(maxElevation - minElevation, 0.0001);
      float realH = minElevation + h * elevationRange;
      float idx = floor(realH / contourInterval);

      vec2 texel = 1.0 / max(heightMapSize, vec2(1.0));
      float hL = texture2D(heightMap, vUv - vec2(texel.x, 0.0)).r;
      float hR = texture2D(heightMap, vUv + vec2(texel.x, 0.0)).r;
      float hD = texture2D(heightMap, vUv - vec2(0.0, texel.y)).r;
      float hU = texture2D(heightMap, vUv + vec2(0.0, texel.y)).r;

      float idxL = floor((minElevation + hL * elevationRange) / contourInterval);
      float idxR = floor((minElevation + hR * elevationRange) / contourInterval);
      float idxD = floor((minElevation + hD * elevationRange) / contourInterval);
      float idxU = floor((minElevation + hU * elevationRange) / contourInterval);

      bool crosses = (idxL != idx) || (idxR != idx) || (idxD != idx) || (idxU != idx);
      if (crosses) {
        color = mix(color, contourColor, 0.7);
      }
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export const GRADIENT_SCHEMES = {
  natural: [
    new THREE.Color(0x0C4A6E),
    new THREE.Color(0x155E75),
    new THREE.Color(0x166534),
    new THREE.Color(0x65A30D),
    new THREE.Color(0xCA8A04),
    new THREE.Color(0x78350F),
    new THREE.Color(0xE2E8F0),
  ],
  satellite: [
    new THREE.Color(0x1E3A5F),
    new THREE.Color(0x25604F),
    new THREE.Color(0x4A7C59),
    new THREE.Color(0x8DB580),
    new THREE.Color(0xB8956A),
    new THREE.Color(0x7C5E4C),
    new THREE.Color(0xE0D8CC),
  ],
  topographic: [
    new THREE.Color(0xD4EDDA),
    new THREE.Color(0xA8D8B9),
    new THREE.Color(0x7BC898),
    new THREE.Color(0x5CB85C),
    new THREE.Color(0x3E8E41),
    new THREE.Color(0x2D6A2D),
    new THREE.Color(0x1B4D1B),
  ],
}

export function createTerrainMaterial(options = {}) {
  const {
    terrainScale = 1.0,
    showContours = true,
    contourInterval = 50,
    showHillshade = true,
    colorScheme = 'natural',
    showOverlay = true,
    overlayOpacity = 0.85,
  } = options

  const stops = GRADIENT_SCHEMES[colorScheme] || GRADIENT_SCHEMES.natural

  return new THREE.ShaderMaterial({
    uniforms: {
      heightMap: { value: null },
      heightMapSize: { value: new THREE.Vector2(1, 1) },
      terrainScale: { value: terrainScale },
      gradientColor: { value: stops[0] },
      gradientColor1: { value: stops[1] },
      gradientColor2: { value: stops[2] },
      gradientColor3: { value: stops[3] },
      gradientColor4: { value: stops[4] },
      gradientColor5: { value: stops[5] },
      gradientColor6: { value: stops[6] },
      minElevation: { value: 0 },
      maxElevation: { value: 1 },
      showContours: { value: showContours },
      contourInterval: { value: contourInterval },
      contourColor: { value: new THREE.Color(0xF59E0B) },
      showHillshade: { value: showHillshade },
      lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      overlayMap: { value: null },
      overlayOpacity: { value: overlayOpacity },
      showOverlay: { value: showOverlay },
      overlayUvOffset: { value: new THREE.Vector2(0, 0) },
      overlayUvScale: { value: new THREE.Vector2(1, 1) },
      overlayAligned: { value: false },
    },
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    side: THREE.DoubleSide,
  })
}

export function createGridHelper(size, divisions, color) {
  const gridHelper = new THREE.GridHelper(size, divisions, color, color)
  gridHelper.material.opacity = 0.3
  gridHelper.material.transparent = true
  return gridHelper
}

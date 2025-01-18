import * as THREE from "three";

// Create a texture atlas loader
const loadTextureAtlas = async (imageCount) => {
  const loader = new THREE.TextureLoader();
  // Determine atlas dimensions based on your image count
  const atlasWidth = 1000; // Adjust based on your needs
  const atlasHeight = 1000;
  const imagesPerRow = Math.floor(atlasWidth / 125); // Assuming each image is 125x125

  // Create a canvas for the atlas
  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext("2d");

  // Load all images and draw them to the atlas
  const imagePromises = Array.from(
    { length: imageCount },
    (_, i) =>
      new Promise((resolve) => {
        loader.load(
          `assets/image_ultra-compress-HOME/${i + 2}.webp`,
          (texture) => {
            const img = texture.image;
            const x = (i % imagesPerRow) * 125;
            const y = Math.floor(i / imagesPerRow) * 125;
            ctx.drawImage(img, x, y, 125, 125);
            resolve();
          },
          undefined,
          resolve
        );
      })
  );

  await Promise.all(imagePromises);
  const atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  return { texture: atlasTexture, width: atlasWidth, height: atlasHeight };
};

// Modified setup function
async function setupInstanced() {
  //finto setup che avvia three

  // three
  scene = new THREE.Scene();
  // scene.background = new THREE.Color().setHex(0xffffff);

  camera = new THREE.OrthographicCamera(
    canvasW / -2,
    canvasW / 2,
    canvasH / 2,
    canvasH / -2,
    1,
    1000
  );
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvasW, canvasH);
  document.body.appendChild(renderer.domElement);

  // TITOLONE
  // Measure text bounds
  bounds1 = font.textBounds("Handling", 0, 0, fontSize);
  bounds2 = font.textBounds("Parakeets", 0, 0, fontSize);

  let randomPoints = [];

  for (let i = 0; i < 30; i++) {
    randomPoints.push({
      x: random(-canvasW / 2, canvasW / 2),
      y: random(-canvasH / 2, canvasH / 2),
      z: 0,
    });
  }
  // console.log(randomPoints);
  // Create scene, camera, renderer as before
  const atlas = await loadTextureAtlas(885);
  const points = [
    ...font.textToPoints("Handling", -bounds1.w / 2, -bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
    ...font.textToPoints("Parakeets", -bounds2.w / 2, bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
    ...randomPoints,
  ];

  // Create instanced geometry
  const baseGeometry = new THREE.PlaneGeometry(15, 15); // Base size
  const instancedMesh = new THREE.InstancedMesh(
    baseGeometry,
    new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas.texture },
        time: { value: 0 },
      },
      vertexShader: `
        attribute vec2 uvOffset;
        attribute vec3 instancePosition;
        attribute float instanceSize;
        
        varying vec2 vUv;
        
        void main() {
          vUv = uv * vec2(125.0 / ${atlas.width.toFixed(
            1
          )}, 125.0 / ${atlas.height.toFixed(1)}) + uvOffset;
          
          vec3 pos = position * instanceSize;
          vec4 mvPosition = modelViewMatrix * vec4(pos + instancePosition, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D atlas;
        varying vec2 vUv;
        
        void main() {
          vec4 texColor = texture2D(atlas, vUv);
          if (texColor.a < 0.1) discard;
          gl_FragColor = texColor;
        }
      `,
      transparent: true,
    }),
    points.length
  );

  // Create attributes for instance data
  const uvOffsets = new Float32Array(points.length * 2);
  const positions = new Float32Array(points.length * 3);
  const sizes = new Float32Array(points.length);

  points.forEach((p, i) => {
    // Calculate UV offset for this instance
    const imageIndex = i < 885 ? i : Math.floor(Math.random() * 885);
    const imagesPerRow = Math.floor(atlas.width / 125);
    const u = (imageIndex % imagesPerRow) / imagesPerRow;
    const v =
      Math.floor(imageIndex / imagesPerRow) / Math.floor(885 / imagesPerRow);
    uvOffsets[i * 2] = u;
    uvOffsets[i * 2 + 1] = v;

    // Set position
    const coords = screenToScene(camera, [
      p.x + canvasW / 2,
      p.y + canvasH / 2,
    ]);
    positions[i * 3] = coords.x;
    positions[i * 3 + 1] = coords.y;
    positions[i * 3 + 2] = 0;

    // Set size
    sizes[i] = random(0.8, 1.2); // Random scaling factor
  });

  // Add attributes to geometry
  instancedMesh.geometry.setAttribute(
    "uvOffset",
    new THREE.InstancedBufferAttribute(uvOffsets, 2)
  );
  instancedMesh.geometry.setAttribute(
    "instancePosition",
    new THREE.InstancedBufferAttribute(positions, 3)
  );
  instancedMesh.geometry.setAttribute(
    "instanceSize",
    new THREE.InstancedBufferAttribute(sizes, 1)
  );

  scene.add(instancedMesh);

  return instancedMesh;
}

// Modified draw function
function drawInstanced(instancedMesh, time) {
  if (!scene || !camera || !renderer) return;

  // Update time uniform
  instancedMesh.material.uniforms.time.value = time;

  // Update positions based on noise and cursor
  const positions = instancedMesh.geometry.attributes.instancePosition;
  const originalPositions = positions.array.slice(); // Store original positions

  for (let i = 0; i < positions.count; i++) {
    const idx = i * 3;

    // Apply noise-based movement
    const xOffset = map(
      noise(i, time * 0.5) * 0.4 + noise(i + 200, time * 0.01) * 0.4,
      0,
      1,
      -25,
      25
    );
    const yOffset = map(
      noise(i, (time + 100) * 0.7) * 0.4 + noise(i + 400, time * 0.01) * 0.4,
      0,
      1,
      -25,
      25
    );

    positions.array[idx] = originalPositions[idx] + xOffset;
    positions.array[idx + 1] = originalPositions[idx + 1] + yOffset;

    // Apply cursor repulsion if needed
    if (detectCursor) {
      const sceneCursor = screenToScene(camera, [
        detectCursor.x,
        detectCursor.y,
      ]);
      const distance = Math.hypot(
        positions.array[idx] - sceneCursor.x,
        positions.array[idx + 1] - sceneCursor.y
      );

      const repulsionRadius = 30;
      if (distance < repulsionRadius) {
        const repulsionForce = (1 - distance / repulsionRadius) ** 2 * 50;
        const angle = Math.atan2(
          positions.array[idx + 1] - sceneCursor.y,
          positions.array[idx] - sceneCursor.x
        );
        positions.array[idx] += Math.cos(angle) * repulsionForce;
        positions.array[idx + 1] += Math.sin(angle) * repulsionForce;
      }
    }
  }

  positions.needsUpdate = true;
  renderer.render(scene, camera);
}

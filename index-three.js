import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  cursor as detectCursor,
  canvasW,
  canvasH,
  video,
} from "./detect-three.js";

import { random, screenToScene } from "./utils.js";

import * as THREE from "three";
// THREE
let scene, camera, renderer;

// TITOLONE
let font;
let time = 0;

let points = [];
const fontSize = 250;
const sampleFactor = 0.175;

let bounds1, bounds2;

// loading
let loading = document.getElementById("loading");
let fakeCursor = document.getElementById("wave");

// atlas
const atlas = {
  texture: undefined,
  width: 0,
  height: 0,
};
let instancedMesh;

const radius = 15;
const planesCount = 2500;
const imagesCount = 885;

const squareSize = 125; //dimensione delle immagini nell'atlas
const imagesPerRow = 30;

let uvOffsets;

////////////////////////////////////////////////////////////////////

window.setup = async () => {
  //setup di p5 - che chiama il finto preload e il finto setup
  await preload();
  setup();
};

async function preload() {
  font = await loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf");

  const { texture, width, height } = await loadTextureAtlas(imagesCount);

  atlas.texture = texture;
  atlas.width = width;
  atlas.height = height;

  await detectPreload();
}

async function loadTextureAtlas(imageCount) {
  const loader = new THREE.TextureLoader();

  const atlasWidth = imagesPerRow * squareSize; // Adjust based on your needs
  const atlasHeight = imagesPerRow * squareSize;

  // CREO L'ATLAS
  // const canvas = document.createElement("canvas");
  // canvas.classList.add("hidden");
  // canvas.width = atlasWidth;
  // canvas.height = atlasHeight;
  // const ctx = canvas.getContext("2d");

  // const imagePromises = Array.from(
  //   { length: imageCount },
  //   (_, i) =>
  //     new Promise((resolve) => {
  //       loader.load(
  //         `assets/image_ultra-compress/${i + 2}.webp`,
  //         (texture) => {
  //           const img = texture.image;
  //           const x = (i % imagesPerRow) * 125 + 1;
  //           const y = Math.floor(i / imagesPerRow) * 125 + 1;
  //           ctx.drawImage(img, x, y, 123, 123);
  //           resolve();
  //         },
  //         undefined,
  //         (error) => {
  //           // Create a temporary canvas for the white image
  //           const tempCanvas = document.createElement("canvas");
  //           tempCanvas.width = 123;
  //           tempCanvas.height = 123;
  //           const tempCtx = tempCanvas.getContext("2d");

  //           // Fill it with white
  //           tempCtx.fillStyle = "white";
  //           tempCtx.fillRect(0, 0, 123, 123);

  //           // Draw the white square in the correct position
  //           const x = (i % imagesPerRow) * 125 + 1;
  //           const y = Math.floor(i / imagesPerRow) * 125 + 1;
  //           ctx.drawImage(tempCanvas, x, y);

  //           console.warn(`Failed to load image ${i + 2}: ${error}`);
  //           resolve();
  //         }
  //       );
  //     })
  // );

  // await Promise.all(imagePromises);

  // let link = document.createElement("a");
  // link.setAttribute("download", "atlas.png");
  // link.setAttribute(
  //   "href",
  //   canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  // );
  // link.click();

  const atlasTexture = loader.load("assets/atlas.png");
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  return { texture: atlasTexture, width: atlasWidth, height: atlasHeight };
}

// SETUP
function setup() {
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

  // altri punti sparsi nello schermo
  let randomPoints = [];
  for (let i = 0; i < 30; i++) {
    randomPoints.push({
      x: random(-canvasW / 2, canvasW / 2),
      y: random(-canvasH / 2, canvasH / 2),
      z: 0,
    });
  }

  //array con le coordinate di tutto
  points = [
    ...font.textToPoints("Handling", -bounds1.w / 2, -bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
    ...font.textToPoints("Parakeets", -bounds2.w / 2, bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
    ...randomPoints,
  ];

  points = points.map((p) => ({
    position: p,
  }));

  const instanceGeometry = new THREE.PlaneGeometry(radius, radius);
  const instanceMaterial = new THREE.MeshBasicMaterial({
    map: atlas.texture,
    transparent: true,
  });

  uvOffsets = new Float32Array(points.length * 2); // Store UV offsets for each plane

  instancedMesh = new THREE.InstancedMesh(
    instanceGeometry,
    instanceMaterial,
    points.length
  );

  const vector = new THREE.Vector3();
  let matrix = new THREE.Matrix4();

  points.forEach((p, i) => {
    let coords = screenToScene(camera, [
      p.position.x + canvasW / 2,
      p.position.y + canvasH / 2,
    ]);
    coords = new THREE.Vector3(coords.x, coords.y, 0);

    p.position = coords;
    p.origin = coords.clone();
    p.targetPosition = coords.clone();
    p.velocity = vector;

    matrix.setPosition(coords);

    instancedMesh.setMatrixAt(i, matrix);

    const index = i > imagesCount ? round(random(885)) : i;

    // Calculate UV offsets based on the atlas grid
    const atlasX = index % imagesPerRow; // Position in the 30x30 grid
    const atlasY = imagesPerRow - 1 - Math.floor(index / imagesPerRow);

    // Each cell is 125px in a texture that's (125 * 30)px wide/high
    uvOffsets[i * 2] = atlasX / imagesPerRow; // U coordinate
    uvOffsets[i * 2 + 1] = atlasY / imagesPerRow; // V coordinate
  });

  instancedMesh.geometry.setAttribute(
    "uvOffset",
    new THREE.InstancedBufferAttribute(uvOffsets, 2)
  );

  instancedMesh.material.onBeforeCompile = (shader) => {
    console.log("Modifying shader...");
    shader.vertexShader = `
            attribute vec2 uvOffset;
            varying vec2 vUv;

            ${shader.vertexShader}
        `.replace(
      "#include <uv_vertex>",
      `
            float uvPaddingX = 5.0 / ${atlas.width.toFixed(1)};
            float uvPaddingY = 5.0 / ${atlas.height.toFixed(1)};
            
            vUv = uvOffset + uv * vec2(118.0 / ${atlas.width.toFixed(
              1
            )}, 118.0 / ${atlas.height.toFixed(
        1
      )}) + vec2(uvPaddingX, uvPaddingY);
            `
    );

    shader.fragmentShader = `
            varying vec2 vUv;

            ${shader.fragmentShader}
        `.replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
                vec4 texColor = texture2D(map, vUv);
                
                diffuseColor = texColor;
            #endif`
    );
    console.log("Shader modified successfully.");
  };

  scene.add(instancedMesh);

  loading.style.display = "none"; //nascondo il loading
  detectSetup();
  video ? (video.style.display = "none") : null;
  renderer.render(scene, camera);
}

window.draw = () => {
  draw();
};

function draw() {
  if (!scene || !camera || !renderer) return;

  if (!detectCursor) {
    fakeCursor.style.display = "block";
    fakeCursor.style.top = (3 / 4) * windowHeight;
    fakeCursor.style.left = (3 / 4) * windowWidth;
    fakeCursor.style.animation = "wave 3s infinite";
  } else {
    fakeCursor.style.display = "none";
  }

  time += 0.01;

  let sceneCursor = screenToScene(camera, [detectCursor?.x, detectCursor?.y]);
  let cursorVec = new THREE.Vector3();
  let matrix = new THREE.Matrix4();

  points.forEach((p, i) => {
    // Calculate noise-based movement
    let xOffset = map(
      noise(i, time * 0.5) * 0.4 + noise(i + 200, time * 0.01) * 0.4,
      0,
      1,
      -25,
      25
    );
    let yOffset = map(
      noise(i, (time + 100) * 0.7) * 0.4 + noise(i + 400, time * 0.01) * 0.4,
      0,
      1,
      -25,
      25
    );

    // Vector math for cursor distance
    cursorVec.set(
      detectCursor ? sceneCursor.x : p.origin.x,
      detectCursor ? sceneCursor.y : p.origin.y,
      0
    );

    const distance = cursorVec.distanceTo(p.position);

    p.targetPosition.set(p.origin.x + xOffset, p.origin.y + yOffset, 0);

    // Mouse repulsion
    const repulsionRadius = radius * 4;

    if (detectCursor && distance < repulsionRadius) {
      const repulsionForce = (1 - distance / repulsionRadius) * 2 * radius * 10;
      const angle = Math.atan2(
        p.position.y - sceneCursor.y,
        p.position.x - sceneCursor.x
      );
      p.targetPosition.x += Math.cos(angle) * repulsionForce;
      p.targetPosition.y += Math.sin(angle) * repulsionForce;
      p.targetPosition.x += xOffset;
      p.targetPosition.y += yOffset;
    }

    // Smooth movement
    const easing = 0.05;

    p.position.set(
      p.position.x + (p.targetPosition.x - p.position.x) * easing,
      p.position.y + (p.targetPosition.y - p.position.y) * easing,
      0
    );

    matrix.setPosition(p.position);
    instancedMesh.setMatrixAt(i, matrix);

    instancedMesh.instanceMatrix.needsUpdate = true;
  });

  renderer.render(scene, camera);

  detectDraw(false, true);
}

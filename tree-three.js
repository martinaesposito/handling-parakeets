import * as THREE from "three";
import { sceneToScreen, screenToScene } from "./utils.js";
import { Dot } from "./listings-three.js";
import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  selectedPose,
  video,
  videoSize,
} from "./detect-three.js";

let branchPositions = [];

let loading = document.getElementById("loading");
let handLegend = document.getElementById("hands-legend");
let container = document.querySelector(".container");
let tutorial = document.getElementById("tutorial");
// warning
export let warning = document.getElementById("warning");
export let endCounter = document.getElementById("endCounter");
let imgLoading = document.getElementById("loading-img");
// progressbar
let progressBar = document.getElementById("progress");

if (imgLoading) {
  imgLoading.src =
    "assets/loading/" + Math.floor(Math.random() * 8 + 1).toString() + ".gif";
}

window.setup = () => {
  start();
};
window.draw = () => {
  draw();
};
//P5
export let scene;
let p5, canvas, renderer, camera;
let canvasReady = false;

//BRANCHES
let branchesss = [];
let plat;
let platforms = [];
export let canvasW, canvasH;

const branchPlatform = [
  { value: 149, start: 0.6, end: 0.63, name: "usato.it" },
  { value: 14, start: 0.6, end: 0.8, name: "TrovaPet" },
  { value: 3, start: 0.9, end: 1, name: "petpappagalli" },
  { value: 44, start: 0.6, end: 0.65, name: "Telegram" },
  { value: 7, start: 0.9, end: 1, name: "animalissimo" },
  { value: 12, start: 0.6, end: 0.7, name: "Trovalosubito" },
  { value: 11, start: 0.9, end: 1, name: "likesx" },
  { value: 149, start: 0.8, end: 0.85, name: "FB pages" },
  { value: 10, start: 0.6, end: 0.7, name: "Secondamano" },
  { value: 18, start: 0.9, end: 1, name: "AnimaleAmico" },
  { value: 14, start: 0.4, end: 0.6, name: "FB marketplace" },
  { value: 177, start: 0.75, end: 0.85, name: "FB groups" },
  { value: 19, start: 0.9, end: 1, name: "AAAnnunci" },
  { value: 11, start: 0.33, end: 0.36, name: "trovacuccioli" },
  { value: 3, start: 0.65, end: 0.7, name: "petfocus" },
  { value: 94, start: 0.9, end: 0.95, name: "Clasf.it" },
];

const handPoses = [
  "FingerPerch",
  "Grip",
  "HalfClosed",
  "Open",
  "Relaxed",
  "Shell",
  "TouchingTips",
];

let imageMap = {}; // Map images by their filename

export let tutorialEnd = tutorial ? false : undefined;
// tutorialEnd = true;
// RIMUOVERE, PER TESTING
// console.log(tutorialEnd, tutorial);

if (tutorial) {
  tutorial.addEventListener("play", () => {
    const duration = tutorial.duration + "s";
    progressBar.style.animation = "pippo " + duration + " linear forwards";
  });

  tutorial.addEventListener("ended", () => {
    tutorial.style.animation = "disappear 0.5s forwards";
    progressBar.style.animation = "disappear 0.5s forwards";
    tutorialEnd = true;
  });
}

let dots = [];
let listingsDataReady = false;

export let z = 800;
let targetZ = 800;

// sound
export let playing = false;

// story divs
let storyIntro;

//stories
let stories;

async function preload() {
  // const imagePromises = [];

  // for (let i = 2; i < 887; i++) {
  //   const imagePromise = new Promise((resolve) => {
  //     loadImage(
  //       `assets/image_ultra-compress/${i}.webp`,
  //       (img) => {
  //         imageMap[Number(i)] = img; // Store with numeric keys
  //         resolve();
  //       },
  //       (e) => {
  //         resolve(); // Resolve even if the image fails
  //       }
  //     );
  //   });
  //   imagePromises.push(imagePromise);
  // }

  // await Promise.all(imagePromises);

  // prendo tutti i listings dal json
  try {
    const response = await fetch("json/listings.json"); //carico tutti i listings
    const jsonData = await response.json();

    window.listingsData = branchPlatform.map((config) => ({
      ...config, //crea un array che a partire dai dati originali di config aggiunge the number of items in jsonData matching the platform
      //se non viene trovato prende il valore di elementi di config
      value:
        jsonData.filter((item) => item.Platform === config.name).length ||
        config.value,
      items: jsonData.filter((item) => item.Platform === config.name),
    }));

    listingsDataReady = true;
  } catch (error) {
    // If it fails, create a fallback listingsData that uses original branch configuration but with empty items
    console.error("Failed to load listings data", error);
    window.listingsData = branchPlatform.map((config) => ({
      ...config,
      items: [],
    }));
    listingsDataReady = true;
  }

  stories = fetch("./json/stories.json").then((response) => response.json());

  detectPreload();
}

function setup() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color().setHex(0xffffff);

  camera = new THREE.OrthographicCamera(
    canvasW / -2,
    canvasW / 2,
    canvasH / 2,
    canvasH / -2,
    1,
    1000
  );
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(canvasW, canvasH);
  document.body.appendChild(renderer.domElement);

  const totalDots = window.listingsData.reduce(
    (acc, { value }) => acc + value,
    0
  );
  const angles = window.listingsData.map(
    ({ value }) => Math.max(0.15, 2 * Math.PI * (value / totalDots)) //distribuisco i rami in maniera proporzionale rispetto al totale, imponendo un angolo minimo di 0.15
  );
  let total = 0;

  angles.forEach((a, index) => {
    const angle = total + a / 2 + (index > 0 ? angles[index - 1] / 2 : 0);

    const center = {
      x: canvasW / 2,
      y: canvasH / 2,
    };

    const bounds = {
      //punti di partenza e arrivo del ramo, calcolato a partire dal seno e coseno dell'angolo corrispondente
      start: {
        x: center.x,
        y: center.y,
      },
      end: {
        x: center.x + (canvasW / 2.2) * Math.cos(angle),
        y: center.y + (canvasH / 2.6) * Math.sin(angle),
      },
    };

    const branch = Object.fromEntries(
      // Convert bounds object to an array of array of (x, y)
      Object.entries(bounds).map(([key, value]) => [
        key,
        Object.fromEntries(
          Object.entries(value).map(([k, v]) => [
            k,
            map(
              window.listingsData[index][key], //and then map the value from listingsData (expressed in 0,1) for the specific branch/key (start/end)
              0,
              1,
              bounds.start[k],
              bounds.end[k]
            ),
          ])
        ),
      ])
    );
    total = angle;
    branchesss.push({ bounds, ...branch, angleWidth: a });
  });

  dots = generateBranchDots(branchesss);

  canvasReady = true;

  detectSetup();
  // loading.style.display = "none"; //nascondo il loading

  // const tests = [
  //   [0, 0],
  //   [canvasW / 2, canvasH / 2],
  //   [canvasW, canvasH],
  // ];

  // tests.forEach((test) => {
  //   const coords = screenToScene(camera, test);

  //   const geometry = new THREE.PlaneGeometry(100, 100);
  //   const material = new THREE.MeshBasicMaterial({ color: 0xff00 });
  //   const mesh = new THREE.Mesh(geometry, material);
  //   mesh.position.set(coords.x, coords.y, coords.z);
  //   console.log(coords);

  //   scene.add(mesh);
  // });

  branchPlatform.forEach((branch, index) => {
    plat = createDiv();
    plat.class("platform");
    plat.html(`${branch.name} [${branch.value}] `);
    plat.id(branch.name);
    platforms.push(plat);
  });
}

function draw() {
  if (!scene || !camera || !renderer) return;

  // targetZ = selectedPose ? 25 : 50;
  // z += (targetZ - z) * 0.1;
  // if (canvasReady) {
  //   camera(0, 0, z); // Adjust z as needed
  // }

  dots.forEach((dot) => {
    dot.move(dots, undefined, z); // Single iteration per frame for smooth animation
    // dot.draw(undefined); //passo l'immagine corrispondente
  });

  detectDraw();

  renderer.render(scene, camera);
}

async function start() {
  await preload();
  setup();
}

// start();

function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];
    const items = window.listingsData[bIndex].items;

    const branchAngle = Math.atan2(
      branch.bounds.end.y - branch.bounds.start.y,
      branch.bounds.end.x - branch.bounds.start.x
    );
    const perpAngle = branchAngle + Math.PI / 2;

    // Generate a single t value for this entire branch
    const branchT = random(
      branchPlatform[bIndex].start,
      branchPlatform[bIndex].end
    );

    // Base position along the branch (no offset)
    const baseX = lerp(branch.bounds.start.x, branch.bounds.end.x, branchT);
    const baseY = lerp(branch.bounds.start.y, branch.bounds.end.y, branchT);

    const sceneBasePos = screenToScene(camera, [baseX, baseY]);

    // Final position with perpendicular offset
    const offset = randomGaussian() * 50;
    const commonX = baseX + Math.cos(perpAngle) * offset;
    const commonY = baseY + Math.sin(perpAngle) * offset;

    const sceneCommonPos = screenToScene(camera, [commonX, commonY]);

    // Store the final position in branchPositions
    branchPositions.push({ x: sceneBasePos.x, y: sceneBasePos.y });

    // Create dots
    items.forEach((item, i) => {
      const dot = new Dot(
        { ...branch, index: bIndex, branchT },
        allDots.length + branchDots.length,
        random(10, 15),
        item,
        imageMap[item.Image_num],
        { x: sceneBasePos.x, y: sceneBasePos.y }, // Base position
        { x: sceneCommonPos.x, y: sceneCommonPos.y } // Final position
      );
      branchDots.push(dot);

      scene.add(dot.mesh);
    });

    allDots.push(...branchDots);
  });
  return allDots;
}

export function isPlaying() {
  playing = true;
}

export function hasPlayed() {
  playing = false;
}

import * as THREE from "three";
import { Dot } from "./listings-three.js";
import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  selectedPose,
  videoExists,
} from "./detect-three.js";

// HTMLS
let insCenter = document.getElementById("ins-centr");
let handLegend = document.getElementById("hands-legend");

// warning
let warning = document.getElementById("warning");
let endCounter = document.getElementById("endCounter");

// loading
let loading = document.getElementById("loading");
let imgLoading = document.getElementById("loading-img");
if (imgLoading) {
  imgLoading.src =
    "assets/loading/" + Math.floor(Math.random() * 8 + 1).toString() + ".gif";
}

// TUTORIAL
let tutorial = document.getElementById("tutorial");
// tutorialEnd = true; // RIMUOVERE, PER TESTING
let tutorialEnd = tutorial ? false : undefined;
// progressbar
let progressBar = document.getElementById("progress");
if (tutorial) {
  tutorial.addEventListener("play", () => {
    const duration = tutorial.duration + "s";
    console.log(duration);
    progressBar.style.animation = "pippo " + duration + " linear forwards";
  });

  tutorial.addEventListener("ended", () => {
    tutorial.style.animation = "disappear 0.5s forwards";
    progressBar.style.animation = "disappear 0.5s forwards";
    tutorialEnd = true;
  });
}

//BRANCHES
let dots = [];
let branchPositions = [];
let branchesss = [];
let platforms = [];
let plat;

const branchPlatform = [
  { value: 149, start: 0.6, end: 0.63, name: "usato.it" },
  { value: 14, start: 0.6, end: 0.8, name: "TrovaPet" },
  { value: 3, start: 0.95, end: 1, name: "petpappagalli" },
  { value: 44, start: 0.6, end: 0.65, name: "Telegram" },
  { value: 7, start: 0.95, end: 1, name: "animalissimo" },
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

let listingsData;
let imageMap = {}; // Map images by their filename

// STORIES
let storyIntro, stories;
// sound
let audioPlaying = false;

// THREE
let scene, camera, renderer;
let canvasW, canvasH;

let zoom = 1;
let targetZoom;

function toggleAudio() {
  audioPlaying = audioPlaying ? false : true;
}

// esporto tutto
export {
  zoom,
  scene,
  camera,
  tutorialEnd,
  warning,
  endCounter,
  audioPlaying,
  toggleAudio,
};

////////////////////////////////////////////////////////////////////

window.setup = async () => {
  //setup di p5 - che chiama il finto preload e il finto setup
  await preload();
  setup();
};

async function preload() {
  // immagini
  const imagePromises = [];
  const loader = new THREE.TextureLoader();

  for (let i = 2; i < 887; i++) {
    const imagePromise = new Promise((resolve) => {
      loader.load(
        `assets/image_ultra-compress/${i}.webp`,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          imageMap[Number(i)] = texture; // Store with numeric keys
          resolve();
        },
        () => {},
        (e) => {
          resolve(); // Resolve even if the image fails
        }
      );
    });
    imagePromises.push(imagePromise);
  }

  await Promise.all(imagePromises);

  // prendo tutti i listings dal json
  try {
    const response = await fetch("json/listings.json"); //carico tutti i listings
    const jsonData = await response.json();

    listingsData = branchPlatform.map((config) => ({
      ...config, //crea un array che a partire dai dati originali di config aggiunge the number of items in jsonData matching the platform
      //se non viene trovato prende il valore di elementi di config
      value:
        jsonData.filter((item) => item.Platform === config.name).length ||
        config.value,
      items: jsonData.filter((item) => item.Platform === config.name),
    }));
  } catch (error) {
    // If it fails, create a fallback listingsData that uses original branch configuration but with empty items
    console.error("Failed to load listings data", error);
    listingsData = branchPlatform.map((config) => ({
      ...config,
      items: [],
    }));
  }

  stories = await fetch("./json/stories.json").then((response) =>
    response.json()
  );

  detectPreload(); // detect hand in detect.js
}

//finto setup che avvia three
function setup() {
  //legenda
  for (let i = 1; i < handPoses.length + 1; i++) {
    let hand = document.createElement("img");
    hand.src = "assets/legend/" + i + ".svg";
    hand.className = "hand";
    handLegend.appendChild(hand);
  }

  canvasW = window.innerWidth;
  canvasH = window.innerHeight;

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

  const totalDots = listingsData.reduce((acc, { value }) => acc + value, 0);
  const angles = listingsData.map(
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
              listingsData[index][key], //and then map the value from listingsData (expressed in 0,1) for the specific branch/key (start/end)
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

  detectSetup();

  // branchPlatform.forEach((branch, index) => {
  //   plat = createDiv();
  //   plat.class("platform");
  //   plat.html(`${branch.name} [${branch.value}] `);
  //   plat.id(branch.name);
  //   platforms.push(plat);
  // });

  // intro storyContainer
  storyIntro = createDiv();
  storyIntro.style("display", "none");
  storyIntro.addClass("introcontainer flex-column");
}

//
window.draw = () => {
  draw();
};
function draw() {
  if (!scene || !camera || !renderer) return;

  if (videoExists) {
    loading.style.display = "none"; //nascondo il loading
  }

  targetZoom = selectedPose ? 1.8 : 1;
  zoom += (targetZoom - zoom) * 0.1;

  if (abs(targetZoom - zoom) > 0.01) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }

  // nomi delle platform
  // if (branchPositions.length > 0) {
  //   branchesss.forEach((e, index) => {
  //     platforms[index].position(
  //       canvasW / 2 +
  //         (branchPositions[index].x - canvasW / 2) * zoom * zoom -
  //         platforms[index].width / 2,
  //       canvasH / 2 +
  //         (branchPositions[index].y - canvasH / 2) * zoom * zoom -
  //         platforms[index].height / 2
  //     );

  //     selectedPose
  //       ? platforms[index].style("animation", "disappear 3s forwards")
  //       : platforms[index].style("animation", "appear 3s forwards");
  //   });
  // }

  dots.forEach((dot) => {
    dot.move(dots, selectedPose);
    dot.draw(selectedPose);
  });

  if (selectedPose) {
    changeStory(stories.findIndex((s) => s.Pose == selectedPose)); //gli passo l'indice della storia giusta
  } else {
    storyIntro.style("display", "none");
    insCenter.style.display = "flex";
  }

  detectDraw();

  renderer.render(scene, camera);
}

function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];
    const items = listingsData[bIndex].items;

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

    // Final position with perpendicular offset
    const offset = randomGaussian() * 50;
    const commonX = baseX + Math.cos(perpAngle) * offset;
    const commonY = baseY + Math.sin(perpAngle) * offset;

    // Store the final position in branchPositions
    branchPositions.push({ x: baseX, y: baseY });

    // Create dots
    items.forEach((item, i) => {
      const dot = new Dot(
        { ...branch, index: bIndex, branchT },
        allDots.length + branchDots.length,
        random(12.5, 17.5),
        item,
        imageMap[item.Image_num],
        { x: baseX, y: baseY }, // Base position
        { x: commonX, y: commonY } // Final position
      );
      branchDots.push(dot);

      scene.add(dot.mesh);
    });

    allDots.push(...branchDots);
  });
  return allDots;
}

function changeStory(indexStory) {
  let intro = stories[indexStory];
  storyIntro.html(
    "<img id='img-introS' src='assets/cursor/" +
      (indexStory + 1) +
      ".svg'> <div class='overlaybox' id='title'>" +
      intro.TitleIta +
      "</br><span class='eng'>" +
      intro.TitleEng +
      "</span></div><div class='overlaybox intro gap'>" +
      intro.DescriptionIta +
      "</br><span class='eng'>" +
      intro.DescriptionEng +
      "</span></div>"
  );

  storyIntro.style("display", "flex");
  insCenter.style.display = "none";
}

import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  selectedPose,
  video,
  videoSize,
} from "./detect.js";

//LOADING
let loading = document.getElementById("loading");
let imgLoading = (document.getElementById("loading-img").src =
  "assets/loading/" + Math.floor(Math.random() * 8 + 1).toString() + ".gif");

//LEGEND
let handLegend = document.getElementById("hands-legend");

//P5
let p5, canvas, font;
let container = document.querySelector(".container");
let bg = "#F5F5F5";
let canvasReady = false;

//BRANCHES
let branchesss = [];

const branchPlatform = [
  { value: 149, start: 0.3, end: 0.7, name: "usato.it" },
  { value: 14, start: 0.6, end: 0.8, name: "TrovaPet" },
  { value: 3, start: 0.9, end: 1, name: "petpappagalli" },
  { value: 44, start: 0.6, end: 0.65, name: "Telegram" },
  { value: 7, start: 0.9, end: 1, name: "animalissimo" },
  { value: 12, start: 0.6, end: 0.7, name: "Trovalosubito" },
  { value: 11, start: 0.85, end: 0.9, name: "likesx" },
  { value: 149, start: 0.6, end: 0.9, name: "FB pages" },
  { value: 10, start: 0.6, end: 0.7, name: "Secondamano" },
  { value: 18, start: 0.9, end: 1, name: "AnimaleAmico" },
  { value: 14, start: 0.4, end: 0.6, name: "FB marketplace" },
  { value: 177, start: 0.7, end: 0.9, name: "FB groups" },
  { value: 19, start: 0.8, end: 0.9, name: "AAAnnunci" },
  { value: 11, start: 0.5, end: 0.6, name: "trovacuccioli" },
  { value: 3, start: 0.9, end: 1, name: "petfocus" },
  { value: 94, start: 0.9, end: 1, name: "Clasf.it" },
];

let pose;
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

let tutorial = document.getElementById("tutorial");
tutorial?.addEventListener("ended", () => {
  tutorial.classList.remove("show");
});

let dots = [];
import { Dot } from "./listings.js";
let listingsDataReady = false;

export let z = 800;
let targetZ = 800;

// sound
export let playing = false;

////////////////////////////////////////////////////////////////

///PRELOAD
window.preload = async () => {
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"); //font

  const imagePromises = [];

  for (let i = 2; i < 887; i++) {
    const imagePromise = new Promise((resolve) => {
      const img = loadImage(
        `assets/immagini/${i}.png`,
        () => {
          imageMap[Number(i)] = img; // Store with numeric keys
          resolve();
        },
        () => {
          console.warn(`Failed to load image: ${i}.png`);
          resolve(); // Resolve even if the image fails
        }
      );
    });
    imagePromises.push(imagePromise);
  }

  await Promise.all(imagePromises);
  // console.log("Loaded image keys:", Object.keys(imageMap).map(Number));
  // console.log(imageMap); //controllo che ci siano tutte e che siano corrette

  ///
  // prendo tutti i listings dal json
  try {
    const response = await fetch("listings.json"); //carico tutti i listings
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

  detectPreload();
};

//SETUP
window.setup = async () => {
  if (!listingsDataReady) {
    //aspetta il json e continua a cercare di disegnare la funzione finchè non è pronto
    setTimeout(window.setup, 10);
    return;
  }

  //legenda
  for (let i = 1; i < handPoses.length; i++) {
    let hand = document.createElement("img");
    hand.src = "assets/legend/" + i + ".svg";
    hand.className = "hand";
    handLegend.appendChild(hand);
  }

  //disegno la canvas
  p5 = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  rectMode(CENTER);
  imageMode(CENTER);

  canvas = p5.canvas;
  container.appendChild(canvas);
  textFont(font);

  // ANGLES
  const totalDots = window.listingsData.reduce(
    (acc, { value }) => acc + value,
    0
  );
  const angles = window.listingsData.map(
    ({ value }) => Math.max(0.15, 2 * PI * (value / totalDots)) //distribuisco i rami in maniera proporzionale rispetto al totale, imponendo un angolo minimo di 0.15
  );
  let total = 0;

  angles.forEach((a, index) => {
    const angle = total + a / 2 + (index > 0 ? angles[index - 1] / 2 : 0);

    const bounds = {
      //punti di partenza e arrivo del ramo, calcolato a partire dal seno e coseno dell'angolo corrispondente
      start: {
        x: 0,
        y: 0,
      },
      end: {
        x: 0 + (width / 2.4) * cos(angle),
        y: 0 + (height / 2.7) * sin(angle),
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

  textFont(font);

  detectSetup();
  loading.style.display = "none"; //nascondo il loading
};

///DRAW
window.draw = () => {
  // background(bg);
  clear();
  targetZ = selectedPose ? 450 : 800;

  branchesss.forEach(({ bounds: { start, end } }, index) => {
    // stroke("lightgray");
    // strokeWeight(1);
    // line(start.x, start.y, end.x, end.y);
    // console.log(branchPlatform[index].start);
    noStroke();
    fill("black");
    text(
      `${window.listingsData[index].name} [${branchPlatform[index].value}] `,
      end.x,
      end.y
    );
  });

  z += (targetZ - z) * 0.1;
  if (canvasReady) {
    camera(0, 0, z); // Adjust z as needed
  }

  // Update and draw dots
  dots.forEach((dot, index) => {
    dot.move(dots, selectedPose, z); // Single iteration per frame for smooth animation
    dot.draw(); //passo l'immagine corrispondente
  });

  let cH = height / 4.5;
  let cW = (cH / 3) * 4;

  if (selectedPose) {
    textAlign(CENTER);
    fill("black");
    text(selectedPose, 0, cH / 2 + cH / 10);
  }

  push();
  if (video && videoSize) {
    scale(-1, 1); //rifletto il video in modo da vederlo correttamente
    stroke("black");
    noFill();
    // translate(0, 0, 10);
    strokeWeight(2);
    image(video, 0, 0, videoSize.w, videoSize.h);

    rect(0, 0, videoSize.w, videoSize.h); //disegno un rettangolo in modo che abbia il bordo
    pop();
  }
  translate(0, 0, 1);
  detectDraw();
};

function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];
    const items = window.listingsData[bIndex].items;

    items.forEach((item, i) => {
      const dot = new Dot(
        { ...branch, index: bIndex },
        allDots.length + branchDots.length,
        random(12.5, 15),
        item, // Pass the full item data
        imageMap
      );
      branchDots.push(dot);
    });

    allDots.push(...branchDots);
  });
  return allDots;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function isPlaying() {
  playing = true;
}

export function hasPlayed() {
  playing = false;
}

import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  selectedPose,
  video,
  videoSize,
} from "./detect.js";

let branchPositions = [];

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

let plat;
let platforms = [];

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
export let tutorialEnd = tutorial ? false : undefined;

// tutorialEnd = true; // RIMUOVERE, PER TESTING

tutorial?.addEventListener("ended", () => {
  // tutorial.classList.remove("show");
  tutorial.style.animation = "disappear 0.5s forwards";
  tutorialEnd = true;
});

let dots = [];
import { Dot } from "./listings.js";
let listingsDataReady = false;

export let z = 800;
let targetZ = 800;

// sound
export let playing = false;

// story divs
let storyIntro;

// warning
export let warning = document.getElementById("warning");
export let endCounter = document.getElementById("endCounter");

//stories
let stories;

////////////////////////////////////////////////////////////////

///PRELOAD
window.preload = async () => {
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"); //font

  const imagePromises = [];

  for (let i = 2; i < 887; i++) {
    const imagePromise = new Promise((resolve) => {
      const img = loadImage(
        `assets/image-compress/${i}.webp`,
        () => {
          imageMap[Number(i)] = img; // Store with numeric keys
          resolve();
        },
        () => {
          console.warn(`Failed to load image: ${i}.webp`);
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

  stories = loadJSON("./json/stories.json", storiesJSON);

  detectPreload();
};

function storiesJSON() {
  for (let i = 0; i < Object.keys(stories).length; i++) {
    //console.log(stories[i]);
  }
}

//SETUP
window.setup = async () => {
  if (!listingsDataReady) {
    //aspetta il json e continua a cercare di disegnare la funzione finchè non è pronto
    setTimeout(window.setup, 10);
    return;
  }

  //legenda
  for (let i = 1; i < handPoses.length + 1; i++) {
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
        x: 0 + (width / 2.2) * cos(angle),
        y: 0 + (height / 2.6) * sin(angle),
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

  branchPlatform.forEach((branch, index) => {
    plat = createDiv();
    plat.class("platform");
    plat.html(`${branch.name} [${branch.value}] `);
    plat.id(branch.name);
    platforms.push(plat);
  });

  console.log(platforms);
};

///DRAW
window.draw = () => {
  // background(bg);
  clear();
  targetZ = selectedPose ? 450 : 800;
  if (branchPositions.length > 0) {
    branchesss.forEach(({ bounds: { start, end } }, index) => {
      //  disegno i rami
      // stroke("lightgray");
      // strokeWeight(1);
      // line(start.x, start.y, end.x, end.y);
      // disegno i div
      platforms[index].position(
        width / 2 +
          branchPositions[index].x * (800 / z) -
          platforms[index].width / 2,
        height / 2 +
          branchPositions[index].y * (800 / z) -
          platforms[index].height / 2
      );
      selectedPose
        ? platforms[index].style("animation", "disappear 1s forwards")
        : platforms[index].style("animation", "appear 1s forwards");
    });
  }

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

  // create and position the stories central description's container
  if (!storyIntro) {
    storyIntro = createDiv();
    storyIntro.style("display", "none");
    storyIntro.addClass("introcontainer flex-column");
  }

  if (selectedPose) {
    changeStory();
  } else {
    storyIntro.style("display", "none");

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
  }

  translate(0, 0, 1);
  detectDraw();
};

function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];
    const items = window.listingsData[bIndex].items;

    const branchAngle = atan2(
      branch.bounds.end.y - branch.bounds.start.y,
      branch.bounds.end.x - branch.bounds.start.x
    );
    const perpAngle = branchAngle + HALF_PI;

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
    const commonX = baseX + cos(perpAngle) * offset;
    const commonY = baseY + sin(perpAngle) * offset;

    // Store the final position in branchPositions
    branchPositions.push({ x: baseX, y: baseY });

    // Create dots
    items.forEach((item, i) => {
      const dot = new Dot(
        { ...branch, index: bIndex, branchT },
        allDots.length + branchDots.length,
        random(12.5, 15),
        item,
        imageMap,
        { x: baseX, y: baseY }, // Base position
        { x: commonX, y: commonY } // Final position
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

export function changeStory() {
  let intro;
  let n;
  let s;
  for (let i = 0; i < Object.keys(stories).length; i++) {
    if (stories[i].Pose == selectedPose) {
      intro = stories[i];
      s = i + 1;
    }
  }

  if (intro && !n) {
    storyIntro.html(
      //PROVA CON IMMAGINE IN ALTO
      // "<img src='/assets/cursor/" +
      // s +
      // ".svg' class='explore' > <div class='overlaybox' id='title'>" +
      // intro.TitleIta +
      // "</br><span class='eng'>" +
      // intro.TitleEng +
      // "</span></div><div class='overlaybox intro gap'>" +
      // intro.DescriptionIta +
      // "</br><span class='eng'>" +
      // intro.DescriptionEng +
      // "</span></div>"
      "<div class='overlaybox' id='title'>" +
        intro.TitleIta +
        "</br><span class='eng'>" +
        intro.TitleEng +
        "</span></div><div class='overlaybox intro gap'>" +
        intro.DescriptionIta +
        "</br><span class='eng'>" +
        intro.DescriptionEng +
        "</span></div>"
    );
    n = true;
  }

  storyIntro.style("display", "flex");
}

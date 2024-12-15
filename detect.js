import {
  ImageSegmenter,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { z, warning, endCounter, tutorialEnd } from "./tree.js";
import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker, imageSegmenter, labels;

let container = document.querySelector(".container");
let hands = [];

let handsData; //json

export let video;
export let videoSize;

const handPoses = [
  "FingerPerch",
  "Grip",
  "HalfClosed",
  "Open",
  "Relaxed",
  "Shell",
  "TouchingTips",
];

let counters = [
  0, //FingerPerch
  0, //grip
  0, //HalfClosed
  0, //open
  0, //relaxed
  0, //shell
  0, //TouchingTips
];

let restart = false;
let market = false;
let restartImg;
let treeImg;

let restartImgSrc;
let treeImgSrc;

let backtostart; // id: ins-2, button / div to go back to screensaver
let backtotree; // id: ins-1, button / div to go back to stories

let leftgradient; // that one that may need to be toggled

let escapeCounters = [
  0, // from Tree when inactivity
  0, // from Tree when selected
  0, // from Story
];

let debugTimer = 0;

export let handimages = [];
let similarHand;
let font;

let handimagessrc = [];

const prak = "#C9FF4C";

// instructions
// let instructions = document.getElementById("instructions");
// export let ita = document.getElementById("ita");
// export let eng = document.getElementById("eng");
// export let itaO = ita.innerHTML;
// export let engO = eng.innerHTML;

export let cursor;
export let selectedPose;
export let zoomFactor;

// DOM cursor

let loadingcircle;
let loadingrects = [];

let cursorcontainer;
let cursorimage;

/////////////////////////////////////////////

//MEDIAPIPE
async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

//PRELOAD
export async function preload() {
  //font
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf");

  for (let i = 1; i <= handPoses.length; i++) {
    const img = loadImage(
      `assets/cursor/${i}.svg`,
      () => {
        handimages[i] = img;
        handimagessrc[i] = `assets/cursor/${i}.svg`;
      },
      console.warn(`Failed to load image: ${i}.svg`) //warn + fallback if fails
    );
  }

  //json
  handsData = await importJSON("json/training.json");

  restartImg = loadImage("assets/instructions/restart2.svg");
  treeImg = loadImage("assets/instructions/back2.svg");

  restartImgSrc = "assets/instructions/restart2.svg";
  treeImgSrc = "assets/instructions/back2.svg";
}

async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

//SETUP
export function setup() {
  //video
  video = createCapture(VIDEO);
  video.elt.id = "camera";
  video.hide();

  createHandLandmarker(); //hand detector mediapipe

  // getting the elements

  backtotree = document.getElementById("ins-1");
  backtostart = document.getElementById("ins-2");
  leftgradient = document.getElementById("gradient-left");

  if (backtotree) backtotree.style.visibility = "hidden";
  if (leftgradient) leftgradient.style.visibility = "hidden";

  // setting up the loading circle

  let precision = 64;
  let radius = 40;
  loadingcircle = document.getElementById("loading-circle");

  let c = [...Array(precision)].map((_, i) => {
    let a = (-i / (precision - 1)) * Math.PI * 2;
    let x = Math.cos(a) * radius + 50;
    let y = Math.sin(a) * radius + 50;
    return `${x}% ${y}%`;
  });

  if (loadingcircle)
    loadingcircle.style.clipPath = `polygon(100% 50%, 100% 100%, 0 100%, 0 0, 100% 0, 100% 50%, ${c.join(
      ","
    )})`;

  for (let i = 0; i < 4; i++)
    loadingrects[i] = document.getElementById("rect-" + (i + 1));

  cursorcontainer = document.getElementById("loading-circle-container");
  cursorimage = document.getElementById("cursor-image");
}

function goingBackToStart() {
  let maxCounter = 200;
  counters = counters.map(() => 0); // Reset all counters in the counters array
  selectedPose = undefined; // Reset the selected pose

  drawArc(escapeCounters[1], 45 * zoomFactor, maxCounter); // Draw the new arc

  if (escapeCounters[1] < maxCounter) {
    escapeCounters[1]++;
    for (let i = 0; i < counters.length; i++) {
      // stasis of counters

      if (counters[i] > 0) counters[i]--;
    }
  } else {
    if (!isRedirecting) backToStart();
  }
}

function goingBackToTree() {
  let maxCounter = 150;

  drawArc(escapeCounters[2], 45 * zoomFactor, maxCounter); // Draw the new arc
  if (escapeCounters[2] < maxCounter) {
    escapeCounters[2]++;
  } else {
    counters = counters.map(() => 0);
    selectedPose = undefined;
    escapeCounters[2] = 0;
  }
}

//DRAW
export function draw(shouldDrawHand = true) {
  if (!video) return; //se non c'è il video non va

  //VIDEO
  videoSize = {
    //calcolo le dimensioni del video proporzionalmente alle dimensioni dello schermo
    h: height / 4.5,
    w: (height / 4.5 / video.height) * video.width,
  };

  //DISEGNO LE MANI
  drawHands(selectedPose ? false : shouldDrawHand);

  //CURSOR
  if (hands.length > 0 && hands[0]?.points) {
    cursor = hands[0].points[9]?.pos;
    if (!cursor) return;

    // Calculate zoom factor based on current z
    zoomFactor = z / 800;

    const scale =
      videoSize.w / videoSize.h > width / height
        ? height / videoSize.h
        : width / videoSize.w;

    cursor.x *= scale * zoomFactor;
    cursor.y *= scale * zoomFactor;

    push();
    imageMode(CENTER);

    if (!shouldDrawHand) {
      //nella home disegno la mano in posa 3
      similarHand = 3;
      restart = false;
      market = false;
    }

    handCounter({
      detectedHand: similarHand,
      shouldDrawHand,
      lock: !!selectedPose,
    });

    let imggg = restart
      ? restartImg
      : market
      ? treeImg
      : handimages[similarHand + 1];

    let imgggSrc = restart
      ? restartImgSrc
      : market
      ? treeImgSrc
      : handimagessrc[similarHand + 1];

    // let imgHtml= document.getElementById("imgCursor")
    // imgHtml.src=imggg

    // console.log(restart, market); // old way to draw the cursor image
    // image(
    //   imggg,
    //   cursor.x,
    //   cursor.y,
    //   (imggg.width / 3) * 2 * zoomFactor,
    //   (imggg.height / 3) * 2 * zoomFactor
    // );

    cursorimage.innerHTML = "<img src='" + imgggSrc + "'>" // new way to do it
    console.log(imgggSrc);

    pop();

    fill(prak);
    noStroke();
    ellipse(cursor.x, cursor.y, 5);
  }

  if (counters.every((c) => c === 0)) {
    selectedPose = undefined;
  }

  if (!selectedPose && !hands[0] && tutorialEnd) {
    if (counters.every((c) => c === 0)) {
      escapeTree();
    }
  } else {
    escapeCounters[0] = 0; //counter di uscita si riavvia e il warning scompare
    // warning ? (warning.style.animation = "disappear 0.5s forwards") : null;
    warning ? (warning.style.display = "none") : null;
  }

  // onhover of the divs that control going back to the start or to the tree
  if (backtotree && backtostart) {
    // console.log(escapeCounters);

    if (cursor) {
      //se c'è il cursore e si trova sopra il coso destro
      if (
        cursor.x >
          (windowWidth / 2 - windowWidth / 50 - backtostart.offsetWidth) *
            zoomFactor &&
        cursor.y <
          backtostart.offsetHeight -
            (windowHeight / 2 - windowHeight / 25) * zoomFactor
      ) {
        goingBackToStart();
        restart = true;
        //console.log(escapeCounters[1]);
      } else {
        restart = false;
        if (escapeCounters[1] > 0) escapeCounters[1] = 0;
      }

      if (
        selectedPose &&
        cursor.x <
          (backtotree.offsetWidth - (windowWidth / 2 - windowWidth / 50)) *
            zoomFactor &&
        cursor.y <
          backtotree.offsetHeight -
            (windowHeight / 2 - windowHeight / 25) * zoomFactor // aumento leggermente il margine in alto - che sarebbe wisth/50= 2vw così da avere più margine per lo spostamento
      ) {
        goingBackToTree();
        market = true;
        //console.log(escapeCounters[2]);
      } else {
        market = false;
        if (escapeCounters[2] > 0) escapeCounters[2] = 0; //se esco dal counter scende
        // console.log("escapeCounters[2]" + escapeCounters[2]);
      }
    }

    // Applying animations for the going back divs

    if (selectedPose) {
      backtotree.style.visibility = "visible";
      backtotree.style.animation = "appear 1s forwards";

      leftgradient.style.visibility = "visible";
      leftgradient.style.animation = "appear 1s forwards";
    } else {
      backtotree.style.animation = "disappear 1s forwards";
      leftgradient.style.animation = "disappear 1s forwards";
    }
  }

  // moving the DOM cursor

  if (cursor)
    cursorcontainer.style.transform =
      "translate(" +
      cursor.x / zoomFactor +
      "px," +
      cursor.y / zoomFactor +
      "px)";
}

//DISEGNO LE MANI
const drawHands = (shouldDrawHand) => {
  if (handLandmarker && video && handsData) {
    //video
    const video = document.querySelector("#camera");

    let startTimeMs = performance.now(); //ritorna un timestamp del video che mi serve da mandare a mediapipe per il riconoscimento dell'immagine
    if (video.currentTime) {
      const handLandmarkerResult = handLandmarker.detectForVideo(
        video,
        startTimeMs
      );

      //landmarks
      const landmarks = handLandmarkerResult.landmarks[0];
      if (!landmarks) {
        hands = [];
        //se non ci sono mani nello schermo i counter scendono
        handCounter({ detectedHand: undefined });
        return;
      }
      let points = landmarks?.map((p) => mapCoords(p, videoSize)); //prende i punti della mano e li rimappa

      if (!hands[0]) {
        hands[0] = new Hand(points, 0); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        //If there is already a hand object, updates the existing hand by calling its draw method with new points
        hands[0].draw(points, shouldDrawHand);
      }

      // chiamo funzione che confronta i LANDMARKS con quelli del json e mi restituisce la mano detectata
      const differences = calculateDifferences(handsData); //calcola la differenza tra gli angoli di riferimento e quelli
      const minDifference = Math.min(...differences);
      if (!similarHand || shouldDrawHand) {
        similarHand = differences.indexOf(minDifference);
      }
    }
  }
};

// HAND COUNTER
let isRedirecting = false; //flag per fare una sola call quando cambia pagina
function handCounter({ detectedHand, shouldDrawHand, lock }) {
  const maxCounter = 150; // Maximum counter value
  const loadingRadius = 45 * zoomFactor; // Radius of the loading circle
  // console.log(lock);
  if (tutorialEnd === false || lock) return;

  counters.forEach((e, i) => {
    if (hands[0]) {
      //se la mano non c'è o sta andando il tutorial blocco il counter
      //console.log("counter va");
      if (detectedHand == i) {
        // Only increment if not already at max
        if (counters[detectedHand] < maxCounter) {
          counters[detectedHand]++;
        }

        drawArc(counters[detectedHand], loadingRadius, maxCounter);

        if (counters[detectedHand] >= maxCounter) {
          selectedPose = handPoses[i]; //se il counter raggiunge il massimo di una delle pose segnala questa come la posa detectata

          if (!shouldDrawHand && !isRedirecting) {
            //se sono nella home allora apre la pagina tree
            window.location.href = "tree.html";
            isRedirecting = true; //redirecting cambia così da fare un solo rindizziramento
          }
        }
      } else if (counters[i] > 0) {
        counters[i]--;
      }
    } else if (counters[i] > 0) {
      counters[i]--;
    }

    // counters applied to the DOM cursor loading bar

    let cMapped = map(counters[detectedHand], 0, maxCounter, 0, 360);

    loadingrects.forEach((rect, r) => {
      let rot_degrees = 270 - 90 * r;

      let new_skew = cMapped - 90 * r;

      if (new_skew < 0) new_skew = -1;
      if (new_skew >= 90) new_skew = 90;

      rect.style.transform =
        "rotate(" + rot_degrees + "deg) skew(" + (-89 + new_skew) + "deg)";
    });

    // displaying the div itself
    detectedHand != null
      ? (cursorcontainer.style.display = "block")
      : (cursorcontainer.style.display = "none");
  });
}

function drawArc(value, loadingRadius, maxCounter) {
  const angleOffset = -HALF_PI; // Start from the top
  // Always draw full arc if max is reached
  const arcAngle =
    value >= maxCounter ? TWO_PI : map(value, 0, maxCounter, 0, TWO_PI);

  // Outer arc
  push();
  noFill();
  strokeWeight(8 * zoomFactor);
  stroke(prak);
  arc(
    cursor.x,
    cursor.y,
    loadingRadius * 2,
    loadingRadius * 2,
    angleOffset,
    angleOffset + arcAngle
  );
  pop();

  // Inner arc
  push();
  noFill();
  strokeWeight(1);
  stroke("black");
  arc(
    cursor.x,
    cursor.y,
    loadingRadius * 2 - 7,
    loadingRadius * 2 - 7,
    angleOffset,
    angleOffset + arcAngle
  );
  pop();
}
// COUNTER CHE FA ESCAPE DALLA PAGINA NEL CASO IN CUI NESSUNA MANO è DETECTATA
function escapeTree() {
  escapeCounters[0]++;

  let maxCounter = 300;

  if (escapeCounters[0] < maxCounter) {
    if (escapeCounters[0] > maxCounter / 2) {
      //quando sono a metà del counter
      // warning.style.animation = "appear 1s forwards";
      warning ? (warning.style.display = "flex") : null;
      // warning.style.opacity = "0.4";
      endCounter ? (endCounter.innerHTML = escapeCounters[0]) : null;
    }
  } else if (!isRedirecting) backToStart();
}

function backToStart() {
  isRedirecting = true;
  window.location.href = "./index.html";
}

//confronto con i LANDMARKS usando gli angoli
function calculateDifferences(dataSet) {
  const calculateAngleDifferences = (userAngles, refAngles) => {
    return userAngles.map((userAngle, index) =>
      Math.abs(userAngle - refAngles[index])
    );
  };

  return dataSet?.map((data) => {
    const absoluteWeight = 0.2; // angoli assoluti - peso variabile
    const relativeWeight = 0.8; // angoli relativi - peso maggiore

    const absoluteDifferences = calculateAngleDifferences(
      hands[0].angles.map((a) => a.absolute),
      data.angles.map((a) => a.absolute)
    );

    const relativeDifferences = calculateAngleDifferences(
      hands[0].angles.map((a) => a.relative),
      data.angles.map((a) => a.relative)
    );

    const combinedScore = absoluteDifferences.reduce(
      (sum, diff, index) =>
        sum +
        (diff * absoluteWeight + relativeDifferences[index] * relativeWeight),
      0
    );

    return combinedScore;
  });
}
//rimappo le coordinate del video rispetto allo schermo
function mapCoords(point, v) {
  //rimappo le coordinate dei punti della mano rispetto alla dimensione del video e alla dimensione della canva
  return {
    x: width - point.x * v.w + (v.w - width) / 2 - width / 2,
    y: point.y * v.h - (v.h - height) / 2 - height / 2,
    z: 0,
  };
}

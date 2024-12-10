import {
  ImageSegmenter,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { z } from "./tree.js";
import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker, imageSegmenter, labels;

const legendColors = [
  [255, 197, 0, 255], // Vivid Yellow
  [128, 62, 117, 255], // Strong Purple
  [255, 104, 0, 255], // Vivid Orange - BODY COLOR
  [166, 189, 215, 255], // Very Light Blue
  [193, 0, 32, 255], // Vivid Red
];

let container = document.querySelector(".container");
let hands = [];

let handsData; //json

let video;
let videoSize;

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

let handimages = [];
let similarHand;
let font;

const prak = "#C9FF4C";

// instructions
// let instructions = document.getElementById("instructions");
let ita = document.getElementById("ita");
let eng = document.getElementById("eng");
let itaO = "Muovi la mano per esplorare";
let engO = "Move your hand to explore";

export let cursor;
export let selectedPose;

let zoomFactor;

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
      `assets/legend/${i}.svg`,
      () => {
        handimages[i] = img;
      },
      console.warn(`Failed to load image: ${i}.png`) //warn + fallback if fails
    );
  }

  //json
  handsData = await importJSON("json/training.json");
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
  video.hide();

  createHandLandmarker(); //hand detector mediapipe
}

//DRAW
export function draw() {
  if (!video) return; //se non c'è il video non va

  //VIDEO
  videoSize = {
    //calcolo le dimensioni del video proporzionalmente alle dimensioni dello schermo
    h: height / 4.5,
    w: (height / 4.5 / video.height) * video.width,
  };

  scale(-1, 1); //rifletto il video in modo da vederlo correttamente
  stroke("black");
  noFill();
  strokeWeight(2);
  rect(0, 0, videoSize.w, videoSize.h); //disegno un rettangolo in modo che abbia il bordo
  image(video, 0, 0, videoSize.w, videoSize.h);

  //DISEGNO LE MANI
  scale(-1, 1); //riporto il riferimento del video non flippato così da effettuare il confronto
  drawHands();

  //CURSOR

  if (hands.length > 0 && hands[0]?.points) {
    cursor = hands[0].points[9]?.pos;
    if (!cursor) return;

    ita.innerHTML = itaO;
    eng.innerHTML = engO;

    const scale =
      videoSize.w / videoSize.h > width / height
        ? height / videoSize.h
        : width / videoSize.w;

    // Calculate zoom factor based on current z
    zoomFactor = z / 800;

    cursor.x *= scale * zoomFactor;
    cursor.y *= scale * zoomFactor;

    push();
    imageMode(CENTER);
    if (typeof similarHand !== "undefined" && handimages[similarHand + 1]) {
      handCounter(similarHand);
      image(
        handimages[similarHand + 1],
        cursor.x,
        cursor.y,
        handimages[similarHand + 1].width * zoomFactor,
        handimages[similarHand + 1].height * zoomFactor
      );
    }
    pop();

    fill(prak);
    noStroke();
    ellipse(cursor.x, cursor.y, 10);
  } else {
    ita.innerHTML = "Dov'è andata la tua mano?";
    eng.innerHTML = "Where did your hand go?";
  }

  //se tutti i counter sono a 0 setta selectedPose a undefined
  if (counters.every((c) => c === 0)) {
    selectedPose = undefined;
  }
}

//DISEGNO LE MANI
const drawHands = () => {
  if (handLandmarker && video) {
    //video
    const video = document.querySelector("video");

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
        handCounter();
        return;
      }
      let points = landmarks?.map((p) => mapCoords(p, videoSize)); //prende i punti della mano e li rimappa

      if (!hands[0]) {
        hands[0] = new Hand(points, 0); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        //If there is already a hand object, updates the existing hand by calling its draw method with new points
        hands[0].draw(points);
      }

      // chiamo funzione che confronta i LANDMARKS con quelli del json e mi restituisce la mano detectata
      const differences = calculateDifferences(handsData); //calcola la differenza tra gli angoli di riferimento e quelli
      const minDifference = Math.min(...differences);
      similarHand = differences.indexOf(minDifference);
    }
  }
};

function handCounter(detectedHand) {
  const maxCounter = 150; // Maximum counter value
  const loadingRadius = 60 * zoomFactor; // Radius of the loading circle
  const angleOffset = -HALF_PI; // Start from the top

  counters.forEach((e, i) => {
    if (detectedHand == i) {
      // Only increment if not already at max
      if (counters[detectedHand] < maxCounter) {
        counters[detectedHand]++;
      }

      // Always draw full arc if max is reached
      const arcAngle =
        counters[detectedHand] >= maxCounter
          ? TWO_PI
          : map(counters[detectedHand], 0, maxCounter, 0, TWO_PI);

      // Outer arc
      push();
      noFill();
      strokeWeight(8 * zoomFactor);
      stroke("#C9FF4C");
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

      if (counters[detectedHand] >= maxCounter) {
        selectedPose = handPoses[i];

        // push();
        // textFont(font);
        // textSize(18);
        // textAlign(CENTER);
        // text("HURRAY! You have selected " + selectedPose, 0, videoSize.h);
        // pop();
      }
    } else if (counters[i] > 0) {
      counters[i]--;
    }
  });
}

//confronto con i LANDMARKS usando gli angoli
function calculateDifferences(dataSet) {
  const calculateAngleDifferences = (userAngles, refAngles) => {
    return userAngles.map((userAngle, index) =>
      Math.abs(userAngle - refAngles[index])
    );
  };

  return dataSet.map((data) => {
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

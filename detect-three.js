// MEDIAPIPE
// import * as THREE from "three";
import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import {
  zoom,
  warning,
  endCounter,
  tutorialEnd,
  p5Canvas,
  p5Containter,
  backtostart,
  backtotree,
  rightGradient,
  leftGradient,
  bottomGradient,
  infoEl,
  skipEl,
} from "./tree-three.js";
import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

export let canvasW = window.innerWidth;
export let canvasH = window.innerHeight;

let handLandmarker;

let hands = []; //mano detectata da mediapipe
let handsData = []; //json con le pose

// VIDEO DELLA PERSONA AL CENTRO
export let video, videoSize, videoExists;

// POSE
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

// TUTORIAL
let tutorial = document.getElementById("tutorial");
let tutorialQuick = document.getElementById("quick-tutorial");
let quickTutorialEnd, videoStarted;

// Function to play or restart the video
function handleVideoPlayback() {
  if (!videoStarted || tutorialQuick.ended) {
    // Restart the video if it hasn't started or has ended
    tutorialQuick.currentTime = 0;
    tutorialQuick.play();
    videoStarted = true; // Mark the video as started

    // bottom instructions
    infoEl.style.animation = "disappear 1s forwards";
    bottomGradient.style.animation = "disappear 1s forwards";

    //top instructions
    backtostart.style.animation = "disappear 1s forwards";
    rightGradient.style.animation = "disappear 1s forwards";

    //p5video
    p5Containter.style.animation = "disappear 1s forwards";
  }
}

let noHandAndZeroCounters; //flag di uscita dalla storia

// RESTART, BACK, E SKIP
let restart = false;
let market = false;
let skip = false;
let info = false;

let escapeCounters = [
  0, // from Tree when inactivity
  0, // from Tree when selected
  0, // from Story
  0, //from tutorial
];

export let selectedPose;
let similarHand;

export let zoomFactor;

// CURSOR
export let cursor;

let loadingcircles;
let loadingrects = [];
let cursorcontainer = document.getElementById("cursor-container"); //div che contiene l'immagine con il cerchio di caricamento
let cursorImages = document.getElementsByClassName("cursor-image"); //div che contiene l'immagine

// time and space
let prev_timestamp;
let delta_time;

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
  // CAMERA
  video = document.getElementById("capture");
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: { facingMode: "user" },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        video.srcObject = stream;
        video.play();
        video.addEventListener("playing", () => {
          setTimeout((videoExists = true), 1);
        });
      })
      .catch(function (error) {
        console.error("Unable to access the camera/webcam.", error);
      });
  } else {
    console.error("MediaDevices interface not available.");
  }

  createHandLandmarker(); //hand detector mediapipe

  // LOADING CIRCLE
  let precision = 64;
  loadingcircles = document.getElementsByClassName("loading-circle");

  loadingcircles.forEach((circle, i) => {
    let radius = 40 - 0.5 * i;

    let c = [...Array(precision)].map((_, i) => {
      let a = (-i / (precision - 1)) * Math.PI * 2;
      let x = Math.cos(a) * radius + 50;
      let y = Math.sin(a) * radius + 50;
      return `${x}% ${y}%`;
    });

    if (circle)
      circle.style.clipPath = `polygon(100% 50%, 100% 100%, 0 100%, 0 0, 100% 0, 100% 50%, ${c.join(
        ","
      )})`;

    for (let j = i * 4; j < 4 + 4 * i; j++)
      loadingrects[j] = circle.querySelector(".rect-" + (j - i * 4 + 1));
  });
}

//DRAW
export function draw(shouldDrawHand = true) {
  let index;

  // time and space
  let curr_timestamp = Date.now();
  delta_time = prev_timestamp ? curr_timestamp - prev_timestamp : 0;
  prev_timestamp = curr_timestamp;

  if (!video) return; //se non c'è la camera non va

  const videoMoreHorizontalThanScreen =
    video.videoWidth / video.videoHeight > canvasW / canvasH;

  //VIDEO
  //calcolo le dimensioni del video proporzionalmente alle dimensioni dello schermo
  videoSize = {
    h: videoMoreHorizontalThanScreen
      ? canvasH
      : (canvasW / video.videoWidth) * video.videoHeight,
    w: videoMoreHorizontalThanScreen
      ? (canvasH / video.videoHeight) * video.videoWidth
      : canvasW,
  };

  //DISEGNO LE MANI
  drawHands(shouldDrawHand);

  //CURSOR
  if (hands.length > 0 && hands[0]?.points) {
    cursor = hands[0].points[9]?.pos;
    if (!cursor) return;

    // Calculate zoom factor based on current z
    zoomFactor = zoom ? zoom : 1;

    const scale =
      videoSize.w / videoSize.h > canvasW / canvasH
        ? canvasH / videoSize.h
        : canvasW / videoSize.w;

    cursor.y = cursor.y * scale * zoomFactor;
    cursor.x = cursor.x * scale * zoomFactor;

    push();
    if (!shouldDrawHand) {
      restart = false;
      market = false;
    }

    // console.log(shouldDrawHand);
    handCounter({
      detectedHand: similarHand,
      shouldDrawHand,
      lock: selectedPose !== undefined,
    });

    console.log(selectedPose, similarHand);

    index = restart
      ? 8
      : market
      ? 7
      : skip
      ? 10
      : !shouldDrawHand || videoStarted
      ? 9
      : similarHand; //se sono in over su restart oppure torna al mercato oppure nessuna mano è detectata se no mano riconosciuta
    cursorImages.forEach((image, i) => {
      image.style.display = i == index ? "block" : "none";
    });

    pop();
  }

  if (counters.every((c) => c === 0)) {
    selectedPose = undefined;
  }
  // se non c'è la mano e nessuna posa è selezionata e il video tutorial è finito
  if (!selectedPose && !hands[0] && tutorialEnd) {
    if (counters.every((c) => c === 0)) {
      //se tutti i counter sono a zero chiama la funzione che riavvia l'esperienza
      let escape = (escapeCounters[0] += delta_time);
      escapeTree(20000, escape); //10 secondi
    }
  } else {
    escapeCounters[0] = 0; //counter di uscita si riavvia e il warning scompare
    warning ? (warning.style.display = "none") : null;
  }

  // BACK E RESTART E INFO E SKIP
  if (cursor) {
    //restart
    if (backtostart) {
      if (
        cursor.x >
          (windowWidth - (windowWidth / 50 + backtostart.offsetWidth)) *
            zoomFactor &&
        cursor.y < (backtostart.offsetHeight + windowWidth / 50) * zoomFactor &&
        !videoStarted
      ) {
        goingBackToStart(5000);
        restart = true;
      } else {
        restart = false;
        if (escapeCounters[1] > 0) escapeCounters[1] = 0;
      }
    }
    //skip
    if (skipEl) {
      if (
        cursor.x >
          (windowWidth - (windowWidth / 50 + skipEl.offsetWidth)) *
            zoomFactor &&
        cursor.y < (skipEl.offsetHeight + windowWidth / 50) * zoomFactor
      ) {
        skip = true;

        !selectedPose ? (counters = counters.map(() => 0)) : null; // Reset all counters in the counters array
        skipTutorial(2500);
      } else {
        skip = false;
        if (escapeCounters[3] > 0) escapeCounters[3] = 0;
      }
    }
    //info
    if (infoEl) {
      if (
        cursor.x < (infoEl.offsetWidth + windowWidth / 50) * zoomFactor &&
        cursor.y >
          (windowHeight / 2 - (infoEl.offsetHeight + windowWidth / 50)) *
            zoomFactor &&
        tutorialEnd
      ) {
        tutorialQuick.style.display = "block";
        tutorialQuick.style.visibility = "visible";
        info = quickTutorialEnd = true;

        // Start or restart the video
        handleVideoPlayback();
      } else {
        info = false;
      }
    }

    //goback
    if (backtotree) {
      if (
        selectedPose &&
        cursor.x < (backtotree.offsetWidth + windowWidth / 50) * zoomFactor &&
        cursor.y < (backtotree.offsetHeight + windowWidth / 50) * zoomFactor // aumento leggermente il margine in alto - che sarebbe wisth/50= 2vw così da avere più margine per lo spostamento
      ) {
        goingBackToTree(2500);
        market = true;
      } else {
        market = false;
        if (escapeCounters[2] > 0) escapeCounters[2] = 0; //se esco dal counter scende
      }
    }
  }

  // Applying animations for the going back divs
  if (backtotree && tutorialEnd) {
    // se entro in una storia
    if (selectedPose) {
      // left instruction
      backtotree.style.visibility = "visible";
      backtotree.style.animation = "appear 1s forwards";
      leftGradient.style.visibility = "visible";
      leftGradient.style.animation = "appear 1s forwards";
      //bottom instruction
      infoEl.style.visibility = "visible";
      bottomGradient.style.visibility = "visible";
      infoEl.style.animation = "disappear 1s forwards";
      bottomGradient.style.animation = "disappear 1s forwards";
      // console.log(noHandAndZeroCounters, escapeCounters[2]);
      // se esco dalla storia
    } else if (noHandAndZeroCounters) {
      // left instruction
      backtotree.style.animation = "disappear 1s forwards";
      leftGradient.style.animation = "disappear 1s forwards";
      //bottom instruction
      infoEl.style.animation = "appear 1s forwards";
      bottomGradient.style.animation = "appear 1s forwards";
      noHandAndZeroCounters = false;
    }
  }

  //HTML CURSOR
  if (cursor) {
    cursorcontainer.style.display = "block";
    cursorcontainer.style.transform =
      "translate(" +
      cursor.x / zoomFactor +
      "px," +
      cursor.y / zoomFactor +
      "px)";
  } else {
    cursorcontainer.style.display = "none";
  }

  // reset the counter when no action
  loadingrects.forEach((rect, r) => {
    if (index != 9) {
      if (selectedPose && !market && !restart) {
        rect.style.opacity = 0;
      } else {
        rect.style.opacity = 1;
      }
    } else if (shouldDrawHand)
      // making the loading invisible while in the 9th pose in all cases but the screensaver
      rect.style.opacity = 0;
  });
}

// fino a qui era tutto draw
// //////////////////////////////////////////////////////////////////////////

// tutorial breve
if (tutorialQuick) {
  // Ensure the "ended" event is set up only once
  tutorialQuick.addEventListener("ended", () => {
    videoStarted = false;
    quickTutorialEnd = false;
    tutorialQuick.style.display = "none";

    // bottom instructions
    infoEl.style.visibility = "visible";
    infoEl.style.animation = "appear 1s forwards";
    bottomGradient.style.visibility = "visible";
    bottomGradient.style.animation = "appear 1s forwards";

    //top instructions
    backtostart.style.visibility = "visible";
    backtostart.style.animation = "appear 1s forwards";
    rightGradient.style.visibility = "visible";
    rightGradient.style.animation = "appear 1s forwards";

    //p5video
    p5Containter.style.visibility = "visible";
    p5Containter.style.animation = "appear 1s forwards";
  });
}

//DISEGNO LE MANI
const drawHands = (shouldDrawHand) => {
  clear();

  if (handLandmarker && video && handsData) {
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
        cursor = undefined;
        return;
      }
      //prende i punti della mano e li rimappa
      let points = landmarks?.map((p) =>
        mapCoords(p, videoSize, { w: canvasW, h: canvasH })
      );
      //prende i punti della mano e li rimappa per disegnarli nella piccola canva sotto
      let p5Points;
      if (p5Canvas) {
        p5Points = landmarks?.map((p) => ({
          x: lerp(0, p5Canvas.width, 1 - p.x),
          y: lerp(0, p5Canvas.height, p.y),
          z: 0,
        }));
      }

      if (!hands[0]) {
        hands[0] = new Hand(points, 0, p5Points); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        //If there is already a hand object, updates the existing hand by calling its draw method with new points
        hands[0].draw(points, shouldDrawHand, p5Points);
      }

      // chiamo funzione che confronta i LANDMARKS con quelli del json e mi restituisce la mano detectata
      const differences = calculateDifferences(handsData); //calcola la differenza tra gli angoli di riferimento e quelli
      const minDifference = Math.min(...differences);

      console.log(selectedPose, similarHand, shouldDrawHand);
      let treshold = 300;
      if (similarHand === undefined || (!selectedPose && shouldDrawHand)) {
        similarHand =
          minDifference <= treshold ? differences.indexOf(minDifference) : 9;
      }
    }
  }
};

//DETECT HAND - confronto con i LANDMARKS usando gli angoli
function calculateDifferences(dataSet) {
  if (!hands[0]?.angles || !dataSet) return [];

  // Pre-calculate hand angles once
  const handAbsoluteAngles = hands[0].angles.map((a) => a.absolute);
  const handRelativeAngles = hands[0].angles.map((a) => a.relative);

  const weights = { absolute: 0.2, relative: 0.8 };

  return dataSet.map((data) => {
    const absoluteDiffs = handAbsoluteAngles.map((angle, i) =>
      Math.abs(angle - data.angles[i].absolute)
    );

    const relativeDiffs = handRelativeAngles.map((angle, i) =>
      Math.abs(angle - data.angles[i].relative)
    );

    return absoluteDiffs.reduce(
      (sum, diff, i) =>
        sum + (diff * weights.absolute + relativeDiffs[i] * weights.relative),
      0
    );
  });
}

// HAND COUNTER
let isRedirecting = false; //flag per fare una sola call quando cambia pagina
function handCounter({ detectedHand, shouldDrawHand, lock }) {
  const maxCounter = 5000;

  // console.log(tutorialEnd, quickTutorialEnd, lock);

  if (tutorialEnd == false || quickTutorialEnd || lock) return;

  if (!hands[0] && counters.every((c) => c === 0)) {
    noHandAndZeroCounters = true;
    return;
  }

  // Update only the relevant counter
  if (hands[0] && detectedHand !== undefined) {
    if (counters[detectedHand] < maxCounter) {
      counters[detectedHand] += delta_time;
      drawDOMArc(counters[detectedHand], maxCounter);
    }

    if (counters[detectedHand] >= maxCounter) {
      selectedPose = handPoses[detectedHand];

      if (!shouldDrawHand && !isRedirecting) {
        console.log("going to tree");
        window.location.href = "tree.html";
        isRedirecting = true;
      }
    }
  }

  // Decrease other counters
  counters.forEach((val, i) => {
    if (i !== detectedHand && val > 0) {
      counters[i] = Math.max(0, val - delta_time);
    }
  });
}

function drawDOMArc(value, maxCounter) {
  let cMapped = map(value, 0, maxCounter, 0, 360);

  loadingrects.forEach((rect, r) => {
    let rot_degrees = 270 - 90 * (r % 4);

    let new_skew = cMapped - 90 * (r % 4);

    new_skew < 0
      ? (rect.style.visibility = "hidden")
      : (rect.style.visibility = "visible");
    if (new_skew >= 90) new_skew = 90;

    rect.style.transform =
      "rotate(" + rot_degrees + "deg) skew(" + (-89 + new_skew) + "deg)";
  });
}

// //////////////////////////////////////////////////////////////////////////

// RESTART
function goingBackToStart(maxCounter) {
  !selectedPose ? (counters = counters.map(() => 0)) : null; // Reset all counters in the counters array

  drawDOMArc(escapeCounters[1], maxCounter);

  if (escapeCounters[1] < maxCounter) {
    escapeCounters[1] += delta_time;
  } else {
    if (!isRedirecting) backToStart();
  }
}
//GO BACK
function goingBackToTree(maxCounter) {
  drawDOMArc(escapeCounters[2], maxCounter);
  if (escapeCounters[2] < maxCounter) {
    escapeCounters[2] += delta_time;
  } else {
    counters = counters.map(() => 0);
    selectedPose = undefined;
    escapeCounters[2] = 0;
  }
}
//SKIP
function skipTutorial(maxCounter) {
  drawDOMArc(escapeCounters[3], maxCounter);
  if (escapeCounters[3] < maxCounter) {
    escapeCounters[3] += delta_time;
  } else {
    tutorial.currentTime = tutorial.duration;
    counters = counters.map(() => 0); // Reset counters to 0 instead of 3
    selectedPose = undefined;
    escapeCounters[3] = 0;

    if (skipEl) skipEl.style.display = "none";

    if (backtostart) backtostart.style.display = "flex";
    if (infoEl) infoEl.style.display = "flex";
    if (bottomGradient) bottomGradient.style.display = "block";
  }
}

// COUNTER CHE FA ESCAPE DALLA PAGINA NEL CASO IN CUI NESSUNA MANO è DETECTATA
function escapeTree(maxCounter, escapeCounter) {
  if (escapeCounter < maxCounter) {
    //quando sono a metà del counter
    if (escapeCounter > maxCounter / 2) {
      warning ? (warning.style.display = "flex") : null;

      endCounter
        ? (endCounter.innerHTML =
            Math.floor(maxCounter / 1000) - Math.floor(escapeCounter / 1000))
        : null;
    }
  } else if (!isRedirecting) backToStart();
}

function backToStart() {
  isRedirecting = true;
  window.location.href = "./index.html";
}

// //////////////////////////////////////////////////////////////////////////

//rimappo le coordinate del video rispetto allo schermo
function mapCoords(point, v) {
  //rimappo le coordinate dei punti della mano rispetto alla dimensione del video e alla dimensione della canva
  return {
    x: canvasW - point.x * v.w + (v.w - canvasW) / 2,
    y: point.y * v.h - (v.h - canvasH) / 2,
    z: 0,
  };
}

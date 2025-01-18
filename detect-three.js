// MEDIAPIPE
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
  backtostart as restartEl,
  backtotree as marketEl,
  rightGradient,
  leftGradient,
  bottomGradient,
  infoEl,
  skipEl,
} from "./tree-three.js";
import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente
import { audioPlaying } from "./listings-three.js";

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
let handCounters = [
  0, //FingerPerch
  0, //grip
  0, //HalfClosed
  0, //open
  0, //relaxed
  0, //shell
  0, //TouchingTips
  0, //HOME
];

let counters = [
  {
    name: "skip_tutorial",
    value: 0,
    max: 5000,
    show: false,
    function: skipTutorial,
    cursorImage: 10,
  },
  {
    name: "market",
    value: 0,
    max: 5000,
    show: false,
    function: backToTree,
    cursorImage: 7,
  },
  {
    name: "info",
    value: 0,
    max: 100,
    show: false,
    function: showQuickTutorial,
    cursorImage: 9,
  },
  {
    name: "restart",
    value: 0,
    max: 5000,
    show: false,
    function: backToStart,
    cursorImage: 8,
  },
];

// TUTORIAL
let tutorial = document.getElementById("tutorial");
let tutorialQuick = document.getElementById("quick-tutorial");
let quickTutorialEnd, videoStarted;

let noHandAndZeroCounters; //flag di uscita dalla storia

let escapeCounters = [
  0, // from Tree when inactivity
  0, // from Tree when selected
  0, // from Story
  0, //from tutorial
  0, // reset all hands
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
export function draw(shouldDrawHand = true, acceptAllHands = false) {
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

    updateHandCounters({
      detectedHand: acceptAllHands ? 7 : similarHand,
      shouldDrawHand,
      lock: selectedPose !== undefined,
    });

    updateCounters();

    const counterIndex = counters.find((b) => b.show)?.cursorImage;
    index = counterIndex
      ? counterIndex
      : !shouldDrawHand || videoStarted
      ? 9
      : similarHand;

    cursorImages.forEach((image, i) => {
      image.style.display = i == index ? "block" : "none";
    });
  }

  if (handCounters.every((c) => c === 0)) {
    if (!audioPlaying) {
      setTimeout(() => {
        selectedPose = undefined;
      }, 1000);
    }
  }
  // console.log(tutorialEnd, videoStarted);
  // se non c'è la mano e nessuna posa è selezionata e il video tutorial è finito
  if (!selectedPose && !hands[0] && tutorialEnd && !videoStarted) {
    if (handCounters.every((c) => c === 0)) {
      //se tutti i counter sono a zero chiama la funzione che riavvia l'esperienza
      let escape = (escapeCounters[0] += delta_time);
      escapeTree(20000, escape); //10 secondi
    }
  } else {
    escapeCounters[0] = 0; //counter di uscita si riavvia e il warning scompare
    warning ? (warning.style.display = "none") : null;
  }

  if (marketEl && leftGradient && infoEl && bottomGradient) {
    if (selectedPose) {
      marketEl.classList.add("visible");
      leftGradient.classList.add("visible");
      infoEl.classList.remove("visible");
      bottomGradient.classList.remove("visible");
    } else if (noHandAndZeroCounters) {
      marketEl.classList.remove("visible");
      leftGradient.classList.remove("visible");
      infoEl.classList.add("visible");
      bottomGradient.classList.add("visible");
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
  loadingrects.forEach((rect) => {
    // console.log(index, shouldDrawHand, tutorialEnd, videoStarted);
    if (index !== 9) {
      if (
        selectedPose &&
        !["market", "restart"].includes(counters.find((c) => c.show)?.name)
      ) {
        rect.style.opacity = 0;
      } else {
        rect.style.opacity = 1;
      }
    } else if (!tutorialEnd || videoStarted) rect.style.opacity = 0;
  });
}

// tutorial breve
if (tutorialQuick) {
  // Ensure the "ended" event is set up only once
  tutorialQuick.addEventListener("ended", () => {
    if (tutorialEnd) {
      // console.log("non può essere qui");
      videoStarted = false;
      quickTutorialEnd = false;
      tutorialQuick.classList.remove("visible");
      setTimeout(tutorialQuick.classList.remove("show"), 1000);

      // bottom instructions
      infoEl.classList.add("visible");
      bottomGradient.classList.add("visible");

      //top instructions
      restartEl.classList.add("visible");
      rightGradient.classList.add("visible");

      //p5video
      p5Containter.classList.add("visible");
    }
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
        updateHandCounters({ detectedHand: undefined });
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

      // console.log(selectedPose, similarHand, shouldDrawHand);
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
function updateHandCounters({ detectedHand, shouldDrawHand, lock }) {
  const maxCounter = 5000;

  if (tutorialEnd == false || quickTutorialEnd || lock) return;

  if (!hands[0] && !audioPlaying && handCounters.every((c) => c === 0)) {
    noHandAndZeroCounters = true;
  }

  // Update only the relevant counter
  // console.log(detectedHand, handCounters[detectedHand], maxCounter);
  if (hands[0] && detectedHand !== undefined) {
    // console.log(handCounters, escapeCounters, lock);
    if (
      handCounters[detectedHand] < maxCounter &&
      handCounters[detectedHand] !== undefined
    ) {
      handCounters[detectedHand] += delta_time;
      // console.log(handCounters[detectedHand], detectedHand);
    }
    drawDOMArc(handCounters[detectedHand] || 0, maxCounter);

    if (handCounters[detectedHand] >= maxCounter) {
      selectedPose = handPoses[detectedHand];

      if (!shouldDrawHand && !isRedirecting) {
        window.location.href = "tree.html";
        isRedirecting = true;
      }
    }
  }

  // Decrease other counters
  handCounters.forEach((val, i) => {
    // se non ci sono mani resetta tutto
    if (!hands[0]) {
      escapeCounters[4]++;
      if (escapeCounters[4] > 60) {
        // dopo 60 frame resetta
        handCounters[i] = 0;
        escapeCounters[4] = 0;
      }
    } else {
      escapeCounters[4] = 0;
      if (i !== detectedHand && val > 0) {
        handCounters[i] = Math.max(0, val - delta_time);
      }
    }
  });
}

function updateCounters() {
  counters.forEach((counter) => {
    let bounds;

    const elements = {
      skip_tutorial: skipEl,
      restart: restartEl,
      info: infoEl,
      market: marketEl,
    };

    if (elements[counter.name]) {
      // if (
      //   !counter.bounds?.top &&
      //   !counter.bounds?.left &&
      //   !counter.bounds?.width &&
      //   !counter.bounds?.height
      // ) {
      // }
      counter.bounds = getElementBounds(elements[counter.name]);

      bounds = {
        top: counter.bounds.top * zoomFactor,
        left: counter.bounds?.left * zoomFactor,
        width: counter.bounds?.width * zoomFactor,
        height: counter.bounds?.height * zoomFactor,
      };
      // console.log(bounds);

      if (bounds) {
        if (
          cursor.x > bounds.left - 75 &&
          cursor.x < bounds.left - 75 + bounds.width + 75 &&
          cursor.y > bounds.top - 75 &&
          cursor.y < bounds.top - 75 + bounds.height + 75 &&
          elements[counter.name].className.includes("visible")
        ) {
          drawDOMArc(counter.value, counter.max);
          counter.show = true;

          if (selectedPose === undefined) {
            handCounters = handCounters.map(() => 0);
          }

          if (counter.value < counter.max) {
            counter.value = Math.min(counter.value + delta_time, counter.max);
          } else {
            counters = counters.map((c) => ({ ...c, value: 0 }));

            counter.function();
          }
          // console.log(counter);
        } else {
          counter.value = 0;
          counter.show = false;
        }
      }
    }
  });
}

function getElementBounds(el) {
  const { top, left, width, height } = el.getBoundingClientRect();
  return {
    top: top,
    left: left,
    width: width,
    height: height,
  };
}

function drawDOMArc(value, maxCounter) {
  // console.log(value, maxCounter);
  let cMapped = map(value, 0, maxCounter, 0, 360);

  loadingrects.forEach((rect, r) => {
    let rot_degrees = 270 - 90 * (r % 4);

    let new_skew = cMapped - 90 * (r % 4);

    new_skew <= 0
      ? (rect.style.visibility = "hidden")
      : (rect.style.visibility = "visible");
    if (new_skew >= 90) new_skew = 90;
    // console.log(new_skew);
    rect.style.transform =
      "rotate(" + rot_degrees + "deg) skew(" + (-89 + new_skew) + "deg)";
  });
}

// //////////////////////////////////////////////////////////////////////////

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

function backToTree() {
  resetAllCounters();
  selectedPose = undefined;
  marketEl.classList.remove("visible");
  leftGradient.classList.remove("visible");
  infoEl.classList.add("visible");
  bottomGradient.classList.add("visible");
}
function resetAllCounters() {
  counters = counters.map((c) => ({ ...c, value: 0 }));
  handCounters = handCounters.map(() => 0);
  escapeCounters = escapeCounters.map(() => 0);
}

//SKIP
function skipTutorial() {
  // console.log("neanche qui può essere");
  if (tutorial) tutorial.currentTime = tutorial.duration;

  if (skipEl) skipEl.style.display = "none";
  if (restartEl) restartEl.classList.add("visible");
  if (infoEl) infoEl.classList.add("visible");
  if (bottomGradient) bottomGradient.classList.add("visible");
}

// Function to play or restart the video
function showQuickTutorial() {
  tutorialQuick.classList.add("show");
  tutorialQuick.classList.add("visible");
  quickTutorialEnd = true;

  if (!videoStarted || tutorialQuick.ended) {
    // Restart the video if it hasn't started or has ended
    tutorialQuick.currentTime = 0;
    tutorialQuick.play();
    videoStarted = true; // Mark the video as started

    // bottom instructions
    infoEl.classList.remove("visible");
    bottomGradient.classList.remove("visible");

    //top instructions
    restartEl.classList.remove("visible");
    rightGradient.classList.remove("visible");

    //p5video
    p5Containter.classList.remove("visible");
  }
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

// MEDIAPIPE
import * as THREE from "three";
import {
  // ImageSegmenter,  per adesso tolgo l'import di questa ai
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import {
  zoom,
  canvasW,
  canvasH,
  scene,
  warning,
  endCounter,
  tutorialEnd,
} from "./tree-three.js";
import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker, imageSegmenter, labels;

let hands = []; //mano detectata da mediapipe

let handsData = []; //json con le pose

// VIDEO DELLA PERSONA AL CENTRO
export let video;
export let videoSize;

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

// RESTART E BACK
let restart = false;
let market = false;
let restartImgSrc;
let treeImgSrc;

// getting the elements
let backtotree = document.getElementById("ins-1");
let backtostart = document.getElementById("ins-2");
let leftgradient = document.getElementById("gradient-left");

let escapeCounters = [
  0, // from Tree when inactivity
  0, // from Tree when selected
  0, // from Story
];

const prak = "#C9FF4C";

export let handimages = []; //!!! per ora questa non si può togliere
// let handimagessrc = []; // svg di tutte le pose

let similarHand;
export let selectedPose;

export let zoomFactor;

// CURSOR
export let cursor;

let loadingcircles;
let loadingrects = [];

let cursorcontainer = document.getElementById("cursor-container"); //div che contiene l'immagine con il cerchio di caricamento
let cursorImages = document.getElementsByClassName("cursor-image"); //div che contiene l'immagine

let introWave = true;

// time and space

let prev_timestamp;
let delta_time;
let videoMesh;

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
  // for (let i = 1; i <= handPoses.length; i++) {
  //   handimagessrc[i] = `assets/cursor/${i}.svg`;
  // }

  //json
  handsData = await importJSON("json/training.json");

  // back e restart
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
  video = document.getElementById("capture");

  const texture = new THREE.VideoTexture(video);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.colorSpace = THREE.SRGBColorSpace;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: { facingMode: "user" },
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        // apply the stream to the video element used in the texture
        video.srcObject = stream;
        video.play();
        video.addEventListener("playing", () => {
          const scale = 0.4;

          const geometry = new THREE.PlaneGeometry(
            video.videoWidth * scale,
            video.videoHeight * scale
          );

          console.log(video.videoWidth, video.videoHeight);
          const material = new THREE.MeshBasicMaterial({ map: texture });
          videoMesh = new THREE.Mesh(geometry, material);

          scene.add(videoMesh);
        });
      })
      .catch(function (error) {
        console.error("Unable to access the camera/webcam.", error);
      });
  } else {
    console.error("MediaDevices interface not available.");
  }

  createHandLandmarker(); //hand detector mediapipe

  if (backtotree) backtotree.style.visibility = "hidden";
  if (leftgradient) leftgradient.style.visibility = "hidden";

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

  if (!video) return; //se non c'è il video non va

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

  if (videoMesh) {
    videoMesh.visible = !selectedPose;
  }

  //DISEGNO LE MANI
  drawHands(selectedPose ? false : shouldDrawHand);

  //CURSOR
  if (hands.length > 0 && hands[0]?.points) {
    cursor = hands[0].points[9]?.pos;
    if (!cursor) return;

    // Calculate zoom factor based on current z
    zoomFactor = zoom;

    const scale =
      videoSize.w / videoSize.h > canvasW / canvasH
        ? canvasH / videoSize.h
        : canvasW / videoSize.w;

    cursor.y = cursor.y * scale * zoomFactor;
    cursor.x = cursor.x * scale * zoomFactor;

    // console.log(Math.round(cursor.x), Math.round(cursor.y));

    push();
    if (!shouldDrawHand) {
      //nella home disegno la mano in posa 3
      similarHand = 3;
      restart = false;
      market = false;
    }

    handCounter({
      detectedHand: similarHand,
      shouldDrawHand,
      lock: selectedPose !== undefined,
    });

    index = restart ? 8 : market ? 7 : !shouldDrawHand ? 9 : similarHand;
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
      escapeTree(20000); //10 secondi
    }
  } else {
    escapeCounters[0] = 0; //counter di uscita si riavvia e il warning scompare
    // warning ? (warning.style.animation = "disappear 0.5s forwards") : null;
    warning ? (warning.style.display = "none") : null;
  }

  // //////////////////////////////////////////////////////////////////////////
  // BACK E RESTART
  if (backtotree && backtostart) {
    if (cursor) {
      //restart
      if (
        cursor.x >
          (windowWidth / 2 - windowWidth / 50 - backtostart.offsetWidth) *
            zoomFactor &&
        cursor.y <
          backtostart.offsetHeight -
            (windowHeight / 2 - windowHeight / 25) * zoomFactor
      ) {
        goingBackToStart(5000);
        restart = true;
      } else {
        restart = false;
        if (escapeCounters[1] > 0) escapeCounters[1] = 0;
      }
      //goback
      if (
        selectedPose &&
        cursor.x <
          (backtotree.offsetWidth - (windowWidth / 2 - windowWidth / 50)) *
            zoomFactor &&
        cursor.y <
          backtotree.offsetHeight -
            (windowHeight / 2 - windowHeight / 25) * zoomFactor // aumento leggermente il margine in alto - che sarebbe wisth/50= 2vw così da avere più margine per lo spostamento
      ) {
        goingBackToTree(2000);
        market = true;
      } else {
        market = false;
        if (escapeCounters[2] > 0) escapeCounters[2] = 0; //se esco dal counter scende
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

  // displaying the cursor itself
  if (hands[0]) {
    introWave = introWave ? false : null;
    cursorcontainer.style.display = "block";
  } else if (!introWave) {
    cursorcontainer.style.display = "none";
  }

  // introductory wave

  if (introWave) {
    // cursorcontainer.style.top = "90%";
    // cursorcontainer.style.left = "75%";
    cursorcontainer.style.animation = "wave 3s infinite";
    loadingrects.forEach((rect) => (rect.style.visibility = "hidden"));
  } else if (introWave == false) {
    cursorcontainer.style.animation = "none";
  }

  //HTML CURSOR
  if (cursor)
    cursorcontainer.style.transform =
      "translate(" +
      cursor.x / zoomFactor +
      "px," +
      cursor.y / zoomFactor +
      "px)";

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

    //console.log(index);
  });
}

//DISEGNO LE MANI
const drawHands = (shouldDrawHand) => {
  if (handLandmarker && video && handsData) {
    //video
    const video = document.getElementById("capture");

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

      // console.log(similarHand, shouldDrawHand)
      if (similarHand === undefined || shouldDrawHand) {
        let treshold = 300;
        similarHand =
          minDifference <= treshold ? differences.indexOf(minDifference) : 9;
      }
    }
  }
};

//DETECT HAND - confronto con i LANDMARKS usando gli angoli
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

// HAND COUNTER
let isRedirecting = false; //flag per fare una sola call quando cambia pagina
function handCounter({ detectedHand, shouldDrawHand, lock }) {
  const maxCounter = 5000; // Maximum counter value
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
          counters[detectedHand] += delta_time;
        }

        drawDOMArc(counters[detectedHand], maxCounter);

        if (counters[detectedHand] >= maxCounter) {
          selectedPose = handPoses[i]; //se il counter raggiunge il massimo di una delle pose segnala questa come la posa detectata

          if (!shouldDrawHand && !isRedirecting) {
            //se sono nella home allora apre la pagina tree
            window.location.href = "tree.html";
            isRedirecting = true; //redirecting cambia così da fare un solo rindizziramento
          }
        }
      } else if (counters[i] > 0) {
        counters[i] -= delta_time;
        counters[i] = Math.max(counters[i], 0);
      }
    } else if (counters[i] > 0) {
      counters[i] -= delta_time;
      counters[i] = Math.max(counters[i], 0);
    }
  });
}

function drawDOMArc(value, maxCounter) {
  // counters applied to the DOM cursor loading bar

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
// RESTART E GO BACK
// restart
function goingBackToStart(maxCounter) {
  !selectedPose ? (counters = counters.map(() => 0)) : null; // Reset all counters in the counters array
  // selectedPose = undefined; // Reset the selected pose

  // console.log(counters, selectedPose);
  drawDOMArc(escapeCounters[1], maxCounter);

  if (escapeCounters[1] < maxCounter) {
    escapeCounters[1] += delta_time;
  } else {
    if (!isRedirecting) backToStart();
  }
}
//go back
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

// COUNTER CHE FA ESCAPE DALLA PAGINA NEL CASO IN CUI NESSUNA MANO è DETECTATA
function escapeTree(maxCounter) {
  escapeCounters[0] += delta_time;
  // console.log(escapeCounters[0]);
  if (escapeCounters[0] < maxCounter) {
    if (escapeCounters[0] > maxCounter / 2) {
      //quando sono a metà del counter
      // warning.style.animation = "appear 1s forwards";
      warning ? (warning.style.display = "flex") : null;
      // warning.style.opacity = "0.4";

      endCounter
        ? (endCounter.innerHTML =
            Math.floor(maxCounter / 1000) -
            Math.floor(escapeCounters[0] / 1000))
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

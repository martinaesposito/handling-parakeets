import {
  ImageSegmenter,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

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
let p5, canvas;
let hands = [];

let handsData; //json
let imgSCH = document.getElementById("scheletro");
let differenceElC = document.querySelector(".diff");

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

let cursor;
const prak = "#C9FF4C";

// instructions
let instructions = document.getElementById("instructions");
let ita = document.getElementById("ita");
let eng = document.getElementById("eng");
let itaO = "Muovi la mano per esplorare";
let engO = "Move your hand to explore";

/////////////////////////////////////////////

//MEDIAPIPE
const createHandLandmarker = async () => {
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

  imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  labels = imageSegmenter.getLabels();
};

//PRELOAD
window.preload = async () => {
  //font
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf");

  //immagini
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
};
async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

//SETUP
window.setup = async () => {
  //canva
  p5 = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  canvas = p5.canvas;
  container.appendChild(canvas);

  //video
  video = createCapture(VIDEO);
  video.hide();

  createHandLandmarker(); //hand detector mediapipe
};

//DRAW
window.draw = () => {
  if (!video) return; //se non c'è il video non va

  background("#F5F5F5");

  //VIDEO
  videoSize = {
    //calcolo le dimensioni del video proporzionalmente alle dimensioni dello schermo
    h: height / 4.5,
    w: (height / 4.5 / video.height) * video.width,
  };
  scale(-1, 1); //rifletto il video in modo da vederlo correttamente
  stroke("black");
  strokeWeight(2);
  rect(-videoSize.w / 2, -videoSize.h / 2, videoSize.w, videoSize.h); //disegno un rettangolo in modo che abbia il bordo
  image(video, -videoSize.w / 2, -videoSize.h / 2, videoSize.w, videoSize.h);

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

    cursor.x *= scale;
    cursor.y *= scale;

    push();
    imageMode(CENTER);
    if (typeof similarHand !== "undefined" && handimages[similarHand + 1]) {
      handCounter(similarHand);
      image(handimages[similarHand + 1], cursor.x, cursor.y);
    }
    pop();

    fill(prak);
    noStroke();
    ellipse(cursor.x, cursor.y, 10);
  } else {
    ita.innerHTML = "Dov'è andata la tua mano?";
    eng.innerHTML = "Where did your hand go?";
  }
};

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
        return;
      }
      let points = landmarks?.map((p) => mapCoords(p, videoSize)); //prende i punti della mano e li rimappa

      if (!hands[0]) {
        hands[0] = new Hand(points, 0); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        //If there is already a hand object, updates the existing hand by calling its draw method with new points
        hands[0].draw(points);
      }

      //chiamo IMAGE SEGMENTER  per disegnare la sagoma
      imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);

      function callbackForVideo(result) {
        const mask = result.categoryMask.getAsFloat32Array();

        let shapePoints = []; // Raccolta dei punti della forma
        let orderedPoints = []; // Punti ordinati
        let j = 0;
        for (let i = 0; i < mask.length; ++i) {
          const maskVal = Math.round(mask[i] * 255.0);
          const index = maskVal % legendColors.length;

          if (index === 2) {
            if (isEdgePixel(i, mask, video.width)) {
              //se è un pixel al bordo della maschera
              const pixelIndex = Math.floor(j / 4);

              const coords = mapCoords(
                {
                  x: (pixelIndex % video.width) / video.width,
                  y: Math.floor(pixelIndex / video.width) / video.height,
                },
                videoSize
              );

              if (
                isNearLandmarks(coords.x, coords.y, points, videoSize.h / 9) //controllo che sia vicino ai landmarks della mano
              ) {
                shapePoints.push(coords); //allora li pusho nell'array dei punti che verranno disegnati
              }
            }
          }
          j += 4;
        }

        orderedPoints = orderShapePoints(shapePoints); // Ordina i punti prima di disegnare

        // Disegna la forma
        if (orderedPoints.length > 0) {
          stroke("white");
          strokeWeight(3);

          for (let i = 0; i < orderedPoints.length; i++) {
            const curr = orderedPoints[i];
            const next = orderedPoints[(i + 10) % orderedPoints.length]; // Punto successivo

            if (dist(curr.x, curr.y, next.x, next.y) < videoSize.h / 18) {
              // Disegna solo se la distanza è minore di 18 - così da evitare congiungimenti tra punti non vicini
              line(curr.x, curr.y, next.x, next.y);
            }
          }
        }
      }

      // chiamo funzione che confronta i LANDMARKS con quelli del json e mi restituisce la mano detectata
      const differences = calculateDifferences(handsData); //calcola la differenza tra gli angoli di riferimento e quelli
      const minDifference = Math.min(...differences);
      similarHand = differences.indexOf(minDifference);

      imgSCH.src = `assets/detection/${similarHand + 1}.png`;
      differenceElC.innerHTML = Math.round(minDifference);
    }
  }
};

function handCounter(detectedHand) {
  const maxCounter = 80; // Maximum counter value
  const loadingRadius = 75; // Radius of the loading circle
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
      strokeWeight(8);
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

      if (counters[detectedHand] >= maxCounter) {
        push();
        textFont(font);
        textSize(18);
        textAlign(CENTER);
        text("HURRAY! You have selected " + handPoses[i], 0, videoSize.h);
        pop();
      }
    } else if (counters[i] > 0) {
      counters[i]--;
    }
  });
  console.log(counters);
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

function orderShapePoints(points) {
  if (points.length === 0) return [];

  const ordered = [points[0]]; // Inizia con il primo punto
  const remaining = [...points.slice(1)]; // Copia i punti rimanenti

  while (remaining.length > 0) {
    let lastPoint = ordered[ordered.length - 1];
    let closestIndex = 0;
    let closestDistance = dist(
      lastPoint.x,
      lastPoint.y,
      remaining[0].x,
      remaining[0].y
    );

    // Trova il punto più vicino
    for (let i = 1; i < remaining.length; i++) {
      const d = dist(lastPoint.x, lastPoint.y, remaining[i].x, remaining[i].y);
      if (d < closestDistance) {
        closestDistance = d;
        closestIndex = i;
      }
    }

    // Aggiungi il punto più vicino all'array ordinato
    ordered.push(remaining[closestIndex]);
    remaining.splice(closestIndex, 1); // Rimuovi il punto selezionato dai rimanenti
  }

  return ordered;
}
function isEdgePixel(i, mask, videoWidth) {
  // Convert mask value to the same scale as we use in the main loop
  const currentMaskVal = Math.round(mask[i] * 255.0) % legendColors.length;
  if (currentMaskVal !== 2) return false;

  // Get row and column of current pixel
  const row = Math.floor(i / videoWidth);
  const col = i % videoWidth;

  // Check all 8 surrounding pixels
  const neighbors = [
    [-1, -1],
    [-1, 0],
    [-1, 1], // Top row
    [0, -1],
    [0, 1], // Middle row
    [1, -1],
    [1, 0],
    [1, 1], // Bottom row
  ];

  for (let [dx, dy] of neighbors) {
    const newRow = row + dx;
    const newCol = col + dy;

    // Skip if outside image bounds
    if (
      newRow < 0 ||
      newRow >= video.height ||
      newCol < 0 ||
      newCol >= videoWidth
    ) {
      continue;
    }

    // Get index in the mask array
    const neighborIndex = newRow * videoWidth + newCol;
    const neighborMaskVal =
      Math.round(mask[neighborIndex] * 255.0) % legendColors.length;

    // If any neighbor is not mask 2, this is an edge pixel
    if (neighborMaskVal !== 2) {
      return true;
    }
  }

  // If all neighbors are mask 2, this is not an edge pixel
  return false;
}

function isNearLandmarks(x, y, landmarks, threshold) {
  for (let landmark of landmarks) {
    const distance = Math.sqrt(
      Math.pow(landmark.x - x, 2) + Math.pow(landmark.y - y, 2)
    );
    if (distance < threshold) {
      return true;
    }
  }
  return false;
}

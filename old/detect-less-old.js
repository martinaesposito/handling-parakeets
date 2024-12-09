import {
  ImageSegmenter,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { Hand } from "../hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker,
  imageSegmenter,
  labels = null;

const legendColors = [
  [255, 197, 0, 255], // Vivid Yellow
  [128, 62, 117, 255], // Strong Purple
  [255, 104, 0, 255], // Vivid Orange - BODY COLOR
  [166, 189, 215, 255], // Very Light Blue
  [193, 0, 32, 255], // Vivid Red
];

let container = document.querySelector(".container");

let handsData, handsDataA; //le due prospettive della mano
let imgSCH = document.getElementById("scheletro");
let differenceElC = document.querySelector(".diff-c");

let p5, canvas;
let hands = [];

let video;
let lastVideoTime = -1;
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
let handimages = [];
let similarHandC;
let font;

function mapCoords(point, v) {
  //funzione per rimappare le coordinate dei punti della mano rispetto alla dimensione del video e alla dimensione della canva
  return {
    x: width - point.x * v.w + (v.w - width) / 2 - width / 2,
    y: point.y * v.h - (v.h - height) / 2 - height / 2,
    z: 0,
  };
}

const createHandLandmarker = async () => {
  //funzione async che chiama mediapipe
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

window.preload = async () => {
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"); //font

  for (let i = 1; i <= handPoses.length + 1; i++) {
    const img = loadImage(
      `assets/legend/${i}.svg`,
      () => {
        handimages[i] = img;
      },
      () => {
        console.warn(`Failed to load image: ${i}.png`); //warn + fallback if fails
      }
    );
  }
  console.log(handimages);
};

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight, WEBGL); // canvas quadrato
  pixelDensity(1);
  canvas = p5.canvas;
  container.appendChild(canvas);

  // handsDataB = await importJSON("json/training-b.json");
  handsData = [await importJSON("json/training.json")];

  video = createCapture(VIDEO);
  video.hide();

  createHandLandmarker(); // Avvia il riconoscimento delle mani
};

window.draw = () => {
  if (!video) return;

  background("#F5F5F5");

  videoSize = {
    h: height / 3,
    w: (height / 3 / video.height) * video.width,
  };

  scale(-1, 1);

  stroke("black");
  strokeWeight(2);
  rect(-videoSize.w / 2, -videoSize.h / 2, videoSize.w, videoSize.h);
  image(video, -videoSize.w / 2, -videoSize.h / 2, videoSize.w, videoSize.h);

  scale(-1, 1);
  drawHands();

  if (hands[0]?.points) {
    let cursor = hands[0].points[9].pos;

    const scale =
      videoSize.w / videoSize.h > width / height
        ? height / videoSize.h
        : width / videoSize.w;

    cursor.x *= scale;
    cursor.y *= scale;
    let cursorSize = 24;
    let cur;

    if (similarHandC || similarHandC == 0) {
      push();
      imageMode(CENTER);
      console.log(similarHandC + 1, handPoses[similarHandC]);
      cur = image(
        handimages[similarHandC + 1],
        cursor.x - cursorSize / 2,
        cursor.y - cursorSize / 2
      );
      pop();

      fill("red");
      strokeWeight(2);
      stroke(1);
      ellipse(cursor.x, cursor.y, 20);
    }
  }
};

const drawHands = () => {
  if (handLandmarker && video) {
    //VIDEO
    const video = document.querySelector("video");
    let startTimeMs = performance.now(); //ritorna un timestamp del video che mi serve da mandare a mediapipe per il riconoscimento dell'immagine
    if (video.currentTime) {
      // video.currentTime !== lastVideoTime &&
      //aggiorna solo quando sono differenti
      const handLandmarkerResult = handLandmarker.detectForVideo(
        video,
        startTimeMs
      );
      lastVideoTime = video.currentTime;

      const landmarks = handLandmarkerResult.landmarks[0];
      if (!landmarks) return;
      let points = landmarks?.map((p) => mapCoords(p, videoSize)); //prende i punti della mano e li rimappa

      if (!hands[0]) {
        hands[0] = new Hand(points, 0); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        hands[0].draw(points);
      }

      imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);

      function callbackForVideo(result) {
        const mask = result.categoryMask.getAsFloat32Array();

        let j = 0;
        // Disegna la forma con i punti ordinati
        let shapePoints = []; // Raccolta dei punti della forma
        let orderedPoints = []; // Punti ordinati

        for (let i = 0; i < mask.length; ++i) {
          const maskVal = Math.round(mask[i] * 255.0);
          const index = maskVal % legendColors.length;

          if (index === 2) {
            if (isEdgePixel(i, mask, video.width)) {
              const pixelIndex = Math.floor(j / 4);

              const coords = mapCoords(
                {
                  x: (pixelIndex % video.width) / video.width,
                  y: Math.floor(pixelIndex / video.width) / video.height,
                },
                videoSize
              );

              if (
                isNearLandmarks(coords.x, coords.y, points, videoSize.h / 9)
              ) {
                shapePoints.push(coords);
              }
            }
          }
          j += 4;
        }

        // Ordina i punti prima di disegnare
        orderedPoints = orderShapePoints(shapePoints);

        // Disegna la forma
        if (orderedPoints.length > 0) {
          stroke("white");
          strokeWeight(3);

          for (let i = 0; i < orderedPoints.length; i++) {
            const curr = orderedPoints[i];
            const next = orderedPoints[(i + 10) % orderedPoints.length]; // Punto successivo

            if (dist(curr.x, curr.y, next.x, next.y) < videoSize.h / 18) {
              // Disegna solo se la distanza è minore di 20

              line(curr.x, curr.y, next.x, next.y);
            }
          }
        }
      }

      const calculateAngleDifferences = (userAngles, refAngles) => {
        return userAngles.map((userAngle, index) =>
          Math.abs(userAngle - refAngles[index])
        );
      };

      const calculateDifferences = (dataSet) => {
        return dataSet.map((data) => {
          const absoluteWeight = 0.25; // Adjustable weight
          const relativeWeight = 0.75; // Adjustable weight

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
              (diff * absoluteWeight +
                relativeDifferences[index] * relativeWeight),
            0
          );

          return combinedScore;

          //   let diff = 0;
          //   data.angles.forEach(
          //     (dataAngle, index) =>
          //       (diff += Math.abs(dataAngle - hands[0].angles[index])) //alla differenza iniziale 0 sommo
          //   );
          //   return diff;
        });
      };

      const differences = handsData.map(
        (dataSet) => calculateDifferences(dataSet) //applico la funzione ad entrambi gli array di handsData
      );

      //prendo i due array di differenze risultanti e trovo quello la cui somma è la minore
      const minA = Math.min(...differences[0]);
      similarHandC = differences[0].indexOf(minA);
      console.log(similarHandC);
      imgSCH.src = `assets/detection/${similarHandC + 1}.png`;

      differenceElC.innerHTML = Math.round(minA);
    }
  }
};

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

async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

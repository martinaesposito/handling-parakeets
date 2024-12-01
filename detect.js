import {
  ImageSegmenter,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker,
  imageSegmenter,
  labels = undefined;

const legendColors = [
  [255, 197, 0, 255], // Vivid Yellow
  [128, 62, 117, 255], // Strong Purple
  [255, 104, 0, 255], // Vivid Orange
  [166, 189, 215, 255], // Very Light Blue
  [193, 0, 32, 255], // Vivid Red
  // [206, 162, 98, 255], // Grayish Yellow
  // [129, 112, 102, 255], // Medium Gray
  // [0, 125, 52, 255], // Vivid Green
  // [246, 118, 142, 255], // Strong Purplish Pink
  // [0, 83, 138, 255], // Strong Blue
  // [255, 112, 92, 255], // Strong Yellowish Pink
  // [83, 55, 112, 255], // Strong Violet
  // [255, 142, 0, 255], // Vivid Orange Yellow
  // [179, 40, 81, 255], // Strong Purplish Red
  // [244, 200, 0, 255], // Vivid Greenish Yellow
  // [127, 24, 13, 255], // Strong Reddish Brown
  // [147, 170, 0, 255], // Vivid Yellowish Green
  // [89, 51, 21, 255], // Deep Yellowish Brown
  // [241, 58, 19, 255], // Vivid Reddish Orange
  // [35, 44, 22, 255], // Dark Olive Green
  // [0, 161, 194, 255], // Vivid Blue
];

let container = document.querySelector(".container");

let handsData, handsDataA, handsDataB; //le due prospettive della mano
let imgSCH = document.getElementById("scheletro");
let differenceElC = document.querySelector(".diff-c");

let p5, canvas;
let hands = [];

let video;
let lastVideoTime = -1;
let videoSize;

function mapCoords(point, v) {
  //funzione per rimappare le coordinate dei punti della mano rispetto alla dimensione del video e alla dimensione della canva
  return {
    x: width - point.x * v.w + (v.w - width) / 2,
    y: point.y * v.h - (v.h - height) / 2,
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

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight); // canvas quadrato
  pixelDensity(1);
  canvas = p5.canvas;
  container.appendChild(canvas);

  handsDataA = await importJSON("json/training-a.json");
  handsDataB = await importJSON("json/training-b.json");
  handsData = [handsDataA, handsDataB];

  video = createCapture(VIDEO);

  createHandLandmarker(); // Avvia il riconoscimento delle mani
};

window.draw = () => {
  videoSize = {
    w: width > height ? width : (height / video.height) * video.width,
    h: height > width ? height : (width / video.width) * video.height,
  };

  drawHands();
};

const drawHands = () => {
  if (handLandmarker && video) {
    const video = document.querySelector("video");

    let startTimeMs = performance.now(); //ritorna un timestamp del video che mi serve da mandare a mediapipe per il riconoscimento dell'immagine

    if (video.currentTime !== lastVideoTime && video.currentTime) {
      //aggiorna solo quando sono differenti
      clear();

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
        const canvasCtx = canvas.getContext("2d");

        loadPixels();

        const mask = result.categoryMask.getAsFloat32Array();

        const img = createImage(video.width, video.height);
        img.loadPixels();

        let j = 0;
        for (let i = 0; i < mask.length; ++i) {
          const maskVal = Math.round(mask[i] * 255.0);

          const index = maskVal % legendColors.length;
          const legendColor = legendColors[index];

          if (index === 2) {
            img.pixels[j] = legendColor[0];
            img.pixels[j + 1] = legendColor[1];
            img.pixels[j + 2] = legendColor[2];
            img.pixels[j + 3] = 100;

            const pixelIndex = Math.floor(j / 4);

            fill("black");

            const point = mapCoords(
              {
                x: (pixelIndex % video.width) / video.width,
                y: Math.floor(pixelIndex / video.width) / video.height,
              },
              { w: video.width, h: video.height }
            );

            circle(point.x, point.y, 1);
          }
          j += 4;
        }
        img.updatePixels();

        push();
        scale(-1, 1);
        image(img, -width, 0, width, height);
      }

      const calculateDifferences = (dataSet) => {
        return dataSet.map((data) => {
          let diff = 0;
          data.angles.forEach(
            (dataAngle, index) =>
              (diff += Math.abs(dataAngle - hands[0].angles[index])) //alla differenza iniziale 0 sommo
          );
          return diff;
        });
      };

      const differences = handsData.map(
        //applico la funzione ad entrambi gli array di handsData
        (dataSet) => calculateDifferences(dataSet)
      );

      //prendo i due array di differenze risultanti e trovo quello la cui somma è la minore
      const minA = Math.min(...differences[0]);
      const similarHandC = differences[0].indexOf(minA);
      imgSCH.src = `assets/detection/${similarHandC + 1}c.png`;
      // console.log(imgSCH);

      differenceElC.innerHTML = Math.round(minA);
    }
  }
};

async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

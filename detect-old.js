import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { Hand } from "./hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker = undefined;

let container = document.querySelector(".container");

let handsData, handsDataA, handsDataB; //le due prospettive della mano
let imgALTO = document.getElementById("dall-alto");
let imgLATO = document.getElementById("di-lato");
let imgSCH = document.getElementById("scheletro");
let differenceElA = document.querySelector(".diff-a");
let differenceElB = document.querySelector(".diff-b");
let differenceElC = document.querySelector(".diff-c");

let p5, canvas;
let hands = [];

let video;
let lastVideoTime = -1;
let videoSize;

function mapCoords(point) {
  //funzione per rimappare le coordinate dei punti della mano rispetto alla dimensione del video e alla dimensione della canva
  return {
    x: width - point.x * videoSize.w + (videoSize.w - width) / 2,
    y: point.y * videoSize.h - (videoSize.h - height) / 2,
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

      let points = landmarks?.map((p) => mapCoords(p)); //prende i punti della mano e li rimappa

      if (!hands[0]) {
        hands[0] = new Hand(points, 0); //creo un'istanza dell'oggetto mano con le coordinate dei punti ricavati
      } else {
        hands[0].draw(points);
      }

      const calculateDifferences = (dataSet) => {
        return dataSet.map((data) => {
          let diff = 0;
          data.angles.forEach(
            (dataAngle, index) =>
              (diff += Math.abs(dataAngle - hands[0].angles[index])) //alla differenza iniziale 0 sommo
          );
          return diff;

          // return data.angles.map((dataAngle, index) => { //calcolo delle differenze tra tutti gli angoli rispetto a quello captato
          //   return Math.round(Math.abs(dataAngle - hands[0].angles[index]));
          // });
        });
      };

      const differences = handsData.map(
        //applico la funzione ad entrambi gli array di handsData
        (dataSet) => calculateDifferences(dataSet)
      );

      //prendo i due array di differenze risultanti e trovo quello la cui somma è la minore
      const minA = Math.min(...differences[0]);
      const minB = Math.min(...differences[1]);

      // const similarHandA = differences[0].indexOf(minA); // Ottieni l'indice di questi array trovati
      // const similarHandB = differences[1].indexOf(minB);
      const similarHandC = differences[0].indexOf(minA);

      // imgLATO.src = `assets/training/${similarHandA + 1}a.png`;
      // imgALTO.src = `assets/training/${similarHandB + 1}b.png`;
      imgSCH.src = `assets/detection/${similarHandC + 1}c.png`;
      // console.log(imgSCH);

      differenceElC.innerHTML = Math.round(minA);
      // differenceElB.innerHTML = Math.round(minB);
    }
  }
};

async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

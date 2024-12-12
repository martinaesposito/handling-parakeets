import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

import { Hand } from "../hand.js"; //importa l'oggetto mano definito nel javascript precedente

let handLandmarker = undefined;
let runningMode = "IMAGE";
let currentImage = 0;
let imageCount = 6;
// let imageCount = 113;

let handsData, newHandsData;

let container = document.querySelector(".container");
let img = document.querySelector("img");
const padding = 100;

let p5, canvas;
let hands = [];

function mapCoords(point) {
  const { width: imgWidth, height: imgHeight } = img.getBoundingClientRect();
  return {
    x: point.x * imgWidth + padding,
    y: point.y * imgHeight + padding,
    z: 0,
  };
}

const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
      minDetectionConfidence: 0.01,
      minPresenceConfidence: 0.01,
      minTrackingConfidence: 0.01,
    },
    runningMode,
    numHands: 1,
  });
  processImage();
};

const processImage = () => {
  // img.src = `assets/training/${currentImage + 1}a.png`;
  img.src = `assets/training/${currentImage + 1}.png`;

  img.onload = async () => {
    resizeCanvas(((windowHeight - 200) / 16) * 9 + 200, windowHeight);
    // resizeCanvas(windowHeight, windowHeight);
    drawHands(img);
  };
};

window.setup = async () => {
  p5 = createCanvas(((windowHeight - 200) / 16) * 9 + 200, windowHeight); // canvas sedici noni
  // p5 = createCanvas(windowHeight, windowHeight); // canvas quadrato
  pixelDensity(1);
  canvas = p5.canvas;
  container.appendChild(canvas);

  // handsData = await importJSON("json/training.json");
  handsData = await importJSON("json/training.json");
  newHandsData = handsData;

  createHandLandmarker(); // Avvia il riconoscimento delle mani
};

window.draw = () => {
  if (hands.map((h) => h.editing).includes(true)) {
    clear();
    hands.forEach((h) => h.draw());
  }
};

const drawHands = async (target) => {
  const handLandmarkerResult = await handLandmarker.detect(target);
  const landmarks = handLandmarkerResult.landmarks[0];

  console.log(newHandsData, handsData);

  let points =
    newHandsData[currentImage]?.points ??
    handsData[currentImage]?.points ??
    landmarks?.map((p) => mapCoords(p));

  if (!hands[0]) {
    hands[0] = new Hand(points, 0);
  } else {
    hands[0].draw(points);
  }

  newHandsData[currentImage] = {
    name: `${currentImage + 1}.png`,
    points,
    angles: hands[0].angles,
  };
};

function changeImage(index) {
  currentImage = index;
  processImage();
}

window.mouseDragged = () => {
  hands.forEach((h) => {
    h.movePoint({ x: mouseX, y: mouseY });

    newHandsData[currentImage] = {
      name: `${currentImage + 1}.png`,
      points: h.points.map((p) => p.pos),
      angles: hands[0].angles,
    };
  });
};

window.mousePressed = () => {
  hands.forEach((h) => {
    h.toggleSelectedPoint({ x: mouseX, y: mouseY });

    newHandsData[currentImage] = {
      name: `${currentImage + 1}.png`,
      points: h.points.map((p) => p.pos),
      angles: hands[0].angles,
    };
  });
};

window.mouseReleased = () => {
  hands.forEach((h) => h.deselect());
  newHandsData[currentImage] = {
    name: `${currentImage + 1}.png`,
    points: hands[0].points.map((p) => p.pos),
    angles: hands[0].angles,
  };
};

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") {
    changeImage(Math.max(currentImage - 1, 0));
  } else if (e.code === "ArrowRight") {
    changeImage(Math.min(currentImage + 1, imageCount));
  } else if (e.code === "Enter") {
    saveJSON();
  } else if (e.code === "Space") {
    console.log("s");
    //S
    window.saveCanvas(`${currentImage + 1}.png`);
  }
});

function saveJSON() {
  const jsonString = JSON.stringify(newHandsData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "training.json";
  // a.download = "json/hands.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importJSON(path) {
  const response = await fetch(path);
  const data = await response.json();
  return data;
}

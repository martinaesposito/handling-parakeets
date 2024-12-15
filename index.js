let font;

let container = document.querySelector(".container");
let p5, canvas;

// TITOLONE
let imgPoints = []; //array dei punti dei titoli
let time = 0;
let targetPositions = []; // Store target positions for easing
let currentPositions = []; // Store current positions for easing
let velocities = []; // Store velocities for each point

let points = [];
let fontSize = 200;

let bounds1, bounds2;
let subTitle;

//immaginine
let images = [];

// colori dei rettangolini alernativi alle immagini
const colors = [
  "#87BDF3",
  "#7DE44A",
  "#BDFF91",
  "#2CA02C",
  "#FCFF5C",
  "#009DB8",
  "#2E7F2E",
];

import {
  preload as detectPreload,
  setup as detectSetup,
  draw as detectDraw,
  cursor as detectCursor,
  handimages,
} from "./detect.js";

// //////////////////////////////////////////////////////////////////////////
window.preload = async () => {
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf");

  //immaginine piccole
  const BATCH_SIZE = 50;
  for (let batch = 0; batch < Math.ceil(885 / BATCH_SIZE); batch++) {
    const batchPromises = [];
    const start = batch * BATCH_SIZE + 2;
    const end = Math.min(start + BATCH_SIZE, 887);

    for (let i = start; i < end; i++) {
      const imagePromise = new Promise((resolve) => {
        // OPTIMIZATION: Use smaller image formats and sizes when possible
        const img = loadImage(
          `assets/image-compress/${i}.webp`,
          () => resolve(img),
          () => resolve(null)
        );
      });
      batchPromises.push(imagePromise);
    }

    const batchResults = await Promise.all(batchPromises);
    images.push(...batchResults.filter((img) => img !== null));
  }

  detectPreload();
};

// SETUP
window.setup = async () => {
  // CANVAS
  p5 = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  canvas = p5.canvas;
  container.appendChild(canvas);

  imageMode(CENTER);
  rectMode(CENTER);

  // TITOLONE
  // Measure text bounds
  bounds1 = font.textBounds("Handling", 0, 0, fontSize);
  bounds2 = font.textBounds("Parakeets", 0, 0, fontSize);
  const sampleFactor = 0.25;

  // Get points with translation and add points to array
  points = [
    ...font.textToPoints("Handling", -bounds1.w / 2, -bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
    ...font.textToPoints("Parakeets", -bounds2.w / 2, bounds1.h / 2, fontSize, {
      sampleFactor,
    }),
  ];

  // Initialize positions and velocities
  points.forEach((p, i) => {
    let img = {
      img: i < images.length ? images[i] : images[floor(random(images.length))], //prima prende le immagini in ordine ma se finiscono ne prende altre a caso,
      size: random(12.5, 15),
      c: random(colors),
      type: random() > 0.5 ? "image" : "rect",
    };
    imgPoints.push(img);

    // Initialize positions
    currentPositions[i] = createVector(p.x, p.y);
    targetPositions[i] = createVector(p.x, p.y);
    velocities[i] = createVector(0, 0);
  });

  // SUBTITLE
  subTitle = document.getElementById("subtitle");
  subTitle.style.top = `${height / 2 + (bounds1.h * 3) / 4}px`; // Adjust as needed

  detectSetup();
  loading.style.display = "none"; //nascondo il loading
};

// Easing function
function easeOutCubic(t) {
  return 1 - pow(1 - t, 2);
}

window.draw = () => {
  // background("#F5F5F5");
  clear();
  time += 0.01;

  points.forEach((p, i) => {
    // Calculate noise-based movement
    let xOffset = map(noise(i, time * 0.5), 0, 1, -12, 12);
    let yOffset = map(noise(i, (time + 300) * 0.5), 0, 1, -12, 12);

    // Calculate mouse interaction
    let dx = detectCursor ? p.x - detectCursor.x : p.x;
    let dy = detectCursor ? p.y - detectCursor.y : p.y;
    let distance = sqrt(dx * dx + dy * dy);

    // Update target position
    targetPositions[i].x = p.x + xOffset;
    targetPositions[i].y = p.y + yOffset;

    // Apply mouse repulsion
    let repulsionRadius = imgPoints[i].size * 4;
    if (detectCursor && distance < repulsionRadius) {
      let repulsionForce = map(distance, 0, repulsionRadius, 1, 0);
      repulsionForce = easeOutCubic(repulsionForce) * (imgPoints[i].size * 2);
      let angle = atan2(dy, dx);
      targetPositions[i].x += cos(angle) * repulsionForce;
      targetPositions[i].y += sin(angle) * repulsionForce;
    }

    // Smooth movement towards target position
    let easing = 0.3; // Adjust this value to control smoothness (lower = smoother)
    let dx2 = targetPositions[i].x - currentPositions[i].x;
    let dy2 = targetPositions[i].y - currentPositions[i].y;

    // Apply easing to velocity
    velocities[i].x = lerp(velocities[i].x, dx2 * easing, 1);
    velocities[i].y = lerp(velocities[i].y, dy2 * easing, 1);

    // Update current position with velocity
    currentPositions[i].x += velocities[i].x;
    currentPositions[i].y += velocities[i].y;

    noStroke();
    // VERSIONE CON IMMAGINI + RECT
    // if (imgPoints[i].type == "image") {
    //   // Draw image
    //   image(
    //     imgPoints[i].img,
    //     currentPositions[i].x + xOffset / 100,
    //     currentPositions[i].y + yOffset / 100,
    //     imgPoints[i].size,
    //     imgPoints[i].size
    //   );
    // } else {
    //   // Draw colored rect
    //   fill(imgPoints[i].c);
    //   rect(
    //     currentPositions[i].x + xOffset / 100,
    //     currentPositions[i].y + yOffset / 100,
    //     imgPoints[i].size,
    //     imgPoints[i].size
    //   );
    // }

    // VERSIONE CON SOLO IMMAGINI
    // Draw image at current position
    // image(
    //   imgPoints[i].img,
    //   currentPositions[i].x + xOffset / 100,
    //   currentPositions[i].y + yOffset / 100,
    //   imgPoints[i].size,
    //   imgPoints[i].size
    // );
    // noStroke();

    // VERSIONE CON SOLO RETTANGOLINI
    fill(imgPoints[i].c);
    rect(
      currentPositions[i].x + xOffset / 100,
      currentPositions[i].y + yOffset / 100,
      imgPoints[i].size
    );
  });

  translate(0, 0, 1);
  detectDraw(false);

  // TOLGO LA PARTE DEL CURSORE
  // if (!detectCursor && handimages?.[4]?.width) {
  //   const handImage = handimages[4];
  //   image(
  //     handImage,
  //     0,
  //     (bounds1.h * 4) / 3.2,
  //     (handImage.width / 3) * 2,
  //     (handImage.height / 3) * 2
  //   );
  // }
};

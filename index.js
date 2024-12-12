let font;
let imagePromises = [];
let images = [];

let imgPoints = [];
let time = 0;
let targetPositions = []; // Store target positions for easing
let currentPositions = []; // Store current positions for easing
let velocities = []; // Store velocities for each point

let container = document.querySelector(".container");
let p5, canvas;

let points = [];
const prak = "#C9FF4C";
let fontSize = 200;

let bounds1;
let bounds2;
let subTitle;
let colors = [
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
  font = loadFont("assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"); //font

  for (let i = 2; i < 887; i++) {
    //carico tutte le immagini di tutti i listings
    const imagePromise = new Promise((resolve) => {
      const img = loadImage(
        `assets/image-compress/${i}.webp`,
        () => {
          images.push(img);
          resolve(img);
        },
        () => {
          resolve(null); // Resolve with null if image fails to load
        }
      );
    });
    imagePromises.push(imagePromise);
  }

  await Promise.all(imagePromises); // Wait for all image loading attempts to complete
  console.log(images); //controllo che ci siano tutte e che siano corrette
  detectPreload();
};

// Setup
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
  // Get points with translation
  let points1 = font.textToPoints(
    "Handling",
    -bounds1.w / 2,
    -bounds1.h / 2,
    fontSize,
    {
      sampleFactor: 0.4,
    }
  );
  let points2 = font.textToPoints(
    "Parakeets",
    -bounds2.w / 2,
    bounds1.h / 2,
    fontSize,
    {
      sampleFactor: 0.4,
    }
  );
  // Add points to array
  points = [...points1, ...points2];
  // Initialize positions and velocities
  points.forEach((p, i) => {
    let immg =
      i < images.length ? images[i] : images[floor(random(images.length))];
    let img = {
      img: immg,
      size: random(5, 15),
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
  subTitle.style.top = `${height / 2 + (bounds1.h * 3.2) / 4}px`; // Adjust as needed

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

    // Draw image at current position
    // image(
    //   imgPoints[i].img,
    //   currentPositions[i].x + xOffset / 100,
    //   currentPositions[i].y + yOffset / 100,
    //   imgPoints[i].size,
    //   imgPoints[i].size
    // );
    // noStroke();
    fill(imgPoints[i].c);
    rect(
      currentPositions[i].x + xOffset / 100,
      currentPositions[i].y + yOffset / 100,
      imgPoints[i].size
    );
  });

  translate(0, 0, 1);
  detectDraw(false);

  if (!detectCursor && handimages.length > 0) {
    image(
      handimages[4],
      0, // x-coordinate (center)
      (bounds1.h * 4) / 3.2, // y-coordinate
      (handimages[4].width / 3) * 2,
      (handimages[4].height / 3) * 2
    );
  }
};

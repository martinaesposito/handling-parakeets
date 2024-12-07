//LOADING
let loading = document.getElementById("loading");
let imgLoading = (document.getElementById("loading-img").src =
  "assets/loading/" + Math.floor(Math.random() * 8 + 1).toString() + ".gif");

//P5
let p5, canvas, font;
let container = document.querySelector(".container");

let branchesss = [];
let dotsxBranch;

const branchPlatform = [
  { value: 149, start: 0.3, end: 0.7, name: "usato.it" },
  { value: 14, start: 0.6, end: 0.8, name: "TrovaPet" },
  { value: 3, start: 0.9, end: 1, name: "petpappagalli" },
  { value: 44, start: 0.45, end: 0.55, name: "Telegram" },
  { value: 7, start: 0.9, end: 1, name: "animalissimo" },
  { value: 12, start: 0.6, end: 0.7, name: "Trovalosubito" },
  { value: 11, start: 0.85, end: 0.9, name: "likesx" },
  { value: 149, start: 0.5, end: 1, name: "FB pages" },
  { value: 10, start: 0.6, end: 0.7, name: "Secondamano" },
  { value: 18, start: 0.9, end: 1, name: "AnimaleAmico" },
  { value: 14, start: 0.4, end: 0.6, name: "FB marketplace" },
  { value: 177, start: 0.2, end: 0.9, name: "FB groups" },
  { value: 19, start: 0.8, end: 0.9, name: "AAAnnunci" },
  { value: 11, start: 0.5, end: 0.6, name: "trovacuccioli" },
  { value: 3, start: 0.9, end: 1, name: "petfocus" },
  { value: 94, start: 0.8, end: 1, name: "Clasf.it" },
];

const handPoses = [
  "Finger perch",
  "Grip",
  "Half-closed",
  "Open",
  "Relaxed",
  "Shell",
  "Touching tips",
];
let pose;

let images = [];
const imagePromises = [];

let dots = [];
import { Dot } from "./listings.js";

let listingsDataReady = false;

let meCamera;

function processData(jsonData) {
  // Group data by platform
  const platformGroups = {};
  jsonData.forEach((item) => {
    if (!platformGroups[item.Platform]) {
      platformGroups[item.Platform] = [];
    }
    platformGroups[item.Platform].push(item);
  });

  // Create combined data structure maintaining original branch config
  return branchPlatform.map((config) => ({
    value: platformGroups[config.name]?.length || config.value, // Use original value if no data
    start: config.start,
    end: config.end,
    name: config.name,
    items: platformGroups[config.name] || [], // Store platform items
  }));
}

window.preload = async () => {
  font = loadFont("assets/fonts/HelveticaLTStd-Roman.otf");

  for (let i = 2; i < 886; i++) {
    const imagePromise = new Promise((resolve) => {
      const img = loadImage(
        "assets/immagini/" + i + ".png",
        () => {
          images.push(img);
          resolve(img);
        },
        () => {
          console.log(`Skipping image ${i}.png`);
          resolve(null); // Resolve with null if image fails to load
        }
      );
    });

    imagePromises.push(imagePromise);
  }

  // Wait for all image loading attempts to complete
  await Promise.all(imagePromises);
  console.log(images);

  try {
    const response = await fetch("listings.json");
    const jsonData = await response.json();

    window.listingsData = processData(jsonData);
    listingsDataReady = true;
  } catch (error) {
    console.error("Failed to load listings data", error);
    window.listingsData = branchPlatform.map((config) => ({
      ...config,
      items: [],
    }));
    listingsDataReady = true;
  }
};

window.setup = async () => {
  // Fetch your JSON data (replace with your actual data source)

  if (!listingsDataReady) {
    setTimeout(window.setup, 10);
    return;
  }
  loading.style.display = "none";
  // Process the data
  dotsxBranch = window.listingsData;

  p5 = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  rectMode(CENTER);
  imageMode(CENTER);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background("#F5F5F5");
  textFont(font);

  // ANGLES
  const totalDots = dotsxBranch.reduce((acc, { value }) => acc + value, 0);
  const angles = dotsxBranch.map(({ value }) =>
    Math.max(0.15, 2 * PI * (value / totalDots))
  );

  let total = 0;
  console.log(angles);

  angles.forEach((a, index) => {
    const angle = total + a / 2 + (index > 0 ? angles[index - 1] / 2 : 0);

    const bounds = {
      start: {
        x: 0,
        y: 0,
      },
      end: {
        x: 0 + (width / 2.4) * cos(angle),
        y: 0 + (height / 2.4) * sin(angle),
      },
    };

    const branch = Object.fromEntries(
      Object.entries(bounds).map(([key, value]) => [
        key,
        Object.fromEntries(
          Object.entries(value).map(([k, v]) => [
            k,
            map(dotsxBranch[index][key], 0, 1, bounds.start[k], bounds.end[k]),
          ])
        ),
      ])
    );

    total = angle;

    branchesss.push({ bounds, ...branch, angleWidth: a });
  });

  dots = generateBranchDots(branchesss);
};

let z = 800;
let targetZ = 800;
window.draw = () => {
  // Reset completo del background ad ogni frame
  clear();
  background("#F5F5F5");
  textFont(font);

  z += (targetZ - z) * 0.1; // Adjust 0.1 to control zoom speed
  camera(0, 0, z);

  branchesss.forEach(({ bounds: { start, end } }, index) => {
    stroke("lightgray");
    strokeWeight(1);
    line(start.x, start.y, end.x, end.y);
    noStroke();
    fill("black");
    //text(`${index} - ${dotsxBranch[index].name}`, end.x, end.y);
    text(`${dotsxBranch[index].name}`, end.x, end.y);
  });

  // Update and draw dots
  dots.forEach((dot) => {
    dot.move(dots, pose); // Single iteration per frame for smooth animation
    dot.draw(pose, images);
  });

  let cW = 150;
  let cH = (150 / 4) * 3;

  push();
  strokeWeight(1);
  stroke("black");
  noFill();
  meCamera = rect(0, 0, cW, cH);
  pop();

  if (pose) {
    textAlign(CENTER);
    text(pose, 0, cH / 2 + 25);
  }
};

function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];
    const items = dotsxBranch[bIndex].items;

    items.forEach((item, i) => {
      const dot = new Dot(
        branch,
        allDots.length + branchDots.length,
        random(12.5, 15),
        "image",
        item // Pass the full item data
      );
      branchDots.push(dot);
    });

    allDots.push(...branchDots);
  });

  // Initial overlap resolution
  for (let i = 0; i < 50; i++) {
    allDots.forEach((dot) => {
      dot.move(allDots);
    });
  }

  return allDots;
}

window.keyPressed = () => {
  pose = null;

  const keyNum = parseInt(key); // Convert key to number and check if it's within valid range
  if (keyNum >= 1 && keyNum <= handPoses.length) {
    pose = handPoses[keyNum - 1];
    let poseIndex = keyNum;

    const matchingDots = dots.filter((dot) => dot.shouldHighlight(pose));
    console.log(`Found ${matchingDots.length} dots matching pose: ${pose}`);
    targetZ = 400;
  } else targetZ = 800;
};

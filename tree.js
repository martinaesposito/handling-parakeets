//P5
let p5, canvas;
let container = document.querySelector(".container");

let branchesss = [];
let dotsxBranch;

const branchConfig = [
  { value: 19, start: 0.7, end: 0.8, name: "AAAnnunci" },
  { value: 18, start: 0.7, end: 0.8, name: "AnimaleAmico" },
  { value: 7, start: 0.7, end: 0.8, name: "animalissimo" },
  { value: 3, start: 0.6, end: 0.7, name: "petfocus" },
  { value: 3, start: 0.1, end: 0.3, name: "petpappagalli" },
  { value: 94, start: 0.4, end: 1, name: "Clasf.it" },
  { value: 11, start: 0.85, end: 0.9, name: "likesx" },
  { value: 10, start: 0.4, end: 0.5, name: "Secondamano" },
  { value: 150, start: 0.3, end: 0.9, name: "Subito.it" },
  { value: 44, start: 0.6, end: 0.9, name: "Telegram" }, //telegram
  { value: 11, start: 0.9, end: 1, name: "trovacuccioli" },
  { value: 177, start: 0.2, end: 1, name: "FB groups" }, //Facebook groups
  { value: 12, start: 0.7, end: 1, name: "Trovalosubito" },
  { value: 14, start: 0.3, end: 0.6, name: "FB marketplace" }, //marketplace
  { value: 149, start: 0.3, end: 0.9, name: "FB pages" }, //pages
  { value: 14, start: 0.5, end: 1, name: "TrovaPet" },
  { value: 149, start: 0.2, end: 1, name: "usato.it" },
];

let dots = [];
import { Dot } from "./listings.js";

let font;

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
  return branchConfig.map((config) => ({
    value: platformGroups[config.name]?.length || config.value, // Use original value if no data
    start: config.start,
    end: config.end,
    name: config.name,
    items: platformGroups[config.name] || [], // Store platform items
  }));
}

let listingsDataReady = false;

window.preload = async () => {
  font = loadFont("/assets/Helvetica/HelveticaLTStd-Roman.otf");

  try {
    const response = await fetch("listings.json");
    const jsonData = await response.json();

    window.listingsData = processData(jsonData);
    listingsDataReady = true;
  } catch (error) {
    console.error("Failed to load listings data", error);
    window.listingsData = branchConfig.map((config) => ({
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
  // Process the data
  dotsxBranch = window.listingsData;

  p5 = createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  rectMode(CENTER);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  textFont(font);

  // Rest of your setup code remains the same
  const totalDots = dotsxBranch.reduce((acc, { value }) => acc + value, 0);
  const angles = dotsxBranch.map(({ value }) =>
    Math.max(0.2, map(value, 0, totalDots, 0, 2 * PI))
  );

  let total = 0;

  angles.forEach((a, index) => {
    const angle = total + a / 2 + (index > 0 ? angles[index - 1] / 2 : 0);

    const bounds = {
      start: {
        x: 0,
        y: 0,
      },
      end: {
        x: 0 + (width / 2.2) * cos(angle),
        y: 0 + (height / 2.2) * sin(angle),
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

window.draw = () => {
  // Reset completo del background ad ogni frame
  clear();
  background(245);

  textFont(font);

  camera(0, 0, 800);

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
    dot.move(dots, 1); // Single iteration per frame for smooth animation
    dot.draw();
  });
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
        random(11, 13),
        "ellipse",
        item // Pass the full item data
      );
      branchDots.push(dot);
    });

    allDots.push(...branchDots);
  });

  // Initial overlap resolution
  for (let i = 0; i < 50; i++) {
    allDots.forEach((dot) => {
      dot.move(allDots, 1);
    });
  }

  return allDots;
}

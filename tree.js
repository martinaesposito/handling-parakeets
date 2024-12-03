//P5
let p5, canvas;
let container = document.querySelector(".container");

// MAIN ALBERO
let branchLength;
let p = 0;
let l;
let branchesss = [];
let nBranches = 15;
let r = 12.5;
let rDots = [];

let dotsxBranch = [
  19,
  18,
  7,
  94,
  11,
  3,
  3,
  10,
  150,
  44, //telegram
  11,
  177, //Facebook groups
  12,
  14, //marketplace
  149, //pages
  14,
  149,
];

let dots = [];
import { Dot } from "./listings.js";

// Store tree drawing parameters
let treeParams = {
  baseX: 0,
  baseY: 0,
  trunk: 0,
  branches: [], // Will store all branch positions and parameters
};

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  //ALBERO
  calculateTreeStructure();

  // LISTINGS
  dots = generateBranchDots(branchesss);

  for (let d of dots) {
    d = random(7.5, 15);
    rDots.push(d);
  }
};

window.draw = () => {
  // Reset completo del background ad ogni frame
  clear();
  background(245);

  drawTreeFromParams();

  dots.forEach((dot, i) => {
    // Impostiamo il blend mode prima di disegnare ogni dot
    blendMode(MULTIPLY);
    dot.move(10, 0.03);
    dot.draw(rDots[i]);
  });

  // Resettiamo il blend mode alla fine
  blendMode(BLEND);
};

function generateBranchDots(branches) {
  const allDots = []; // Array per tutti i dots finali di tutti i rami

  branches.forEach((branch, bIndex) => {
    const branchLength = dist(
      branch.start.x,
      branch.start.y,
      branch.end.x,
      branch.end.y
    );

    const branchAngle = atan2(
      branch.end.y - branch.start.y,
      branch.end.x - branch.start.x
    );

    // Parametri della parabola
    const a = -1;
    const h = 1 / 2;
    const k = 1;

    let currentBranchDots = [];

    while (currentBranchDots.length < dotsxBranch[bIndex]) {
      let t = random();
      const density = a * pow(t - h, 2) + k;

      if (random() < density) {
        // Calcola l'offset come percentuale della lunghezza del ramo (es. 10%)
        const offsetDistance = branchLength * 0.15;

        // Applica l'offset considerando l'angolo del ramo
        const offsetX = cos(branchAngle) * offsetDistance;
        const offsetY = sin(branchAngle) * offsetDistance;

        // Usa il punto di partenza spostato per il lerp
        const baseX = lerp(branch.start.x + offsetX, branch.end.x, t);
        const baseY = lerp(branch.start.y + offsetY, branch.end.y, t);

        const spread = map(t, 0, 1, branchLength * 0.03, branchLength * 0.09);
        const perpAngle = branchAngle + HALF_PI;
        const distance = randomGaussian() * spread;

        const finalX = baseX + cos(perpAngle) * distance;
        const finalY = baseY + sin(perpAngle) * distance;

        let validPosition = true;

        // Controlla distanza r con i dots dello stesso ramo
        for (const sameBranchDot of currentBranchDots) {
          const d = dist(
            finalX,
            finalY,
            sameBranchDot.pos.x,
            sameBranchDot.pos.y
          );
          if (d < r) {
            validPosition = false;
            break;
          }
        }

        // Se la posizione è ancora valida, controlla distanza r*2 con i dots degli altri rami
        if (validPosition) {
          for (const otherBranchDot of allDots) {
            const d = dist(
              finalX,
              finalY,
              otherBranchDot.pos.x,
              otherBranchDot.pos.y
            );
            if (d < r * 2) {
              validPosition = false;
              break;
            }
          }
        }

        if (validPosition) {
          currentBranchDots.push(
            new Dot(
              { x: finalX, y: finalY },
              allDots.length + currentBranchDots.length,
              "ellipse"
            )
          );
        }
      }
    }

    // Aggiungi tutti i dots del ramo corrente all'array principale
    allDots.push(...currentBranchDots);
  });

  return allDots;
}

// Function to calculate tree structure and store parameters
function calculateTreeStructure() {
  const trunk = (height / 3) * 2.5;
  const baseX = width / 2;
  const baseY = height / 3 + 50;

  treeParams = {
    baseX,
    baseY,
    trunk,
    branches: [],
  };

  let p = 0;
  let heightProgress = 0;
  const maxDots = Math.max(...dotsxBranch);

  for (let i = nBranches; i > 0; i--) {
    heightProgress = i / (nBranches - 1);
    const dotsForThisBranch = dotsxBranch[nBranches - i];
    const scaleFactor = Math.log(dotsForThisBranch + 1) / Math.log(maxDots + 1);
    branchLength =
      lerp(trunk - 500, trunk - 100, scaleFactor) * (1 - heightProgress * 0.5);

    l = i % 2 === 0 ? 1 : -1; //cambia il valore di l in base a i se i è pari allora 1 se no -1 - serve per disegnare i rami a destra e sinistra dell'albero
    let baseAngle = map(heightProgress, 0, 1, -PI / 18, PI / 3.5);
    let angleVariation = baseAngle + random(-PI / 24, PI / 24);
    let mainBranchAngle = l * angleVariation;

    let mainBranchEndX = cos(mainBranchAngle) * branchLength * l;
    let mainBranchEndY = -abs(sin(mainBranchAngle) * branchLength);

    // Store main branch parameters
    treeParams.branches.push({
      type: "main",
      start: { x: 0, y: p },
      end: { x: mainBranchEndX, y: p + mainBranchEndY },
      width: 6,
      heightProgress,
    });

    // Calculate and store sub-branches
    let subBranchMaxLength = branchLength * (0.4 * scaleFactor);
    let subBranchMinLength = branchLength * (0.2 * scaleFactor);

    // First sub-branch
    let randomPoint1 = random(0.3, 0.8);
    calculateSubBranch(
      mainBranchEndX * randomPoint1,
      p + mainBranchEndY * randomPoint1,
      mainBranchAngle,
      l,
      PI / 12,
      PI / 6,
      subBranchMinLength,
      subBranchMaxLength,
      heightProgress
    );

    // Second sub-branch
    let randomPoint2 = random(0.2, 0.9);
    calculateSubBranch(
      mainBranchEndX * randomPoint2,
      p + mainBranchEndY * randomPoint2,
      mainBranchAngle,
      l,
      -PI / 6,
      -PI / 12,
      subBranchMinLength,
      subBranchMaxLength,
      heightProgress
    );

    let pr = (p += 27.5);
    console.log(pr);
  }

  // Calculate branch vectors for dots
  branchesss = treeParams.branches
    .filter((branch) => branch.type === "main")
    .map((branch) => ({
      start: createVector(
        branch.start.x + treeParams.baseX,
        branch.start.y + treeParams.baseY
      ),
      end: createVector(
        branch.end.x + treeParams.baseX,
        branch.end.y + treeParams.baseY
      ),
    }));
}

function calculateSubBranch(
  startX,
  startY,
  mainBranchAngle,
  l,
  angleRangeMin,
  angleRangeMax,
  lengthRangeMin,
  lengthRangeMax,
  heightProgress
) {
  let subAngle = mainBranchAngle + l * random(angleRangeMin, angleRangeMax);
  let subLength = random(lengthRangeMin, lengthRangeMax);
  let subBranchWidth = map(heightProgress, 0, 1, 1.25, 0.75);

  let endX = startX + cos(subAngle) * subLength * l;
  let endY = startY - abs(sin(subAngle) * subLength);

  treeParams.branches.push({
    type: "sub",
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    width: subBranchWidth,
    heightProgress,
  });
}

function drawTreeFromParams() {
  push();
  translate(treeParams.baseX, treeParams.baseY);

  // Draw trunk
  strokeWeight(4);
  stroke(180);
  line(0, 0, 0, treeParams.trunk);

  // Draw all branches
  treeParams.branches.forEach((branch) => {
    strokeWeight(branch.type === "main" ? 2 : branch.width);
    stroke(180);
    line(branch.start.x, branch.start.y, branch.end.x, branch.end.y);
  });

  pop();
}

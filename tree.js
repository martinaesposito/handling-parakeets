//P5
let p5, canvas;
let container = document.querySelector(".container");

// MAIN ALBERO
let branchLength;
let p = 0;
let l;
let branchesss = [];

let dots = [];
import { Dot } from "./listings.js";

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight); // canvas quadrato
  pixelDensity(1);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  //ALBERO
  push();
  translate(width / 2, height / 3); // Sposta l'origine a un terzo dall'alto dello schermo
  drawTree((height / 3) * 2, 6); // Disegna l'albero alto due terzi dello schermo con 6 rami = framings
  pop();

  // LISTINGS
  dots = generateValidDots(branchesss, 885);
};

// Helper function to convert local coordinates to global
function localToGlobal(x, y, baseX, baseY) {
  return {
    x: x + baseX,
    y: y + baseY,
  };
}

window.draw = () => {
  for (let dot of dots) {
    dot.move(5, 0.1); // Movimento fluido con noise (fattore e velocità)

    // blendMode(MULTIPLY);
    dot.draw(7); // Disegna i punti con raggio 30
  }
};

function generateValidDots(branches, totalDotsNeeded) {
  const dots = [];
  const allValidDots = []; // Keep track of all valid dots for distance checking

  while (dots.length < totalDotsNeeded) {
    // Randomly select a branch to add dots to
    const branchIndex = Math.floor(random(branches.length));
    const branch = branches[branchIndex];
    const start = branch.start;
    const end = branch.end;

    // Generate a single candidate dot
    let t = random();
    let spreadMultiplier = 1 - 4 * Math.pow(t - 0.5, 2);
    let baseSpreadFactor = 30;
    let spreadFactor = baseSpreadFactor * spreadMultiplier;

    let baseX = lerp(start.x, end.x, t);
    let baseY = lerp(start.y, end.y, t);

    let gaussianSpread = randomGaussian() * spreadFactor;
    let angle = random(TWO_PI);

    let finalX = baseX + cos(angle) * abs(gaussianSpread);
    let finalY = baseY + sin(angle) * abs(gaussianSpread);

    // Check if the new dot is valid
    let valid = true;
    for (let existingDot of allValidDots) {
      let d = dist(finalX, finalY, existingDot.x, existingDot.y);
      if (d < 7) {
        valid = false;
        break;
      }
    }

    // If valid, add it to both tracking arrays
    if (valid) {
      const newDot = new Dot({ x: finalX, y: finalY }, dots.length, "ellipse");
      dots.push(newDot);
      allValidDots.push({ x: finalX, y: finalY });
    }
  }

  return dots;
}

function drawTree(trunk, branches) {
  // TRONCO
  const baseX = width / 2;
  const baseY = height / 3;

  // TRONCO
  strokeWeight(5);
  line(0, -15, 0, trunk);

  //RAMI
  strokeWeight(2);
  for (let i = 0; i < branches; i++) {
    stroke("black");
    branchLength = Math.round(random(200, trunk - 150));
    l = i % 2 === 0 ? 1 : -1;

    let mainBranchStartPos = localToGlobal(0, p, baseX, baseY); //pozisione di partenza del tronco

    let mainBranchAngle = l * (PI / 6 - random(-PI / 18, PI / 18));
    let mainBranchEndX = cos(mainBranchAngle) * branchLength * l;
    let mainBranchEndY = -abs(sin(mainBranchAngle) * branchLength);

    // MAINBRANCH
    strokeWeight(2.5);
    line(0, p, mainBranchEndX, p + mainBranchEndY);

    //converto le coordinate
    let mainBranchEndPos = localToGlobal(
      mainBranchEndX,
      p + mainBranchEndY,
      baseX,
      baseY
    );
    //e le pusho nell'array
    branchesss.push({
      start: createVector(mainBranchStartPos.x, mainBranchStartPos.y),
      end: createVector(mainBranchEndPos.x, mainBranchEndPos.y),
    });

    // SUB BRANCHES
    let randomPoint1 = random(0.3, 0.8);
    let startX1 = mainBranchEndX * randomPoint1;
    let startY1 = p + mainBranchEndY * randomPoint1;

    drawSubBranch(
      startX1,
      startY1,
      mainBranchAngle,
      l,
      PI / 12,
      PI / 6,
      25,
      branchLength / 3,
      baseX,
      baseY
    );

    let randomPoint2 = random(0.2, 0.9);
    let startX2 = mainBranchEndX * randomPoint2;
    let startY2 = p + mainBranchEndY * randomPoint2;

    drawSubBranch(
      startX2,
      startY2,
      mainBranchAngle,
      l,
      -PI / 6,
      -PI / 12,
      25,
      branchLength / 3,
      baseX,
      baseY
    );

    p += trunk / 9;
  }
}

function drawSubBranch(
  startX,
  startY,
  mainBranchAngle,
  l,
  angleRangeMin,
  angleRangeMax,
  lengthRangeMin,
  lengthRangeMax,
  baseX,
  baseY
) {
  strokeWeight(1.25);

  let subAngle = mainBranchAngle + l * random(angleRangeMin, angleRangeMax);
  let subLength = random(lengthRangeMin, lengthRangeMax);

  let endX = startX + cos(subAngle) * subLength * l;
  let endY = startY - abs(sin(subAngle) * subLength);

  // SUBBRANCH
  line(startX, startY, endX, endY);

  // converto le coordinate
  let subBranchStart = localToGlobal(startX, startY, baseX, baseY);
  let subBranchEnd = localToGlobal(endX, endY, baseX, baseY);
  // e le pusho nell'array
  branchesss.push({
    start: createVector(subBranchStart.x, subBranchStart.y),
    end: createVector(subBranchEnd.x, subBranchEnd.y),
  });
}

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
  let dotsPerBranch = Math.floor(885 / branchesss.length); // Numero di pallini per ramo
  for (let branch of branchesss) {
    let start = branch.start;
    let end = branch.end;
    let candidateDots = [];
    let validDots = [];

    // Prima creiamo tutti i punti candidati per questo ramo
    for (let i = 0; i < dotsPerBranch; i++) {
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

      candidateDots.push({ x: finalX, y: finalY });
    }

    // Debug: stampa il numero di punti candidati
    console.log("Punti candidati:", candidateDots.length);

    // Verifichiamo ogni punto contro TUTTI quelli già esistenti
    for (let point of candidateDots) {
      let valid = true;

      // Controlla contro i punti già validati in questo ramo
      for (let validPoint of validDots) {
        let d = dist(point.x, point.y, validPoint.x, validPoint.y);
        if (d < 12) {
          // Aumentato il raggio minimo
          valid = false;
          break;
        }
      }

      if (valid) {
        validDots.push(point);
      }
    }

    // Debug: stampa il numero di punti validi
    console.log("Punti validi:", validDots.length);

    // Crea i Dot solo per i punti validi
    for (let point of validDots) {
      dots.push(new Dot({ x: point.x, y: point.y }, dots.length, "ellipse"));
    }
  }
};

// Helper function to convert local coordinates to global
function localToGlobal(x, y, baseX, baseY) {
  return {
    x: x + baseX,
    y: y + baseY,
  };
}
function isPositionValid(x, y, currentDots, minDistance) {
  for (let dot of currentDots) {
    let d = dist(x, y, dot.position.x, dot.position.y);
    if (d < minDistance) {
      return false;
    }
  }
  return true;
}

window.draw = () => {
  for (let dot of dots) {
    dot.move(5, 0.1); // Movimento fluido con noise (fattore e velocità)
    dot.draw(10); // Disegna i punti con raggio 30
  }
};

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
    branchLength = Math.round(random(150, (trunk / 3) * 2));
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

  // // converto le coordinate
  // let subBranchStart = localToGlobal(startX, startY, baseX, baseY);
  // let subBranchEnd = localToGlobal(endX, endY, baseX, baseY);
  // // e le pusho nell'array
  // branchesss.push({
  //   start: createVector(subBranchStart.x, subBranchStart.y),
  //   end: createVector(subBranchEnd.x, subBranchEnd.y),
  // });
}

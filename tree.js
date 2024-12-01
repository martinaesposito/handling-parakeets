//P5
let p5, canvas;
let container = document.querySelector(".container");

// MAIN ALBERO
let branchLength;
let p = 0;
let l;
let branchesss = [];
let nBranches = 15;
let r = 10;

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

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  //ALBERO
  push();
  translate(width / 2, height / 3 - 50);
  drawTree((height / 3) * 2, nBranches); // Ridotta l'altezza dell'albero
  pop();

  // LISTINGS
  dots = generateBranchDots(branchesss);

  for (let dot of dots) {
    dot.draw(random(8, 12)); // Disegna i punti con raggio 30
  }
};

// Helper function to convert local coordinates to global
function localToGlobal(x, y, baseX, baseY) {
  return {
    x: x + baseX,
    y: y + baseY,
  };
}

window.draw = () => {
  // background(245, 40);
  for (let dot of dots) {
    blendMode(MULTIPLY);
    dot.move(3, 0.5); // Movimento fluido con noise (fattore e velocità)
  }
};

function generateBranchDots(branches) {
  const dots = []; // Array principale per tutti i punti

  branches.forEach((branch, bIndex) => {
    const branchDots = []; // Array temporaneo per i punti di questo ramo
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
    const a = -1; // Inverso per parabola decrescente
    const h = 2 / 3; // Punto di massimo (2/3 della lunghezza)
    const k = 1; // Valore massimo della parabola

    // Generazione dei punti direttamente
    while (branchDots.length < dotsxBranch[bIndex]) {
      // Generazione casuale di t lungo il ramo
      let t = random();

      // Calcolo della densità basata sulla parabola
      const density = a * pow(t - h, 2) + k;

      // Accettazione basata sulla densità
      if (random() < density) {
        // Calcolo delle coordinate lungo il ramo
        const baseX = lerp(branch.start.x, branch.end.x, t);
        const baseY = lerp(branch.start.y, branch.end.y, t);

        // Spread basato sulla posizione lungo il ramo
        const spread = map(t, 0, 1, branchLength * 0.02, branchLength * 0.09);

        // Calcolo della variazione perpendicolare
        const perpAngle = branchAngle + HALF_PI;
        const distance = randomGaussian() * spread;

        const finalX = baseX + cos(perpAngle) * distance;
        const finalY = baseY + sin(perpAngle) * distance;

        // Verifica che il punto non si sovrapponga ad altri punti nel ramo
        let validPosition = true;

        for (const dot of branchDots) {
          if (dist(finalX, finalY, dot.x, dot.y) < r) {
            validPosition = false;
            break;
          }
        }

        // Se valido, aggiungi il punto
        if (validPosition) {
          branchDots.push({ x: finalX, y: finalY });
        }
      }
    }

    // Unisci i punti del ramo all'array principale
    branchDots.forEach((dot, index) => {
      dots.push(new Dot(dot, dots.length + index, "ellipse"));
    });
  });

  return dots;
}

function drawTree(trunk, branches) {
  const baseX = width / 2;
  const baseY = height / 3 - 50;

  // TRONCO
  strokeWeight(6);
  stroke(180);
  line(0, 0, 0, trunk);

  let heightProgress = 0;

  // Calcola il numero massimo di dots per trovare il fattore di scala
  const maxDots = Math.max(...dotsxBranch);

  //RAMI
  for (let i = branches; i > 0; i--) {
    heightProgress = i / (branches - 1);

    // Calcola la lunghezza del ramo in base al numero di dots
    const dotsForThisBranch = dotsxBranch[branches - i] || 0;

    // Scala la lunghezza del ramo in base al numero di dots
    // Usa una funzione logaritmica per evitare rami troppo lunghi con molti dots
    const scaleFactor = Math.log(dotsForThisBranch + 1) / Math.log(maxDots + 1);

    // Calcola la lunghezza finale combinando il fattore dots con la posizione verticale
    branchLength =
      lerp(trunk - 500, trunk - 200, scaleFactor) * (1 - heightProgress * 0.5);

    strokeWeight(4);
    stroke(180);

    l = i % 2 === 0 ? 1 : -1;

    let mainBranchStartPos = localToGlobal(0, p, baseX, baseY);

    let baseAngle = map(heightProgress, 0, 1, PI / 18, PI / 3); // angolo più stretto alla base, più ampio in cima
    let angleVariation = baseAngle + random(-PI / 18, PI / 18); // aggiungi un po' di variazione casuale
    let mainBranchAngle = l * angleVariation;

    let mainBranchEndX = cos(mainBranchAngle) * branchLength * l;
    let mainBranchEndY = -abs(sin(mainBranchAngle) * branchLength);

    // MAINBRANCH
    line(0, p, mainBranchEndX, p + mainBranchEndY);

    let mainBranchEndPos = localToGlobal(
      mainBranchEndX,
      p + mainBranchEndY,
      baseX,
      baseY
    );

    branchesss.push({
      start: createVector(mainBranchStartPos.x, mainBranchStartPos.y),
      end: createVector(mainBranchEndPos.x, mainBranchEndPos.y),
    });

    // Regola la lunghezza dei rami secondari in base al numero di dots
    let subBranchMaxLength = branchLength * (0.4 * scaleFactor);
    let subBranchMinLength = branchLength * (0.2 * scaleFactor);

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
      subBranchMinLength,
      subBranchMaxLength,
      heightProgress
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
      subBranchMinLength,
      subBranchMaxLength,
      heightProgress
    );

    p += branchLength / 5;
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
  heightProgress
) {
  // Riduci lo spessore dei rami secondari in base all'altezza
  let subBranchWidth = map(heightProgress, 0, 1, 1.25, 0.75);
  strokeWeight(subBranchWidth);
  stroke(180); // Colore grigio per i rami secondari

  let subAngle = mainBranchAngle + l * random(angleRangeMin, angleRangeMax);
  let subLength = random(lengthRangeMin, lengthRangeMax);

  let endX = startX + cos(subAngle) * subLength * l;
  let endY = startY - abs(sin(subAngle) * subLength);

  line(startX, startY, endX, endY);

  // let subBranchStart = localToGlobal(startX, startY, baseX, baseY);
  // let subBranchEnd = localToGlobal(endX, endY, baseX, baseY);

  // branchesss.push({
  //   start: createVector(subBranchStart.x, subBranchStart.y),
  //   end: createVector(subBranchEnd.x, subBranchEnd.y),
  // });
}

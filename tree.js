//P5
let p5, canvas;
let container = document.querySelector(".container");

// MAIN ALBERO
let branchesss = [];
let branchLength;
let branchLengths = [];
let p = 0;
let l;

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight); // canvas quadrato
  pixelDensity(1);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  translate(width / 2, height / 3); // Sposta l'origine a un terzo dall'alto dello schermo
  drawTree((height / 3) * 2, 6); // Disegna l'albero alto due terzi dello schermo con 6 rami = framings
};

window.draw = () => {};

function drawTree(trunk, branches) {
  // TRONCO
  strokeWeight(5);
  line(0, -15, 0, trunk);
  strokeWeight(2);

  //RAMI
  push();
  for (let i = 0; i < branches; i++) {
    stroke("black");
    branchLength = Math.round(random(150, (trunk / 3) * 2)); //TRONCO

    l = i % 2 === 0 ? 1 : -1; // se è divisibile per due (pari) a destra (1), dispari a sinistra (-1)

    push();
    translate(0, p);

    let mainBranchAngle = l * (PI / 6 - random(-PI / 18, PI / 18)); //angolo main branch = 30 gradi +-10
    // calcolo x e y using cos e sin
    let mainBranchEndX = cos(mainBranchAngle) * branchLength * l;
    let mainBranchEndY = sin(mainBranchAngle) * branchLength;

    // MAIN BRANCH
    strokeWeight(2.5);
    line(0, 0, mainBranchEndX, -abs(mainBranchEndY)); // Make Y negative to grow upward

    // SUB BRANCH 1
    let randomPoint1 = random(0.3, 0.8); //calcolo il random point nel main branche e lo uso per calcolare x e y del punto di partenza del primo subbranch
    let startX1 = mainBranchEndX * randomPoint1;
    let startY1 = -abs(mainBranchEndY) * randomPoint1;
    drawSubBranch(
      startX1,
      startY1,
      mainBranchAngle,
      l,
      PI / 12,
      PI / 6,
      25,
      branchLength / 3
    );

    // SUB BRANCH 2
    let randomPoint2 = random(0.2, 0.9);
    let startX2 = mainBranchEndX * randomPoint2;
    let startY2 = -abs(mainBranchEndY) * randomPoint2;
    drawSubBranch(
      startX2,
      startY2,
      mainBranchAngle,
      l,
      -PI / 6,
      -PI / 12,
      25,
      branchLength / 3
    );

    pop();
    p += trunk / 9;
  }
  pop();
}

function drawSubBranch(
  startX,
  startY,
  mainBranchAngle,
  l,
  angleRangeMin,
  angleRangeMax,
  lengthRangeMin,
  lengthRangeMax
) {
  push(); // Spostati nel punto di partenza del sottoramo
  translate(startX, startY);
  strokeWeight(1.25);

  let subAngle = mainBranchAngle + l * random(angleRangeMin, angleRangeMax); //angolo sottoramo
  let subLength = random(lengthRangeMin, lengthRangeMax); //lunghezza sottoramo

  let endX = cos(subAngle) * subLength * l; //coordinate sottoramo - coseno e seno del'angolo
  let endY = sin(subAngle) * subLength;

  line(0, 0, endX, -abs(endY));

  pop();
}

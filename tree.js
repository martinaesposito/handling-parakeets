let p5, canvas;
let container = document.querySelector(".container");

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

  translate(width / 2, height / 3); // Sposta l'origine in basso al centro dello schermo
  drawTree((height / 3) * 2, 6); // Disegna l'albero
};

function drawTree(trunk, branches) {
  // TRONCO
  strokeWeight(5);
  line(0, -15, 0, trunk);
  strokeWeight(2);

  //RAMI
  push();
  for (let i = 0; i < branches; i++) {
    stroke("black");
    branchLength = Math.round(random(150, (trunk / 3) * 2));
    console.log(branchLength);
    branchLengths.push(branchLength);

    l = i % 2 === 0 ? 1 : -1; // se è divisibile per due (pari) a destra (1), dispari a sinistra (-1)

    // Save current position
    push();
    translate(0, p);

    // angolo main branch
    let mainBranchAngle = l * (PI / 6 - random(-PI / 18, PI / 18)); //45+-10
    // calcolo x e y using cos e sin
    let mainBranchEndX = cos(mainBranchAngle) * branchLength * l;
    let mainBranchEndY = sin(mainBranchAngle) * branchLength;

    // MAIN BRANCH
    strokeWeight(2.5);
    line(0, 0, mainBranchEndX, -abs(mainBranchEndY)); // Make Y negative to grow upward

    // First sub-branch
    let randomPoint1 = random(0.3, 0.8); //calcolo il random point nel main branche e lo uso per calcolare x e y del punto di partenza del primo subbranch
    let startX1 = mainBranchEndX * randomPoint1;
    let startY1 = -abs(mainBranchEndY) * randomPoint1;

    push();
    translate(startX1, startY1);
    strokeWeight(1.25);
    let subAngle1 = mainBranchAngle + l * random(PI / 12, PI / 6); //dall'angolo principale + un valore tra 15 e 30
    let subLength1 = random(25, branchLength / 3); //lunghezza random del ramo
    let endX1 = cos(subAngle1) * subLength1 * l;
    let endY1 = sin(subAngle1) * subLength1;
    line(0, 0, endX1, -abs(endY1));
    pop();

    // Second sub-branch
    let randomPoint2 = random(0.2, 0.9);
    let startX2 = mainBranchEndX * randomPoint2;
    let startY2 = -abs(mainBranchEndY) * randomPoint2;

    push();
    translate(startX2, startY2);
    strokeWeight(1.25);
    let subAngle2 = mainBranchAngle + l * random(-PI / 6, -PI / 12);
    let subLength2 = random(25, branchLength / 3);
    let endX2 = cos(subAngle2) * subLength2 * l;
    let endY2 = sin(subAngle2) * subLength2;
    line(0, 0, endX2, abs(endY2));
    pop();

    pop();
    p += trunk / 9;
  }
  pop();
}

window.draw = () => {};

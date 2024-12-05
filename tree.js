//P5
let p5, canvas;
let container = document.querySelector(".container");

let branchesss = [];
let r = 12.5;

let dotsxBranch = [
  { value: 19, start: 0.6, end: 0.8 },
  { value: 18, start: 0.8, end: 1 },
  { value: 7, start: 0.4, end: 0.6 },
  { value: 94, start: 0, end: 1 },
  { value: 11, start: 0.8, end: 0.9 },
  { value: 3, start: 0.6, end: 0.7 },
  { value: 10, start: 0, end: 0.5 },
  { value: 150, start: 0, end: 1 },
  { value: 44, start: 0, end: 1 }, //telegram
  { value: 11, start: 0.5, end: 1 },
  { value: 177, start: 0, end: 1 }, //Facebook groups
  { value: 12, start: 0, end: 1 },
  { value: 14, start: 0, end: 1 }, //marketplace
  { value: 149, start: 0, end: 1 }, //pages
  { value: 14, start: 0, end: 1 },
  { value: 149, start: 0, end: 1 },
];

let dots = [];
import { Dot } from "./listings.js";

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

  const totalDots = dotsxBranch.reduce((acc, { value }) => acc + value, 0);
  const angles = dotsxBranch.map(({ value }) =>
    map(value, 0, totalDots, 0, 2 * PI)
  );

  let total = 0;

  angles.forEach((a, index) => {
    const angle = total + a / 2 + (index > 0 ? angles[index - 1] / 2 : 0);

    const bounds = {
      start: {
        x: width / 2,
        y: height / 2,
      },
      end: {
        x: width / 2 + (width / 2.2) * cos(angle),
        y: height / 2 + (height / 2.2) * sin(angle),
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

  branchesss.forEach(({ bounds: { start, end } }, index) => {
    stroke("lightgray");
    strokeWeight(1);
    line(start.x, start.y, end.x, end.y);
    noStroke();
    text(`${index} - ${dotsxBranch[index].value}`, end.x, end.y);
  });

  // drawTreeFromParams();
  dots.forEach((dot, i) => {
    // Impostiamo il blend mode prima di disegnare ogni dot
    blendMode(MULTIPLY);
    dot.move(10, 0.03);
    dot.draw();
  });
  // // Resettiamo il blend mode alla fine
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

    let tries = 0;

    while (currentBranchDots.length < dotsxBranch[bIndex].value) {
      tries++;
      let t = random();
      const density = a * pow(t - h, 2) + k;

      if (random() < density) {
        // Calcola l'offset come percentuale della lunghezza del ramo (es. 10%)
        const offsetDistance = branchLength * 0.3;

        // Applica l'offset considerando l'angolo del ramo
        const offsetX = cos(branchAngle) * offsetDistance;
        const offsetY = sin(branchAngle) * offsetDistance;

        // Usa il punto di partenza spostato per il lerp
        const baseX = lerp(branch.start.x + offsetX, branch.end.x, t);
        const baseY = lerp(branch.start.y + offsetY, branch.end.y, t);

        const spread =
          map(
            t,
            0,
            1,
            (branchLength - offsetDistance) * 0.02,
            (branchLength - offsetDistance) * 0.12,
            true
          ) *
          branch.angleWidth *
          1.5;
        const perpAngle = branchAngle + HALF_PI;
        const distance = randomGaussian() * spread;

        const finalX = baseX + cos(perpAngle) * distance;
        const finalY = baseY + sin(perpAngle) * distance;

        let radius = random(7.5, 15);

        let validPosition = true;

        // Controlla distanza r con i dots dello stesso ramo
        for (const sameBranchDot of currentBranchDots) {
          const d = dist(
            finalX,
            finalY,
            sameBranchDot.pos.x,
            sameBranchDot.pos.y
          );
          if (d < radius + sameBranchDot.radius) {
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
            if (d < radius + otherBranchDot.radius) {
              validPosition = false;
              break;
            }
          }
        }

        if (tries > 200) {
          validPosition = true;
        }

        if (validPosition) {
          currentBranchDots.push(
            new Dot(
              { x: finalX, y: finalY },
              allDots.length + currentBranchDots.length,
              radius,
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

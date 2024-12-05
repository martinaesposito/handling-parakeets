//P5
let p5, canvas;
let container = document.querySelector(".container");

let branchesss = [];
let r = 12.5;

let dotsxBranch = [
  { value: 19, start: 0.7, end: 0.8 },
  { value: 18, start: 0.95, end: 1 },
  { value: 7, start: 0.2, end: 0.3 },
  { value: 94, start: 0.4, end: 1 },
  { value: 11, start: 0.85, end: 0.9 },
  { value: 3, start: 0.6, end: 0.7 },
  { value: 10, start: 0.4, end: 0.5 },
  { value: 150, start: 0, end: 0.9 },
  { value: 44, start: 0.6, end: 0.9 }, //telegram
  { value: 11, start: 0.9, end: 1 },
  { value: 177, start: 0.2, end: 1 }, //Facebook groups
  { value: 12, start: 0.7, end: 1 },
  { value: 14, start: 0.3, end: 0.6 }, //marketplace
  { value: 149, start: 0, end: 1 }, //pages
  { value: 14, start: 0.5, end: 1 },
  { value: 149, start: 0.2, end: 1 },
];

let dots = [];
import { Dot } from "./listings2.js";

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

  // branchesss.forEach(({ bounds: { start, end } }, index) => {
  //   stroke("lightgray");
  //   strokeWeight(1);
  //   line(start.x, start.y, end.x, end.y);
  //   noStroke();
  //   text(`${index} - ${dotsxBranch[index].value}`, end.x, end.y);
  // });

  // // drawTreeFromParams();
  // dots.forEach((dot, i) => {
  //   // Impostiamo il blend mode prima di disegnare ogni dot
  //   blendMode(MULTIPLY);
  //   dot.move(10, 0.03);
  //   dot.draw();
  // });
  // // // Resettiamo il blend mode alla fine
  // blendMode(BLEND);

  branchesss.forEach(({ bounds: { start, end } }, index) => {
    stroke("lightgray");
    strokeWeight(1);
    line(start.x, start.y, end.x, end.y);
    noStroke();
    text(`${index} - ${dotsxBranch[index].value}`, end.x, end.y);
  });

  // Update and draw dots
  dots.forEach((dot) => {
    dot.move(dots, 1); // Single iteration per frame for smooth animation
    dot.draw();
  });
};

// function generateBranchDots(branches) {
//   const allDots = []; // Array per tutti i dots finali di tutti i rami

//   branches.forEach((branch, bIndex) => {
//     const branchLength = dist(
//       branch.start.x,
//       branch.start.y,
//       branch.end.x,
//       branch.end.y
//     );

//     const branchAngle = atan2(
//       branch.end.y - branch.start.y,
//       branch.end.x - branch.start.x
//     );

//     // Parametri della parabola
//     // const a = -1;
//     // const h = 1 / 2;
//     // const k = 1;

//     let currentBranchDots = [];

//     for (let i = 0; i < dotsxBranch[bIndex].value; i++) {
//       let t = random();
//       //const density = a * pow(t - h, 2) + k;

//       function randomPos() {
//         t = random();
//         const offsetDistance = branchLength * 0.3;
//         const offsetX = cos(branchAngle) * offsetDistance;
//         const offsetY = sin(branchAngle) * offsetDistance;

//         const baseX = lerp(branch.start.x + offsetX, branch.end.x, t);
//         const baseY = lerp(branch.start.y + offsetY, branch.end.y, t);

//         const spread = map(
//           t,
//           0,
//           1,
//           (branchLength - offsetDistance) * 0.01,
//           (branchLength - offsetDistance) * 0.2,
//           true
//         );

//         const perpAngle = branchAngle + HALF_PI * branch.angleWidth;
//         const distance = randomGaussian() * spread;

//         const x = baseX + cos(perpAngle) * distance;
//         const y = baseY + sin(perpAngle) * distance;

//         return { x, y };
//       }

//       function isOverlapping(pos, radius) {
//         for (const sameBranchDot of currentBranchDots) {
//           const d = dist(
//             pos.x,
//             pos.y,
//             sameBranchDot.pos.x,
//             sameBranchDot.pos.y
//           );
//           if (d < radius) {
//             return true;
//           }
//         }
//         return false;
//       }

//       let isValid = false;
//       let tries = 0;
//       let pos;
//       let radius = random(12.5, 15);

//       while (!pos || !isValid) {
//         pos = randomPos();
//         tries++;

//         isValid = !isOverlapping(pos, radius);
//         //&& random() < density;

//         if (tries > 200) {
//           isValid = true;
//         }
//       }

//       currentBranchDots.push(
//         new Dot(
//           pos,
//           allDots.length + currentBranchDots.length,
//           radius,
//           "ellipse"
//         )
//       );
//     }

//     allDots.push(...currentBranchDots);
//   });

//   return allDots;
// }
function generateBranchDots(branches) {
  const allDots = [];

  branches.forEach((branch, bIndex) => {
    const branchDots = [];

    for (let i = 0; i < dotsxBranch[bIndex].value; i++) {
      const dot = new Dot(
        branch,
        allDots.length + branchDots.length,
        random(11, 13),
        "ellipse"
      );
      branchDots.push(dot);
    }

    allDots.push(...branchDots);
  });

  // Initial overlap resolution
  for (let i = 0; i < 50; i++) {
    // Initial iterations to settle
    allDots.forEach((dot) => {
      dot.move(allDots, 1);
    });
  }

  return allDots;
}

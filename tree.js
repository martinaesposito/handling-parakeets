//P5
let p5, canvas;
let container = document.querySelector(".container");

let branchesss = [];
let r = 12.5;

let dotsxBranch = [
  { value: 19, start: 0.7, end: 0.8, name: "AAAnnunci" },
  { value: 3, start: 0.6, end: 0.7, name: "petfocus" },
  { value: 3, start: 0.1, end: 0.3, name: "petpappagalli" },
  { value: 94, start: 0.4, end: 1, name: "Clasf.it" },
  { value: 11, start: 0.85, end: 0.9, name: "likesx" },
  { value: 10, start: 0.4, end: 0.5, name: "Secondamano" },
  { value: 150, start: 0.3, end: 0.9, name: " Subito.it " },
  { value: 44, start: 0.6, end: 0.9, name: "telegram" }, //telegram
  { value: 11, start: 0.9, end: 1, name: "trovacuccioli" },
  { value: 177, start: 0.2, end: 1, name: "FB groups" }, //Facebook groups
  { value: 12, start: 0.7, end: 1, name: "TrovaloSubito" },
  { value: 14, start: 0.3, end: 0.6, name: "FB marketplace" }, //marketplace
  { value: 149, start: 0.3, end: 0.9, name: "FB pages" }, //pages
  { value: 14, start: 0.5, end: 1, name: "TrovaPet" },
  { value: 149, start: 0.2, end: 1, name: "usato.it" },
];

let dots = [];
import { Dot } from "./listings.js";

window.setup = async () => {
  p5 = createCanvas(windowWidth, windowHeight, WEBGL);

  pixelDensity(1);
  rectMode(CENTER);

  canvas = p5.canvas;
  container.appendChild(canvas);
  background(245);

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

  camera(0, 0, 800);

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

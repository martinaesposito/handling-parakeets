const prak = "#C9FF4C";

const Point = class {
  //classe dei punti che compongono la mano
  constructor(coords, index, hand) {
    this.pos = coords;
    this.index = index;
    this.hand = hand;
    this.size = 5;
  }

  draw() {
    stroke(this.selected ? "red" : 255);

    fill(255);
    stroke(0);
    strokeWeight(1);

    // textSize(9);
    // textAlign(CENTER);
    // text(this.index, this.pos.x, this.pos.y);
    circle(this.pos.x, this.pos.y, this.size);
  }

  update(coords) {
    this.pos = coords;
  }
};

export const Hand = class {
  //crea la classe mano basata sulla classe punti che compongono la mano
  constructor(data, type, p5Data) {
    this.points = [];
    this.p5Points = [];
    this.type = type; //destra o sinistra - anche se per adesso non è implementato

    this.draw(data, false, p5Data);
  }

  draw(data, shouldDrawHand, p5Data) {
    let increment = 1;
    console.log(p5Data);

    if (!data) {
      // Se data non esiste, utilizza this.points per il disegno
      data = this.points.map((p) => p.pos);
    }

    // UPDATE
    for (let f = 0; f < data.length; f += increment) {
      if (f === 1) {
        increment = 4;
      }

      for (let i = f; i < f + increment; i++) {
        if (!this.points[i]) {
          // Se points non esiste allora lo crea
          const newPoint = new Point(data[i], i, this.type);
          this.points[i] = newPoint;
          if (p5Data) {
            const newP5Point = new Point(p5Data[i], i, this.type);
            this.p5Points[i] = newP5Point;
          }
        } else {
          // Altrimenti aggiorna le coordinate
          this.points[i].update(data[i]);
          if (p5Data) {
            this.p5Points[i].update(p5Data[i]);
          }
        }
      }
    }

    this.calculateAngles(shouldDrawHand);

    // Secondo passaggio: disegno dei punti e delle forme
    if (shouldDrawHand) {
      increment = 1;
      for (let f = 0; f < data.length; f += increment) {
        if (f === 1) {
          increment = 4;
        }

        beginShape(); // Disegno una forma a partire dai punti del palmo
        for (let i = f; i < f + increment; i++) {
          vertex(...Object.values(this.p5Points[i].pos)); // Usa i punti aggiornati
        }

        strokeWeight(1);
        stroke(prak);
        noFill();

        if (f === 0) {
          // Disegna il palmo unendo specifici punti
          const palmPoints = [0, 1, 5, 9, 13, 17, 0];
          palmPoints.forEach((p) =>
            vertex(...Object.values(this.p5Points[p].pos))
          );
        }

        endShape();
      }

      // Disegna tutti i punti
      for (let p = 0; p < this.p5Points.length; p++) {
        this.p5Points[p].draw();
      }
    }
  }

  deselect() {
    //quando lascio cambio lo stato dei punti e del flag
    this.editing = false;
    this.points.forEach((p) => {
      p.selected = false;
    });
  }

  movePoint(coords) {
    const selected = this.points.find((p) => p.selected);
    if (!selected) return;
    selected.update(coords);

    this.draw();
  }

  calculateAngles(shouldDraw = true) {
    let angles = [
      [2, 0, 5], //angolo del palmo
      [5, 0, 17], //angolo del palmo
      [0, 1, 4], //pollice
      [0, 5, 8], //indice
      [0, 9, 12], //medio
      [0, 13, 16], //anulare
      [0, 17, 20], //mignolo
      [5, 6, 8], //giunture dita indice
      [9, 10, 12], //giunture dita medio
      [13, 14, 16], //giunture dita anulare
      [17, 18, 20], //giunture dita  mignolo
    ];

    const colors = [
      "blue",
      "green",
      "yellow",
      "pink",
      "orange",
      "brown",
      "red",
      "pink",
      "orange",
      "brown",
      "red",
    ];

    this.angles = angles.map((a, index) => {
      const p1 = this.points[a[0]].pos;
      const p2 = this.points[a[1]].pos;
      const p3 = this.points[a[2]].pos;
      const base = { ...this.points[a[1]].pos };
      base.x = base.x + 50;

      // ANGOLI DELLE MANI
      // if (shouldDraw) {
      //   stroke(colors[index]);
      //   strokeWeight(1);

      //   line(p1.x, p1.y, p2.x, p2.y);
      //   line(p2.x, p2.y, p3.x, p3.y);
      // }

      let relativeAangle = calculateAngle(p1, p2, p3);
      let absoluteAngle = calculateAngle(p1, p2, base);

      // textFont(font);
      // textSize(12);
      // textAlign(CENTER);
      // text(Math.round(relativeAangle), p3.x, p3.y);

      return { relative: relativeAangle, absolute: absoluteAngle };
    });
  }
};

// Funzione per calcolare l'angolo tra tre punti
function calculateAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) {
    console.log("Punti non validi per calcolare l'angolo");
    return null; // Oppure 0, in base a cosa serve
  }

  const dx1 = p1.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;

  const dotProduct = dx1 * dx2 + dy1 * dy2; // Prodotto scalare
  const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1); // Modulo del primo vettore
  const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2); // Modulo del secondo vettore

  const cosTheta = dotProduct / (magnitude1 * magnitude2);
  return Math.acos(cosTheta) * (180 / Math.PI); // Converti da radianti a gradi
}

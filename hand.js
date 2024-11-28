const handsRef = {
  //riconosce solo la mano destra
  left: 1,
  right: 0,
};

const Point = class {
  //classe dei punti che compongono la mano
  constructor(coords, index, hand) {
    this.pos = coords;
    this.index = index;
    this.hand = hand;
    this.size = 5;
  }

  draw() {
    fill(
      this.hand === handsRef.right ? 255 : 0,
      0,
      this.hand === handsRef.left ? 255 : 0
    );

    stroke(this.selected ? "red" : 255);

    // ellipse(this.pos.x, this.pos.y, this.size, this.size);

    noStroke();
    fill(255);

    textSize(9);
    textAlign(CENTER);
    text(this.index, this.pos.x, this.pos.y);
  }

  update(coords) {
    this.pos = coords;
    this.draw();
  }
};

export const Hand = class {
  //crea la classe mano basata sulla classe punti che compongono la mano
  //chiamo la funzione export perchè i dati saranno poi utilizzati dal javascript principale
  constructor(data, type) {
    this.points = [];
    this.origin = null; //punto d'origine della mano
    this.type = type; //destra o sinistra - anche se per adesso non è implementato

    this.draw(data);
  }

  draw(data) {
    //METODO CHE CALCOLA I PUNTI DELLA MANO
    let increment = 1;

    if (!data) {
      //se data non esiste, utilizza this.points per il disegno
      data = this.points.map((p) => p.pos);
    }

    for (let f = 0; f < data.length; f += increment) {
      //definito data f è la variabile che itera per i punti per disegnare la mano
      if (f === 1) {
        increment = 4;
      }

      beginShape(); //disegno una forma a partire dai punti del palmo
      for (let i = f; i < f + increment; i++) {
        let point = data[i]; //prende il primo elemento dell'array data
        const coords = point;

        if (!this.points[i]) {
          //se points non esiste allora lo crea se no lo aggiorna
          const newPoint = new Point(coords, i, this.type);
          this.points[i] = newPoint;
        } else {
          this.points[i].update(coords);
        }

        vertex(...Object.values(coords)); //crea i vertici della forma a partire dalle coordinate dei punti

        strokeWeight(1);
        stroke(255);
        noFill();
      }

      if (f === 0) {
        //disegna il palmo unendo specifici punti ossia le coordinate dei punti del palmo
        const palmPoints = [0, 1, 5, 9, 13, 17, 0];

        palmPoints.forEach((p) => vertex(...Object.values(data[p])));
      }

      endShape();
    }

    for (let p = 0; p < data.length; p++) {
      this.points[p].draw();
    }

    this.calculateAngles();
    this.origin = this.points[0]; //aggiorna il punto di origine della mano
  }

  toggleSelectedPoint(coords) {
    //Funzione per modificare i punti della mano
    this.deselect(); //deseleziona tutto

    const target = this.points.find((p) => {
      return dist(p.pos.x, p.pos.y, coords.x, coords.y) < 10; //se la distanza tra il punto in cui premo e uno dei punti della mano è inferiore a dieci pixel
    });

    if (target) {
      //allora ritorna le coordiante del punto e dà quel punto come selezionato
      target.selected = !target.selected;
      this.editing = true;
    }

    this.draw();
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

  calculateAngles() {
    let angles = [
      [2, 0, 5], //angolo del palmo
      [5, 0, 17], //angolo del palmo
      [0, 1, 4], //pollice
      [0, 5, 8], //indice
      [0, 9, 12], //medio
      [0, 13, 16], //anulare
      [0, 17, 20], //mignolo
    ];
    const colors = [
      "blue",
      "green",
      "yellow",
      "pink",
      "orange",
      "brown",
      "red",
    ];

    this.angles = angles.map((a, index) => {
      const p1 = this.points[a[0]].pos;
      const p2 = this.points[a[1]].pos;
      const p3 = this.points[a[2]].pos;

      stroke(colors[index]);
      strokeWeight(2);

      line(p1.x, p1.y, p2.x, p2.y);
      line(p2.x, p2.y, p3.x, p3.y);

      noStroke();
      fill(colors[index]);

      let angle = calculateAngle(p1, p2, p3);

      textSize(12);
      textAlign(CENTER);
      text(Math.round(angle), p3.x, p3.y);

      return angle;
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

let colors = [
  "#87BDF3",
  "#7DE44A",
  "#BDFF91",
  "#2CA02C",
  "#FCFF5C",
  "#009DB8",
  "#2E7F2E",
];

// Classe Dot
export const Dot = class {
  constructor(coords, index, type, image) {
    this.pos = createVector(coords.x, coords.y); // Posizione iniziale
    this.basePos = this.pos.copy(); // Posizione di riferimento (per tornare "a casa")
    this.index = index; // Indice del punto
    this.color = random(colors); // Colore casuale dall'array
    this.type = type; // Tipo del punto (es. normale o immagine)
    this.noiseOffsetX = random(10000); // Offset casuale per il Perlin noise (x)
    this.noiseOffsetY = random(1000); // Offset casuale per il Perlin noise (y)
    this.img = image;
  }

  draw(r) {
    if (this.type === "image") {
      // Disegna un'immagine se il tipo è "image"
      imageMode(CENTER);
      image(this.img, this.pos.x, this.pos.y, r, r); // Disegna l'immagine nella posizione del punto
    } else {
      // Disegna un'ellisse se il tipo non è "image"
      noStroke();

      fill(this.color);
      ellipse(this.pos.x, this.pos.y, r);
    }
  }

  move(noiseFactor, noiseSpeed) {
    // Usa il Perlin noise per calcolare uno spostamento fluido
    let noiseX = noise(this.noiseOffsetX) * noiseFactor;
    let noiseY = noise(this.noiseOffsetY) * noiseFactor;

    // Aggiorna la posizione con il rumore
    this.pos.x = this.basePos.x + noiseX;
    this.pos.y = this.basePos.y + noiseY;

    // Aggiorna gli offset del rumore per creare movimento fluido nel tempo
    this.noiseOffsetX += noiseSpeed;
    this.noiseOffsetY += noiseSpeed;
  }
};

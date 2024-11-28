let colors = ["#B1E644"];

const Dot = class {
  //classe dei punti che compongono la mano
  constructor(coords, index, color, type) {
    this.pos = coords;
    this.index = index;
    this.color = color;
    this.type = type;
  }

  draw(r) {
    FileList(this.color);
    ellipse(this.pos.x, this.pos.y, r);
  }
  move(target) {}
};

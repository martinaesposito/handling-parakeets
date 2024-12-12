let myJSON;

let img_n;

let squares = [];

let current_pose = "start";

let playing = false;

let debugmenu;
let debugsound;

function preload() {
  myJSON = loadJSON("./listings.json", createObjects);
}

function createObjects() {
  img_n = Object.keys(myJSON).length;

  let padding = [windowWidth / 6, windowHeight / 6];
  let sizing = 30;

  for (let i = 0; i < img_n; i++) {
    // general position

    let xpos = random(padding[0], windowWidth - padding[0]);
    let ypos = random(padding[1], windowHeight - padding[1]);

    // leaving space in the middle for the prompt / incipit

    while (
      xpos > padding[0] * 2 &&
      xpos < windowWidth - padding[0] * 2 &&
      ypos > padding[1] * 2 &&
      ypos < windowHeight - padding[1] * 2
    ) {
      xpos = random(padding[0], windowWidth - padding[0]);
      ypos = random(padding[1], windowHeight - padding[1]);
    }

    let size = sizing;

    // text & photo divs containers

    let div = createDiv();
    div.style("display", "none"); // not displayed initially

    // audio element

    // loading only the needed audio

    var sound =
      myJSON[i].Content_pose && myJSON[i].Content_pose != "Image"
        ? loadSound("./assets/audio-test/-" + myJSON[i].Image_num + ".ogg")
        : null;

    squares[i] = new rects(xpos, ypos, size, div, myJSON[i], sound);
    squares[i].settings();
  }

  debugsound = loadSound(
    "./assets/audio-test/-" + myJSON[0].Image_num + ".ogg"
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  rectMode(CENTER);

  // debug menu

  debugmenu = createSelect(false);
  debugmenu.position(0, 0);
  debugmenu.option("none");
  debugmenu.option("Shell");
  debugmenu.option("Grip");
  debugmenu.option("Open");
  debugmenu.option("HalfClosed");
  debugmenu.option("TouchingTips");
  debugmenu.option("FingerPerch");
  debugmenu.option("Relaxed");
}

function draw() {
  clear();

  for (let i = 0; i < img_n; i++) {
    squares[i].draw();
  }

  // debug

  current_pose = debugmenu.selected();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function hasPlayed() {
  playing = false;
}

class rects {
  constructor(x, y, size, div, data, sound) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.div = div;
    this.data = data;
    this.sound = sound;
  }

  settings() {
    // setting up the data contained in the divs

    this.div.position(this.x, this.y);

    this.div.addClass("container");
    this.div.addClass(this.data.Pose);

    if (this.data.Content_pose == "Text") {
      this.div.html(
        "<div class='box'><div class='info'>[" +
          this.data.Platform +
          (this.data.Year ? ", " + this.data.Year : "") +
          "]</div>" +
          this.data.Description +
          "</div>"
      );
    } else if (this.data.Content_pose == "Image") {
      this.div.html(
        "<img src='./assets/immagini/" +
          this.data.Image_num +
          ".png' class='image'>"
      );
    } else if (this.data.Content_pose == "Image_and_text") {
      this.div.html(
        "<img src='./assets/immagini/" +
          this.data.Image_num +
          ".png' class='image' style='border-bottom: solid 0.25vw #C9FF4C;'><div class='box'><div class='info'>[" +
          this.data.Platform +
          (this.data.Year ? ", " + this.data.Year : "") +
          "]</div>" +
          this.data.Description +
          "</div>"
      );
    }

    // adding audio functionalities

    if (this.sound) {
      this.sound.onended(hasPlayed);
    }
  }

  positioning() {
    // positioning the divs relating to the screen

    let divxoffset =
      this.x > windowWidth / 2 ? this.div.style("width").replace("px", "") : 0;
    let divyoffset = 0;

    let divh = this.div.size().height;

    if (this.y < windowHeight / 2) {
      if (this.y + divh > windowHeight) {
        divyoffset = this.y + divh - windowHeight;
      }
    } else if (this.y >= windowHeight / 2) {
      if (this.y - divh < 0) {
        divyoffset = divh - (divh - this.y);
      } else {
        divyoffset = divh;
      }
    }

    this.div.position(this.x - divxoffset, this.y - divyoffset);
  }

  draw() {
    // no overlap method

    for (let i = 0; i < squares.length; i++) {
      let other = squares[i];
      let care = other.data.Pose != this.data.Pose ? false : true;

      if (
        dist(other.x, other.y, this.x, this.y) <= this.size * 1.5 &&
        care &&
        other != this
      ) {
        this.x += Math.sign(this.x - other.x);
        this.y += Math.sign(this.y - other.y);
      }
    }

    // handling what appears during narration

    if (this.data.Pose == current_pose) {
      rect(this.x, this.y, this.size);

      // on hover

      let offsetx = this.size / 2;
      let offsety = this.size / 2;

      if (
        mouseX <= this.x + offsetx &&
        mouseX >= this.x - offsetx &&
        mouseY <= this.y + offsety &&
        mouseY >= this.y - offsety
      ) {
        if (!playing) {
          // avoiding any other div appearing while audio is playing

          this.div.style("display", "block");
          this.div.style("animation", "appear 0.5s forwards");
        }

        // positioning the divs relating to the screen needs to happen when the div is "displayed"

        this.positioning();

        // narration

        if (this.sound && !playing) {
          // avoiding errors from non-existing sounds and from audio playing while another is

          playing = true;
          this.sound.play(); // play sound if it's not already
        }
      } else {
        if (this.sound) {
          // avoiding errors from non-existing sounds

          if (!this.sound.isPlaying()) {
            // keep div open while sound plays

            this.div.style("animation", "disappear 0.25s forwards");
          }
        } else {
          this.div.style("animation", "disappear 0.25s forwards");
        }
      }
    } else {
      this.div.style("display", "none");
    }
  }
}

import { cursor, zoomFactor, selectedPose } from "./detect.js";
import { playing, isPlaying, hasPlayed } from "./tree.js";

export let platX;
export let platY;
export let branchIndex;
export class Dot {
  static colors = [
    //colors
    // "#D4FF5F",
    // "#B0FF7B",
    "#68EA28",
    "#34DC74",
    "#1EBF2B",
    "#198E3E",
    "#00755F",
  ];

  static cachedImages = {};

  //CONTSTRUCTOR
  constructor(
    branch,
    index,
    radius,
    itemData,
    img,
    basePosition,
    finalPosition
  ) {
    this.branch = branch.index;
    // Base position along the branch (without offset)
    this.basePos = createVector(basePosition.x, basePosition.y);

    // Final position with offset applied
    this.pos = createVector(finalPosition.x, finalPosition.y);

    // Original position copy
    this.originalPos = this.basePos.copy();
    // PROPERTIES
    this.index = index;
    this.color = Dot.colors[Math.floor(random(Dot.colors.length))];

    if (img && !Dot.cachedImages[itemData.Image_num]) {
      let maxRadius = 120;
      let graphics = createGraphics(maxRadius, maxRadius);
      graphics.image(img, 0, 0, maxRadius, maxRadius);
      Dot.cachedImages[itemData.Image_num] = graphics;
    }

    this.sameBranchDots = [];
    this.samePoseDots = [];

    this.image = Dot.cachedImages[itemData.Image_num];

    this.baseRadius = radius;
    this.radius = radius;
    this.itemData = itemData;
    this.isHovered = false;

    // properties of the forces add to the posiiton
    this.config = {
      maxSpeed: 6,
      attractionForce: 0.0075,
      separationForce: 0.1,
      damping: 0.5,
      noiseStrength: 0.5,
      noiseStep: 0.005,
    };

    // Velocity vector
    this.vel = createVector(0, 0);

    // Noise offset and random pre-generation
    this.noiseOffset = random(1000);
    this.randomC = random(1, 4);

    // DIVs
    this.div = itemData.Content_pose ? createDiv() : null;

    // Set divs
    if (this.div) {
      this.div.style("display", "none");

      this.div.addClass("storycontainer");
      this.div.addClass(itemData.Pose);

      if (this.itemData.Content_pose == "Text") {
        this.div.html(
          "<div class='box'><div class='info'>[" +
            this.itemData.Platform +
            (this.itemData.Year ? ", " + this.itemData.Year : "") +
            "]</div>" +
            highlightText(this.itemData.Description, this.itemData.Highlights) +
            "</div>"
        );
      } else if (this.itemData.Content_pose == "Image") {
        this.div.html(
          "<img src='./assets/immagini/" +
            this.itemData.Image_num +
            ".png' class='image'>"
        );
      } else if (this.itemData.Content_pose == "Image_and_text") {
        this.div.html(
          "<img src='./assets/immagini/" +
            this.itemData.Image_num +
            ".png' class='image' style='border-bottom: solid 0.25vw #C9FF4C;'><div class='box'><div class='info'>[" +
            this.itemData.Platform +
            (this.itemData.Year ? ", " + this.itemData.Year : "") +
            "]</div>" +
            highlightText(this.itemData.Description, this.itemData.Highlights) +
            "</div>"
        );
      }
    }

    // adding audio
    this.sound =
      itemData.Content_pose && itemData.Content_pose != "Image"
        ? loadSound("./assets/audio-test/-" + itemData.Image_num + ".ogg")
        : null;

    // adding audio functionalities
    if (this.sound) {
      this.sound.onended(hasPlayed);
    }
  }

  //DRAW
  draw(currentPose) {
    if (this.itemData.Hand == "Hand") {
      stroke("black");
      stroke("#C9FF4C"); //colora le immagini con la mano
      strokeWeight(3);
    } else {
      noStroke(); //se non ce l'hanno niente
    }

    if (!this.shouldHighlight(currentPose)) {
      fill(this.color);
      rect(this.pos.x, this.pos.y, this.radius); //rect per disegnare il bordo, + 3 per disegnarlo esterno
    } else if (this.image) {
      stroke("#C9FF4C"); //colora le immagini con la mano
      strokeWeight(2);
      noFill();
      rect(this.pos.x, this.pos.y, this.radius + 0.5);
      image(this.image, this.pos.x, this.pos.y, this.radius, this.radius);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // handling what appears during narration

    if (this.div) {
      if (this.itemData.Pose == selectedPose) {
        // on hover

        if (this.isHovered) {
          if (!playing) {
            // avoiding any other div appearing while audio is playing
            this.div.style("display", "block");
            this.div.style("animation", "appear 0.5s forwards");
          }

          // positioning the divs relating to the screen needs to happen when the div is "displayed"
          this.positioning();

          // PLAYING
          if (this.sound && !playing) {
            // avoiding errors from non-existing sounds and from audio playing while another is

            isPlaying();
            this.sound.play(); // play sound if it's not already
          }
        } else {
          if (this.sound) {
            // avoiding errors from non-existing sounds

            if (!this.sound.isPlaying()) {
              // keep div open while sound plays
              this.div.style("animation", "disappear 0.5s forwards");
            }
          } else {
            this.div.style("animation", "disappear 0.5s forwards");
          }
        }
      } else {
        this.div.style("display", "none");
      }
    }
  }

  positioning() {
    // positioning the divs relating to the screen

    let screenPos = {
      x: cursor?.x / zoomFactor + width / 2,
      y: cursor?.y / zoomFactor + height / 2,
    };

    let divh = this.div.size().height;
    let divw = this.div.size().width;

    // let divxoffset = screenPos.x > width / 2 ? divw: 0;
    let divxoffset = -divw / 2;
    let divyoffset = -divh / 2;

    //sotto
    if (screenPos.y > height / 2) {
      if (screenPos.y + divh / 2 > height) {
        divyoffset += height - (screenPos.y + divh / 2);
      }
      //sopra
    } else if (screenPos.y <= height / 2) {
      if (screenPos.y - divh / 2 < 0) {
        divyoffset += divh / 2 - screenPos.y;
      }
    }

    //this.div.position(screenPos.x + divxoffset, screenPos.y + divyoffset);
    this.div.style(
      "transform",
      "translate(" +
        (screenPos.x + divxoffset) +
        "px, " +
        (screenPos.y + divyoffset) +
        "px)"
    );
  }

  //MOVE
  move(dots, currentPose) {
    if (!this.sameBranchDots.length) {
      this.sameBranchDots = dots.filter(
        (d) => d.branch === this.branch && d !== this
      );
    }
    if (!this.samePoseDots.length && this.itemData.Pose) {
      this.samePoseDots = dots.filter(
        (d) => d.shouldHighlight(this.itemData.Pose) && d !== this
      );
    }

    // RESET BASE POSITION
    if (!this.shouldHighlight(currentPose) && currentPose) {
      this.basePos = p5.Vector.mult(this.originalPos, 2);
      this.radius = this.baseRadius;
    } else if (!currentPose) {
      this.basePos = p5.Vector.mult(this.originalPos, 1);
    }

    // Attraction
    let attraction = p5.Vector.sub(this.basePos, this.pos);
    attraction.mult(this.config.attractionForce);

    // Noise
    let n = (noise(this.noiseOffset) - 0.5) * this.config.noiseStrength;
    let noiseForce = createVector(n, n);
    this.noiseOffset += this.config.noiseStep;

    // Separation
    let separation = createVector(0, 0);

    const filteredDots = this.shouldHighlight(currentPose)
      ? this.samePoseDots
      : this.sameBranchDots;

    // const filteredDots = dots.filter(
    //   (d) =>
    //     this.shouldHighlight(currentPose)
    //       ? d.shouldHighlight(currentPose)
    //       : // controlla solo punti appartenenti allo stesso branch
    //         d.branch === this.branch

    // controlla anche punti dei branch adiacenti
    // : ((d.branch >= this.branch - 1 && d.branch <= this.branch + 1) ||
    //     (this.branch === 0 && d.branch === 15) ||
    //     (this.branch === 15 && d.branch === 0)) &&
    //   d !== this
    // );

    // other DOTS
    for (const other of filteredDots) {
      let diff = p5.Vector.sub(this.pos, other.pos);
      let distance = diff.mag();
      let minDistance = this.radius + other.radius + 1.5;

      if (this.shouldHighlight(currentPose)) {
        minDistance += this.randomC * 3; //se sono tra i punti con la posa selezionata impongo una minimum distance maggiore
      }

      if (distance < minDistance) {
        diff.normalize();
        diff.mult(this.config.separationForce * (minDistance - distance));
        separation.add(diff);
      }
    }

    // MOUSE INTERACTION
    // Scala le coordinate del mouse in base al fattore di zoom

    if (frameCount % 2 === 0) {
      // Check hover every 2 frames
      const hoverThreshold = this.baseRadius * 2;
      const d = dist(cursor?.x, cursor?.y, this.pos.x, this.pos.y);
      this.isHovered = d < hoverThreshold;
    }

    const targetRadius = this.isHovered ? this.baseRadius * 5 : this.baseRadius; //se l'oggetto viene hoverato aumentail raggio
    this.radius += (targetRadius - this.radius) * 0.1;

    //POSA
    // calcolo delle forze e dei limiti di posizionamento specifico per i punti della posa
    if (this.shouldHighlight(currentPose)) {
      let h = windowHeight / 4.5;
      const halfWidth = ((h / 3) * 4) / 4 + this.baseRadius;
      const halfHeight = h / 4 + this.baseRadius;

      const center = createVector(0, 0);
      const centerAttraction = p5.Vector.sub(center, this.pos);

      // Rectangular distance calculation
      const distanceX =
        this.pos.x - constrain(this.pos.x, -halfWidth, halfWidth);
      const distanceY =
        this.pos.y - constrain(this.pos.y, -halfHeight, halfHeight);
      const distanceSquared = distanceX * distanceX + distanceY * distanceY;
      const distance = sqrt(distanceSquared);

      // Enhanced noise effect
      const time = millis() * 0.001;
      const individualNoise = noise(
        this.pos.x * 0.01 + time,
        this.pos.y * 0.01 + time,
        this.index * 0.1
      );

      // definisco la zona in cui staranno gli elementi intorno al quadrato centrale
      const outerRepulsionZone =
        this.baseRadius + Math.max(halfWidth, halfHeight) * 3; //margini più ampi per l'esterno
      const innerRepulsionZone =
        this.baseRadius + Math.min(halfWidth, halfHeight);

      if (distance < outerRepulsionZone) {
        //forza di repulsione tre gli elementi
        let repulsionStrength = map(
          distance * (1 + individualNoise * 0.5),
          innerRepulsionZone,
          outerRepulsionZone,
          this.config.separationForce * 10,
          this.config.separationForce * 0.1
        );
        let repulsionVector = createVector(distanceX, distanceY);
        repulsionVector.normalize();
        repulsionVector.rotate(individualNoise * PI * 0.25);
        repulsionVector.mult(repulsionStrength);
        //sommo forze di separazione
        separation.add(repulsionVector);
        separation.add(
          createVector(individualNoise - 0.5, individualNoise - 0.5).mult(
            this.config.noiseStrength * 3
          )
        );

        //forza di attrazione tre gli elementi
        const attractionStrength = map(
          distance,
          innerRepulsionZone,
          outerRepulsionZone,
          0.005,
          0.05
        );
        centerAttraction.mult(attractionStrength);
      }
      //sommo forze di attrazione
      attraction.add(centerAttraction);

      // radius increment
      this.radius += (this.baseRadius * this.randomC - this.radius) * 0.1;
    }

    //SOMMO TUTTE LE FORZE
    this.vel.add(attraction);
    this.vel.add(separation);
    this.vel.add(noiseForce);

    // Damping and velocity limit
    this.vel.mult(this.config.damping);
    this.vel.limit(this.config.maxSpeed);

    // Update position
    this.pos.add(this.vel);
  }

  shouldHighlight(pose) {
    if (!pose) return false;
    return this.itemData.Pose == pose;
  }
}

// Function to escape special characters in string for regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Function to highlight text within HTML safely
function highlightText(description, highlights) {
  if (!highlights || !description) return description;

  // Escape the highlights text for regex
  const escapedHighlights = escapeRegExp(highlights);

  // Create a regex that matches the exact phrase
  const regex = new RegExp(`(${escapedHighlights})`, "gi");

  // Replace matching text with highlighted version
  return description.replace(regex, '<span class="highlight">$1</span>');
}

import { cursor, zoomFactor, selectedPose } from "./detect.js";
import { playing, isPlaying, hasPlayed } from "./tree.js";

export let platX;
export let platY;
export let branchIndex;

export class Dot {
  static colors = [
    //colors
    "#87BDF3",
    "#7DE44A",
    "#BDFF91",
    "#2CA02C",
    "#FCFF5C",
    "#009DB8",
    "#2E7F2E",
  ];

  //CONTSTRUCTOR
  constructor(
    branch,
    index,
    radius,
    itemData,
    imageMap,
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

    const imgIndex = Number(itemData.Image_num); // Convert to number
    this.image = imageMap[imgIndex];
    if (!this.image) {
      console.warn(
        `No image found for Image_num: ${itemData.Image_num}, Index: ${imgIndex}`
      );
    }

    this.color = Dot.colors[Math.floor(random(Dot.colors.length))];
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
            this.itemData.Description +
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
            this.itemData.Description +
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
  draw() {
    if (this.itemData.Hand == "Hand") {
      stroke("#C9FF4C"); //colora le immagini con la mano
      strokeWeight(3);
    } else {
      noStroke(); //se non ce l'hanno niente
    }
    noFill();
    fill(this.color);
    rect(this.pos.x, this.pos.y, this.radius + 3); //rect per disegnare il bordo, + 3 per disegnarlo esterno

    // if (this.isHovered) {
    //image(this.image, this.pos.x, this.pos.y, this.radius, this.radius);
    // }

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

          // narration

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
      x: cursor.x / zoomFactor + width / 2,
      y: cursor.y / zoomFactor + height / 2,
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

    this.div.position(screenPos.x + divxoffset, screenPos.y + divyoffset);
  }

  //MOVE
  move(dots, currentPose, z, imageMap) {
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

    const filteredDots = dots.filter((d) =>
      this.shouldHighlight(currentPose)
        ? d.shouldHighlight(currentPose)
        : ((d.branch >= this.branch - 1 && d.branch <= this.branch + 1) ||
            (this.branch === 0 && d.branch === 15) ||
            (this.branch === 15 && d.branch === 0)) &&
          d !== this
    );

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

    const d = dist(cursor?.x, cursor?.y, this.pos.x, this.pos.y);

    const hoverThreshold = this.baseRadius * 2;
    this.isHovered = d < hoverThreshold;
    const targetRadius = this.isHovered ? this.baseRadius * 5 : this.baseRadius; //se l'oggetto viene hoverato aumentail raggio
    this.radius += (targetRadius - this.radius) * 0.1;

    mouseIsPressed && d < hoverThreshold && frameCount % 3 === 0 //impongo una treshold legata al framecount così da evitare un pochino click multipli
      ? console.log(
          this.itemData.Hand,
          this.itemData.Image_num,
          //imageMap.indexOf(this.image), // aggiungo 2 perchè this.itemData.Image_num is (ex. 324) = this.imageIndex (ex. 322, 324 - 2) because image files start numbering from 2
          this.itemData.Description
        )
      : null;

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

  shouldHighlight(currentPose) {
    if (!currentPose) return false;
    return this.itemData.Pose == currentPose;
  }
}

import * as THREE from "three";
import { sceneToScreen, screenToScene } from "./utils.js";
import {
  cursor,
  zoomFactor,
  selectedPose,
  video,
  canvasW,
  canvasH,
  inbounds,
} from "./detect-three.js";
import { camera, scene } from "./tree-three.js";

export let platX;
export let platY;
export let branchIndex;

// sottotitolo
let subtitle = document.getElementById("subtitle");
let sub = document.getElementById("sub");

export let audioPlaying = false;

export class Dot {
  //CONTSTRUCTOR
  constructor(
    branch,
    index,
    radius,
    itemData,
    basePosition,
    finalPosition,
    instancedMesh
  ) {
    const sceneBasePos = screenToScene(camera, [
      basePosition.x,
      basePosition.y,
    ]);
    const sceneFinalPos = screenToScene(camera, [
      finalPosition.x,
      finalPosition.y,
    ]);

    this.branch = branch.index;

    // position
    this.finalPosition = finalPosition;
    this.basePos = new THREE.Vector3(sceneBasePos.x, sceneBasePos.y, 0); // Base position along the branch (without offset)
    this.pos = new THREE.Vector3(sceneFinalPos.x, sceneFinalPos.y, 0); // Final position with offset applied
    this.originalPos = this.basePos.clone(); // Original position copy

    // PROPERTIES
    this.index = index;
    // this.color = Dot.colors[Math.floor(random(Dot.colors.length))];
    this.baseRadius = radius;
    this.radius = radius;
    this.scale = 1;

    this.itemData = itemData;

    // three
    this.instancedMesh = instancedMesh;
    this.dummy = new THREE.Object3D(); // Add a dummy object for matrix calculations
    this.matrix = new THREE.Matrix4();

    this.sameBranchDots = [];
    this.samePoseDots = [];

    this.isHovered = false;

    // properties of the forces add to the posiiton
    this.config = {
      maxSpeed: 6,
      attractionForce: 0.008,
      separationForce: 0.09,
      damping: 0.5,
      noiseStrength: 0.5,
      noiseStep: 0.005,
    };

    // Velocity vector
    this.vel = new THREE.Vector3(0, 0, 0);

    // Noise offset and random pre-generation
    this.noiseOffset = random(1000);
    this.randomC = random(1, 4);

    // DIVs
    this.div = itemData.Content_pose ? createDiv() : null;

    if (this.div) {
      this.div.addClass("storycontainer topleft");
      this.div.addClass(itemData.Pose);

      if (this.itemData.Content_pose == "Text") {
        this.div.html(
          "<div class='box'><div class='info'>[" +
            this.itemData.Platform +
            (this.itemData.Year ? ", " + this.itemData.Year : "") + //se c'è l'anno scrivo l'anno
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

    //audio
    if (
      itemData.Content_pose &&
      itemData.Content_pose != "Image" &&
      itemData.Audio_track != null
    ) {
      this.sound = loadSound(
        "./assets/audio/" + itemData.Audio_track + ".wav",
        null,
        // Error callback
        (error) => {
          console.log(
            "Could not load audio file " + itemData.Audio_track + ".wav"
          );
          this.sound = null;
        }
      );
    }
    if (this.sound) {
      this.sound.onended(() => {
        audioPlaying = false;
        subtitle.classList.remove("visible");
      });
    }
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
      //quando una posa viene detectata si allontanano
      this.basePos = this.originalPos.clone().multiplyScalar(3);
      this.radius = this.baseRadius;
    } else if (!currentPose) {
      this.basePos = this.originalPos;
    }

    // Attraction
    let attraction = this.basePos.clone().sub(this.pos);
    attraction.multiplyScalar(this.config.attractionForce);

    // Noise
    let n = (noise(this.noiseOffset) - 0.5) * this.config.noiseStrength;
    let noiseForce = new THREE.Vector3(n, n, 0);
    this.noiseOffset += this.config.noiseStep;

    // Separation
    let separation = new THREE.Vector3(0, 0, 0);

    const filteredDots = this.shouldHighlight(currentPose)
      ? this.samePoseDots
      : this.sameBranchDots;

    // other DOTS
    for (const other of filteredDots) {
      //   let diff = p5.Vector.sub(this.pos, other.pos);
      let diff = this.pos.clone().sub(other.pos);
      let distance = diff.length();
      let minDistance = this.radius + other.radius + 1.5;

      if (this.shouldHighlight(currentPose)) {
        minDistance += 4; //se sono tra i punti con la posa selezionata impongo una minimum distance maggiore
      }

      if (distance < minDistance) {
        diff.normalize();
        diff.multiplyScalar(
          this.config.separationForce * (minDistance - distance)
        );
        separation.add(diff);
      }
    }

    // MOUSE INTERACTION
    // Scala le coordinate del mouse in base al fattore di zoom

    if (frameCount % 2 === 0) {
      // Check hover every 2 frames
      const hoverThreshold = this.baseRadius * 3;

      const sceneCursor = screenToScene(
        camera,
        [cursor?.x, cursor?.y],
        this.index == 0
      );

      const d = dist(sceneCursor?.x, sceneCursor?.y, this.pos.x, this.pos.y);
      this.isHovered = d < hoverThreshold;
    }

    const targetRadius = this.isHovered
      ? this.baseRadius * 2.5
      : this.baseRadius * this.scale; //se l'oggetto viene hoverato aumentail raggio
    this.radius += (targetRadius - this.radius) * 0.1;

    //POSA
    // calcolo delle forze e dei limiti di posizionamento specifico per i punti della posa
    if (this.shouldHighlight(currentPose)) {
      let h = video.videoHeight * 0.4;
      const halfWidth = ((h / 3) * 4) / 4 + this.baseRadius * 2;
      const halfHeight = h / 4 + this.baseRadius * 2;

      const center = new THREE.Vector3(0, 0, 0);
      const centerAttraction = center.sub(this.pos);

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
        this.baseRadius + Math.min(halfWidth, halfHeight) * 1.5;

      if (distance < outerRepulsionZone) {
        //forza di repulsione tre gli elementi
        let repulsionStrength = map(
          distance * (1 + individualNoise * 0.5),
          innerRepulsionZone,
          outerRepulsionZone,
          this.config.separationForce * 10,
          this.config.separationForce * 0.1
        );
        let repulsionVector = new THREE.Vector3(distanceX, distanceY, 0);
        repulsionVector.normalize();

        repulsionVector.multiplyScalar(repulsionStrength);
        //sommo forze di separazione
        separation.add(repulsionVector);
        separation.add(
          new THREE.Vector3(
            individualNoise - 0.5,
            individualNoise - 0.5,
            0
          ).multiplyScalar(this.config.noiseStrength * 3)
        );

        //forza di attrazione tre gli elementi
        const attractionStrength = map(
          distance,
          innerRepulsionZone,
          outerRepulsionZone,
          0.005,
          0.05
        );
        centerAttraction.multiplyScalar(attractionStrength);
      }
      //sommo forze di attrazione
      attraction.add(centerAttraction);
    }

    //SOMMO TUTTE LE FORZE
    this.vel.add(attraction);
    this.vel.add(separation);
    this.vel.add(noiseForce);

    // Damping and velocity limit
    this.vel.multiplyScalar(this.config.damping);
    this.vel.clampLength(0, this.config.maxSpeed);

    // Update position
    this.pos.add(this.vel);

    // Update position and scale using dummy object
    this.dummy.position.copy(this.pos);
    this.dummy.scale.setScalar(this.scale);
    this.dummy.updateMatrix();

    this.matrix.setPosition(this.pos);

    // Set the matrix for this instance
    this.instancedMesh.setMatrixAt(this.index, this.dummy.matrix);
  }

  //DRAW
  //regola le interazioni al momento della storia
  draw(currentPose) {
    let targetScale = 1;

    if (this.div) {
      if (this.itemData.Pose == selectedPose) {
        targetScale = 4;

        console.log(!inbounds);
        // if (this.isHovered && !inbounds) {
        if (this.isHovered) {
          // console.log(audioPlaying);
          if (!audioPlaying) {
            // Only handle new interactions when no audio is playing
            this.div.style("display", "block");
            this.div.style("animation", "appear 0.5s forwards");

            this.positionStoryCard();
            // console.log(subtitle);

            // console.log(this.sound);
            if (this.sound) {
              subtitle.classList.add("visible");
              sub.innerHTML = this.itemData.Highlights_eng;
              this.sound.play();
              audioPlaying = true;
            }
          }
        } else {
          // Only hide div if there's no sound or sound isn't playing
          if (!this.sound || !this.sound.isPlaying()) {
            this.div.style("animation", "disappear 0.5s forwards");
          }
        }
      } else {
        targetScale = 1;
        this.div.style("display", "none");
      }
    }

    this.scale += (targetScale - this.scale) * 0.1;
    // this.mesh.scale.set(this.scale, this.scale, this.scale);
  }

  positionStoryCard() {
    let screenPos = {
      x: cursor?.x / zoomFactor,
      y: cursor?.y / zoomFactor,
    };

    let divh = this.div.size().height;
    let divw = this.div.size().width;
    let divxoffset = -divw / 2;
    let divyoffset = -divh / 2;

    //sotto
    if (screenPos.y > canvasH / 2) {
      if (screenPos.y + divh / 2 > canvasH) {
        divyoffset += canvasH - (screenPos.y + divh / 2);
      }
      //sopra
    } else if (screenPos.y <= canvasH / 2) {
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

export class Dot {
  // Static color pool to reduce random calls
  static colors = [
    "#87BDF3",
    "#7DE44A",
    "#BDFF91",
    "#2CA02C",
    "#FCFF5C",
    "#009DB8",
    "#2E7F2E",
  ];

  constructor(branch, index, radius, type, itemData) {
    const t = random(0.5, 0.9);
    const branchAngle = atan2(
      branch.end.y - branch.start.y,
      branch.end.x - branch.start.x
    );

    const baseX = lerp(branch.start.x, branch.end.x, t);
    const baseY = lerp(branch.start.y, branch.end.y, t);

    const spread = 50;
    const perpAngle = branchAngle + HALF_PI;
    const offset = randomGaussian() * spread;

    this.pos = createVector(
      baseX + cos(perpAngle) * offset,
      baseY + sin(perpAngle) * offset
    );
    this.basePos = createVector(baseX, baseY);
    this.originalPos = this.basePos;
    // Simplified property initialization
    this.index = index;
    this.color = Dot.colors[Math.floor(random(Dot.colors.length))];
    this.type = type;
    this.baseRadius = radius;
    this.radius = radius;
    this.itemData = itemData;

    // properties of the vector for positioning
    this.config = {
      maxSpeed: 6, // Increased for more dynamic movement
      attractionForce: 0.005, // Reduced for looser grouping
      separationForce: 0.1, // Adjusted for balance
      damping: 0.45, // Slightly increased for more organic movement
      noiseStrength: 0.5, // Increased for more randomness
      noiseStep: 0.005, // Reduced for smoother transitions
    };

    // Velocity vector
    this.vel = createVector(0, 0);

    // Noise offset pre-generation
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
  }

  move(dots, currentPose) {
    if (!this.shouldHighlight(currentPose) && currentPose) {
      this.basePos = p5.Vector.mult(this.originalPos, 1.5);
    } else if (!currentPose) {
      this.basePos = this.originalPos;
    }

    //Attraction
    let attraction = p5.Vector.sub(this.basePos, this.pos);
    attraction.mult(this.config.attractionForce);

    // noise
    let noiseX = (noise(this.noiseOffsetX) - 0.5) * this.config.noiseStrength;
    let noiseY = (noise(this.noiseOffsetY) - 0.5) * this.config.noiseStrength;
    let noiseForce = createVector(noiseX, noiseY);
    this.noiseOffsetX += this.config.noiseStep;
    this.noiseOffsetY += this.config.noiseStep;

    //separation
    let separation = createVector(0, 0);
    const halfWidth = 150 / 4 + this.radius;
    const halfHeight = ((150 / 4) * 3) / 4 + this.radius;

    if (this.shouldHighlight(currentPose)) {
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
      const time = millis() * 0.001; // Use time for flowing movement
      const individualNoise = noise(
        this.pos.x * 0.01 + time,
        this.pos.y * 0.01 + time,
        this.index * 0.1
      );

      // Create circular movement tendency
      const angle = noise(this.index * 0.5, time * 0.2) * TWO_PI;
      const circularForce = createVector(
        cos(angle) * this.config.noiseStrength * 2,
        sin(angle) * this.config.noiseStrength * 2
      );

      // Wider repulsion zone with softer boundaries
      const outerRepulsionZone =
        this.radius + Math.max(halfWidth, halfHeight) * 3;
      const innerRepulsionZone = this.radius + Math.min(halfWidth, halfHeight);

      if (distance < outerRepulsionZone) {
        // Smoother repulsion with noise influence
        let repulsionStrength = map(
          distance * (1 + individualNoise * 0.5),
          innerRepulsionZone,
          outerRepulsionZone,
          this.config.separationForce * 1.5,
          this.config.separationForce * 0.05
        );

        let repulsionVector = createVector(distanceX, distanceY);
        repulsionVector.normalize();
        repulsionVector.rotate(individualNoise * PI * 0.25); // Add slight rotation
        repulsionVector.mult(repulsionStrength);
        separation.add(repulsionVector);

        // Variable center attraction
        const attractionStrength = map(
          distance,
          innerRepulsionZone,
          outerRepulsionZone,
          0.005 + individualNoise * 0.01,
          0.03 + individualNoise * 0.02
        );
        centerAttraction.mult(attractionStrength);
      }

      // Add circular and noise-based movement
      separation.add(circularForce);
      separation.add(
        createVector(individualNoise - 0.5, individualNoise - 0.5).mult(
          this.config.noiseStrength * 3
        )
      );

      attraction.add(centerAttraction);
    }
    // Separation calculation with more efficient loop

    for (const other of dots) {
      if (other !== this) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        let distance = diff.mag();
        let minDistance = this.radius + other.radius;
        if (this.shouldHighlight(currentPose)) {
          minDistance += 25;
        }

        if (distance < minDistance) {
          diff.normalize();
          diff.mult(this.config.separationForce * (minDistance - distance));
          separation.add(diff);
        }
      }
    }

    // Apply forces more efficiently
    this.vel.add(attraction);
    this.vel.add(separation);
    this.vel.add(noiseForce);

    // Damping and speed limit
    this.vel.mult(this.config.damping);
    this.vel.limit(this.config.maxSpeed);

    // Update position
    this.pos.add(this.vel);

    // Radius adjustment for hover effect
    const d = dist(
      mouseX - width / 2,
      mouseY - height / 2,
      this.pos.x,
      this.pos.y
    );
    const targetRadius =
      d < this.baseRadius + 2.5 ? this.baseRadius * 3 : this.baseRadius;

    this.radius += (targetRadius - this.radius) * 0.1;

    // Log listing info when the mouse is within the hover range
    if (d < this.baseRadius + 2.5) {
      //console.log(this.itemData.Description);
    }
  }

  draw(currentPose) {
    push(); // Save current drawing state

    let x;
    let y;

    if (this.shouldHighlight(currentPose)) {
      stroke("#C9FF4C"); // Bright red for visibility
      strokeWeight(3);
      this.highlighted = true;
    } else {
      noStroke();
      this.highlighted = false;
    }

    x = this.pos.x;
    y = this.pos.y;
    fill(this.color);
    rect(x, y, this.radius);

    pop(); // Restore drawing state
  }

  shouldHighlight(currentPose) {
    if (!currentPose) return false;
    return this.itemData.Pose == currentPose;
  }

  getItemInfo() {
    return this.itemData;
  }
}

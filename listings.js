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

    // Simplified property initialization
    this.index = index;
    this.color = Dot.colors[Math.floor(random(Dot.colors.length))];
    this.type = type;
    this.baseRadius = radius;
    this.radius = radius;
    this.itemData = itemData;

    // properties of the vector for positioning
    this.config = {
      maxSpeed: 5,
      attractionForce: 0.005,
      separationForce: 0.09,
      damping: 0.4,
      noiseStrength: 0.5,
      noiseStep: 0.0005,
    };

    // Velocity vector
    this.vel = createVector(0, 0);

    // Noise offset pre-generation
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
  }

  move(dots, currentPose) {
    // Calculate attraction force toward the base position
    let attraction = p5.Vector.sub(this.basePos, this.pos);
    attraction.mult(this.config.attractionForce);

    // If the dot should highlight, add an additional attraction toward the center
    if (this.shouldHighlight(currentPose)) {
      console.log(currentPose);
      this.highlighted = true;
      const center = createVector(0, 0); // Center of the canvas
      const centerAttraction = p5.Vector.sub(center, this.pos);
      centerAttraction.mult(0.05); // Adjust the strength of the attraction force
      attraction.add(centerAttraction);
    }

    // Separation calculation with more efficient loop
    let separation = createVector(0, 0);
    for (const other of dots) {
      if (other !== this) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        let distance = diff.mag();
        let minDistance = this.radius + other.radius;

        if (distance < minDistance) {
          diff.normalize();
          diff.mult(this.config.separationForce * (minDistance - distance));
          separation.add(diff);
        }
      }
    }

    // Separation from meCamera rectangle
    const halfWidth = 150 / 2;
    const halfHeight = ((150 / 4) * 3) / 2;

    // Push the dots outside the meCamera rectangle

    // Add Perlin noise
    let noiseX = (noise(this.noiseOffsetX) - 0.5) * this.config.noiseStrength;
    let noiseY = (noise(this.noiseOffsetY) - 0.5) * this.config.noiseStrength;
    let noiseForce = createVector(noiseX, noiseY);

    // Update noise offsets
    this.noiseOffsetX += this.config.noiseStep;
    this.noiseOffsetY += this.config.noiseStep;

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
      console.log(this.itemData.Description);
    }
  }

  draw(currentPose) {
    push(); // Save current drawing state

    let x;
    let y;

    if (this.shouldHighlight(currentPose)) {
      // stroke("#FF0000"); // Bright red for visibility
      // strokeWeight(2);
      this.highlighted = true;

      // x = 0;
      // y = 0;
    } else {
      noStroke();
      this.highlighted = false;
      // x = this.pos.x;
      // y = this.pos.y;
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

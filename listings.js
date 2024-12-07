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
export class Dot {
  constructor(branch, index, radius, type) {
    // Calculate initial position along the branch
    const t = random(0.4, 0.9); // Random position along branch
    const branchAngle = atan2(
      branch.end.y - branch.start.y,
      branch.end.x - branch.start.x
    );

    // Calculate base position along branch
    const baseX = lerp(branch.start.x, branch.end.x, t);
    const baseY = lerp(branch.start.y, branch.end.y, t);

    // Add some random spread perpendicular to the branch
    const spread = 50; // Adjust this value to control spread
    const perpAngle = branchAngle + HALF_PI;
    const offset = randomGaussian() * spread;
    const x = baseX + cos(perpAngle) * offset;
    const y = baseY + sin(perpAngle) * offset;

    // Initialize properties
    this.pos = createVector(x, y);
    this.basePos = createVector(baseX, baseY); // Keep track of base position
    this.index = index;
    this.color = random(colors);
    this.type = type;
    this.baseRadius = radius;
    this.radius = radius;

    // Movement properties
    this.vel = createVector(0, 0);
    this.maxSpeed = 5;
    this.attractionForce = 0.005;
    this.separationForce = 0.05;
    this.damping = 0.5;

    //Noise properties
    this.noiseOffsetX = random(1000); // Random starting point for noise
    this.noiseOffsetY = random(1000);
    this.noiseStep = 0.001; // How fast the noise changes
    this.noiseStrength = 0.5; // How much the noise affects position
  }

  move(dots) {
    // Calculate forces
    let attraction = p5.Vector.sub(this.basePos, this.pos);
    attraction.mult(this.attractionForce);

    // Separation from other dots
    let separation = createVector(0, 0);
    dots.forEach((other) => {
      if (other !== this) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        let distance = diff.mag();
        let minDistance = this.radius + other.radius;

        if (distance < minDistance) {
          diff.normalize();
          diff.mult(this.separationForce * (minDistance - distance));
          separation.add(diff);
        }
      }
    });

    // Add Perlin noise
    let noiseX = (noise(this.noiseOffsetX) - 0.5) * this.noiseStrength;
    let noiseY = (noise(this.noiseOffsetY) - 0.5) * this.noiseStrength;
    let noiseForce = createVector(noiseX, noiseY);

    // Update noise offsets
    this.noiseOffsetX += this.noiseStep;
    this.noiseOffsetY += this.noiseStep;

    // Apply forces
    this.vel.add(attraction);
    this.vel.add(separation);
    this.vel.add(noiseForce); // Aggiungiamo la forza del noise
    this.vel.mult(this.damping);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);

    // Update radius based on hover

    const d = dist(
      mouseX - width / 2,
      mouseY - height / 2,
      this.pos.x,
      this.pos.y
    );
    const targetRadius =
      d < this.baseRadius + 2.5 ? this.baseRadius * 3 : this.baseRadius;
    this.radius += (targetRadius - this.radius) * 0.1;
  }

  draw() {
    noStroke();
    fill(this.color);
    //circle(this.pos.x, this.pos.y, this.radius);
    rect(this.pos.x, this.pos.y, this.radius);
  }
}

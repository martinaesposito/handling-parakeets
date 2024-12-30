import * as THREE from "three";

export function screenToScene(camera, coords = [0, 0], shouldLog) {
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();

  if (camera instanceof THREE.OrthographicCamera) {
    // Orthographic camera case
    const width = (camera.right - camera.left) / camera.zoom;
    const height = (camera.top - camera.bottom) / camera.zoom;

    // Normalize the screen coordinates to [-1, 1] range for both axes
    const normalizedX = (coords[0] / camera.zoom / window.innerWidth) * 2 - 1;
    const normalizedY = -(
      (coords[1] / camera.zoom / window.innerHeight) * 2 -
      1
    ); // Invert Y for Three.js standard

    // Map the normalized screen coordinates to world coordinates
    const x = (normalizedX * width) / 2;
    const y = (normalizedY * height) / 2;

    // Assuming z = 0 for world-space (you can adjust this based on your scene depth)
    origin.set(x, y, 0);
  } else if (camera instanceof THREE.PerspectiveCamera) {
    // Perspective camera case
    direction.set(normalizedX, normalizedY, 0.5); // Start at the middle of the near plane
    direction.unproject(camera); // Convert to world space by unprojecting
    camera.matrixWorld.getTranslation(origin); // Get camera world position

    // Calculate intersection with the z=0 plane
    const planeOrigin = new THREE.Vector3(0, 0, 0);
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const rayDirection = direction.sub(origin).normalize(); // Normalize direction

    const denom = rayDirection.dot(planeNormal);
    if (Math.abs(denom) > 1e-6) {
      // Not parallel to the plane
      const t =
        (planeOrigin.dot(planeNormal) - origin.dot(planeNormal)) / denom;
      if (t >= 0) {
        return origin.add(rayDirection.multiplyScalar(t)); // Return intersection point
      }
    }
    return null; // No intersection found
  }

  return origin; // Return the calculated world-space position
}

export function sceneToScreen(camera, size, canvasWidth, canvasHeight) {
  const viewWidth = camera.right - camera.left;
  const viewHeight = camera.top - camera.bottom;
  const scaleX = canvasWidth / viewWidth;
  const scaleY = canvasHeight / viewHeight;
  return size * Math.min(scaleX, scaleY);
}

// P5 Utils, no need for now

export function map(n, start1, stop1, start2, stop2, withinBounds) {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  } else {
    return constrain(newval, stop2, start2);
  }
}

export function constrain(n, start, stop) {
  return Math.min(Math.max(n, start), stop);
}

export function random(min, max) {
  let rand = Math.random();

  if (typeof min === "undefined") {
    return rand;
  } else if (typeof max === "undefined") {
    if (Array.isArray(min)) {
      return min[Math.floor(rand * min.length)];
    } else {
      return rand * min;
    }
  } else {
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }

    return rand * (max - min) + min;
  }
}

export function lerp(start, stop, amt) {
  return amt * (stop - start) + start;
}

export function randomGaussian(mean, sd = 1) {
  let y1, x1, x2, y2, w;

  do {
    x1 = Math.random() * 2 - 1;
    x2 = Math.random() * 2 - 1;
    w = x1 * x1 + x2 * x2;
  } while (w >= 1);

  w = Math.sqrt((-2 * Math.log(w)) / w);
  y1 = x1 * w;
  y2 = x2 * w;

  const m = mean || 0;
  return y1 * sd + m;
}

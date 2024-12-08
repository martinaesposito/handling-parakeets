let font;
let imagePromises=[]
function preload() {
    font = loadFont("assets/fonts/HelveticaLTStd-Roman.otf"); //font

    for (let i = 2; i < 887; i++) {
      //carico tutte le immagini di tutti i listings
      const imagePromise = new Promise((resolve) => {
        const img = loadImage(
          "assets/immagini/" + i + ".png",
          () => {
            images.push(img);
            resolve(img);
          },
          () => {
            resolve(null); // Resolve with null if image fails to load
          }
        );
      });
      imagePromises.push(imagePromise);
    }
  
    await Promise.all(imagePromises); // Wait for all image loading attempts to complete
    console.log(images); //controllo che ci siano tutte e che siano corrette
    
}

function setup() {
  createCanvas(100, 100);

  background(200);

  // Get the point array.
  let points = font.textToPoints('p5*js', 6, 60, 35, { sampleFactor:  0.5 });

  // Draw a dot at each point.
  for (let p of points) {
    point(p.x, p.y);
  }

  describe('A set of black dots outlining the text "p5*js" on a gray background.');
}
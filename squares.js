let myJSON;
let myImgs = [];
let img_n;

let squares = [];

let current_pose = "start";

let debugmenu;

function preload() {

    myJSON = loadJSON("./listings.json", createObjects);
    
}

function createObjects(Json) {

    img_n = Object.keys(myJSON).length;

    let padding = [400, 50];
    let sizing = [30, 30];

    for (let i = 0; i < img_n; i++) {

        let xpos = random(padding[0], windowWidth - padding[0]);
        let ypos = random(padding[1], windowHeight - padding[1]);
        let size = random(sizing[0], sizing[1]);

        let div = createDiv();
        div.style("display", "none"); // not displayed initially

        squares[i] = new rects(xpos, ypos, size, div, myJSON[i]);
        squares[i].settings();
    }

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
    debugmenu.option("Half-closed");
    debugmenu.option("Touching tips");
    debugmenu.option("Finger perch");
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


class rects {
    constructor (x, y, size, div, data) {

        this.x = x;
        this.y = y;
        this.size = size;
        this.div = div;
        this.data = data;
    }

    settings() {

        // setting up the data contained in the divs

        this.div.position(this.x, this.y);

        this.div.addClass("box");

        this.div.addClass(this.data.Pose);

        if (this.data.Content_pose == "Text") {

            this.div.html(this.data.Description);
        } else if (this.data.Content_pose == "Image") {

            this.div.html("<img src='./assets/hands/" + this.data.Image_num % 114 + // remove the % stuff & number after we have the right images
                ".png' class='image'>" + this.data.Image_num);
        } else if (this.data.Content_pose == "Image_and_text") {

            this.div.html("<img src='./assets/hands/" + this.data.Image_num % 114 + // remove the % stuff & number after we have the right images
                ".png' class='image'><br><br>" + this.data.Image_num + this.data.Description);
        }
    }

    draw() {
        
        // positioning the divs relating to the screen

        let xpos = 0;

        if (this.x > windowWidth / 2) {

            this.div.style("transform", "translate(-" + this.div.style("width"));
            xpos = this.div.style("width");
        }

        if (this.y > windowHeight / 2) {

            this.div.style("transform", "translate(-" + xpos + ", -" + this.div.style("height"));
        }

        // handling what appears during narration

        if (this.data.Pose == current_pose) {

            rect(this.x, this.y, this.size);

            // on hover

            let offsetx = this.size / 2;
            let offsety = this.size / 2;

            if (mouseX <= this.x + offsetx && mouseX >= this.x - offsetx && mouseY <= this.y + offsety && mouseY >= this.y - offsety) {

                this.div.style("display", "block");
                this.div.style("animation", "appear 0.5s forwards");
            } else {

                this.div.style("animation", "disappear 0.25s forwards");
            }
        } else {

            this.div.style("display", "none");
        }
    }
}
var squares = [];

var n_img;
var current_pose;

// debug menu

let debugmenu;

function preload() {
    // put the json info into an array

    loadJSON("./listings.json", handleJSON);
}

function handleJSON(data) {

    n_img = data.length;

    for (let i = 0; i < n_img; i++) {

        let my_json = data[i];

        // creating the divs linked to the squares

        let my_div = createDiv("Json contenutone");

        let padding = [60, 30];
        let sizing = [30, 30];

        let xpos = random(padding[0], windowWidth - padding[0]);
        let ypos = random(padding[1], windowHeight - padding[1]);
        let size = random(sizing[0], sizing[1]);

        squares[i] = new square(xpos, ypos, size, my_div, my_json);
        console.log(my_json);
        squares[i].settingup();
    }
}


function setup() {

    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    rectMode(CENTER);

    // create debug menu

    debugmenu = createSelect(false);
    debugmenu.position(0, 0);
    debugmenu.option("none");
    debugmenu.option("Shell");
    debugmenu.option("Grip");
    debugmenu.option("Open");
    debugmenu.option("Half-closed");
}

function draw() {

    clear();

    for (let i = 0; i < squares.length; i++){
        squares[i].draw(i);

        // hovering over squares
        squares[i].hover(i);
    }

    current_pose = debugmenu.selected();

}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

class square {
    constructor (x, y, size, div, data) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.div = div;
        this.data = data;

        rect(this.x, this.y, this.size);
    }

    settingup () {
        // style information

        div.style("position", "absolute");
        div.style("max-width", "400px");
        div.style("height", "auto");
        div.style("padding", "0px 10px 0px 10px");
        div.style("background", "#cccccc");

        // set position of the divs with an offset from the coresponding square

        if (xpos >= windowWidth / 2) {
            
            if (ypos >= windowHeight / 2) {
                divs[i].position(xpos - (size*10), ypos - (size*2));
            } else {
                divs[i].position(xpos - (size*10), ypos + size);
            }
        } else {
            
            if (ypos <= windowHeight / 2) {
                divs[i].position(xpos + size, ypos + size);
            } else {
                divs[i].position(xpos + size, ypos - (size*5));
            }
        }

        // setting every div with the coresponding hand pose class

        divs[i].addClass(my_json[i].Pose);
        console.log(divs[i]);

        squares[i].draw(i);
    }

    draw (i) {

        if (my_json[i].Pose === current_pose) {
            
            console.log(divs[i]);

            rect(this.x, this.y, this.size);
            divs[i].style("display", "block");
        } else {
            
            divs[i].style("display", "none");
        }
    }

    hover (i) {
        let offset = this.size / 2;

        if ((mouseX <= this.x + offset && mouseX >= this.x - offset) && (mouseY <= this.y + offset && mouseY >= this.y - offset)) {

            divs[i].style("animation", "appear 0.5s forwards");

        } else {

            divs[i].style("animation", "disappear 0.25s forwards");
        }

    }
}
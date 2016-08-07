/*
 Avi Grayson and Gal Eldar
 -------------------------
*/

var targetCanvas, targetCtx, targetPixels, targetData;
var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
var canvasWidth = 350;
var canvasHeight = 350;
var backgroundColor = "rgb(0, 0, 0)";
var triColor = "rgba(255, 255, 255, 0.3)";
var fontColor = "rgb(255, 255, 255)";
//--------------------------------//
var numShapes = 15; //number of shapes in each genome
var popSize = 35; //number of genomes in the population
var cycle; //counter that keeps track of which genome in the population is being addressed
var generation; //counter for generation count
var popIndex; //counter that keeps track of which population is being addressed
var pops = []; //pops holds a different population for each letter entered by the user
var on = false; //Word has not been submitted and GA has not started
var mutationRate = 0.005;
var survivors = 7; //number of genomes to be saved and copied for the next generation during crossover


/**
 * Provides requestAnimationFrame in a cross browser way.
 * @author paulirish / http://paulirish.com/
 **/
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function() {
        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();
}

//for each letter:
// create working canvas to be displayed
// write letter to working canvas, get pixel data
// create new population and add to pops

function initialize() {
    write = write.toUpperCase();
    $("body").css("background-color", backgroundColor);
    for (var i = 0; i < write.length; i++) {
        workingCtx = getWorkingCtx(i, write.length);
        var char = write.charAt(i);
        pixelData = getTargetData(i, char, backgroundColor, fontColor);
        pops.push(new Population(popSize, numShapes, workingCtx, pixelData));
    }
    cycle = 0;
    generation = 0;
    requestAnimationFrame(evolve);
}


//main loop:
// display and calculate fitness for each genome in the current population
// perform crossover and mutation on the current population
function evolve() {
    for (var pop = 0; pop < pops.length; pop++) {
        popIndex = pop;
        if (cycle < popSize - 1) {
            display();
            fitness();
        } else {
            crossOver();
            mutate();
        }
    }

    if (cycle < popSize - 1) {
        cycle++;
    } else {
        cycle = 0;
        generation++;
    }
    window.requestAnimationFrame(evolve);
}




//---------------------------------------------------------------------//
//-----------------------------> Display <-----------------------------//

function display() {
    clear();
    //draw each triangle in genomeOne
    for (i = 0; i < numShapes; i++) {
        var t = pops[popIndex].genomes[cycle].triangles[i];
        pops[popIndex].ctx.beginPath();
        pops[popIndex].ctx.moveTo(t.x1, t.y1);
        pops[popIndex].ctx.lineTo(t.x2, t.y2);
        pops[popIndex].ctx.lineTo(t.x4, t.y4);
        pops[popIndex].ctx.lineTo(t.x3, t.y3);
        pops[popIndex].ctx.closePath();
        pops[popIndex].ctx.fillStyle = triColor; //'rgba(' + t.r + ',' + t.g + ',' + t.b + ',' + 0.3 + ')'; <-- for multicolor image
        pops[popIndex].ctx.fill();
    }
}

//refresh black background behind working image
function clear() {
    pops[popIndex].ctx.fillStyle = backgroundColor;
    pops[popIndex].ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}



//---------------------------------------------------------------------//
//-----------------------------> Fitness <-----------------------------//

//evaluates the fitness of a genome by retrieving the rgb pixel values of each
//pixel in the working image and comparing it to the pixel value in the same
//location in the target image
//
//The algorithm is currently only reading the red pixel values because only one
//pixel value is needed for black and white fitness. The lines below can be uncommented
//to calculate the fitness of all colors

function fitness() {
    //get working data
    var workingPixels = pops[popIndex].ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    var workingData = workingPixels.data;
    var targetData = pops[popIndex].targetPixelData;
    var fit = 0; //cumulative fitness
    for (var i = 0; i < canvasWidth * canvasHeight * 4; i += 4) {
        var red1 = parseInt(targetData[i]);
        //var green1 = parseInt( targetData[i + 1] );
        //var blue1 = parseInt( targetData[i + 2] );
        //var alpha1 = parseFloat(targetData[i + 3]);

        var red2 = parseInt(workingData[i]);
        //var green2 = parseInt( workingData[i + 1] );
        //var blue2 = parseInt( workingData[i + 2] );
        //var alpha2 = parseFloat(workingData[i + 3]);

        var redFit = red1 - red2;
        //var greenFit = green1 - green2;
        //var blueFit = blue1 - blue2;
        //var alphaFit = alpha1 - alpha2;

        fit += (redFit * redFit); //+ ( greenFit * greenFit ) + ( blueFit * blueFit ); //+ (alphaFit * alphaFit * 255); //add alphaFit
    }
    pops[popIndex].genomes[cycle].fit = fit;
}



//---------------------------------------------------------------------//
//---------------------------> Crossover <-----------------------------//

//crossOver:
// --> reorder the genomes from lowest fitness to highest
// --> The top genomes are selected to survive
// --> Generate random crossover points
// --> randomly select 2 genomes to crossover from the survivors
// --> build new genomes and copy them into the population

function crossOver() {
    var parents = []; //array of genomes with lowest fitness values
    //reorder genomes by fitness value: lowest -> highest
    for (var i = 0; i < popSize; i++) {
        for (var j = i; j < popSize - 1; j++) {
            if (pops[popIndex].genomes[i].fit > pops[popIndex].genomes[j].fit) {
                var tempGenome = pops[popIndex].genomes[i];
                pops[popIndex].genomes[i] = pops[popIndex].genomes[j];
                pops[popIndex].genomes[j] = tempGenome;
            }
        }
    }

    //select top genomes
    parents = pops[popIndex].genomes.slice(0, survivors);
    var count = survivors;
    while (count < pops[popIndex].genomes.length) {
        var crossoverPoint = Math.floor(Math.random() * pops[popIndex].genomes[0].triangles.length);
        var motherIndex = Math.floor(Math.random() * survivors);
        var fatherIndex = Math.floor(Math.random() * survivors);
        var mother = parents[motherIndex].triangles;
        var father = parents[fatherIndex].triangles;
        var child1 = mother.slice(0, crossoverPoint).concat(father.slice(crossoverPoint, father.length));
        var child2 = father.slice(0, crossoverPoint).concat(mother.slice(crossoverPoint, mother.length));
        copyGenome(count, child1);
        count++;
        if (count < pops[popIndex].genomes.length) {
            copyGenome(count, child2);
            count++;
        }
    }
}

//deep copy new triangles to genomes[gen]
function copyGenome(gen, tris) {
    for (var i = 0; i < numShapes; i++) {
        pops[popIndex].genomes[gen].triangles[i].x1 = tris[i].x1;
        pops[popIndex].genomes[gen].triangles[i].y1 = tris[i].y1;
        pops[popIndex].genomes[gen].triangles[i].x2 = tris[i].x2;
        pops[popIndex].genomes[gen].triangles[i].y2 = tris[i].y2;
        pops[popIndex].genomes[gen].triangles[i].x3 = tris[i].x3;
        pops[popIndex].genomes[gen].triangles[i].y3 = tris[i].y3;
        pops[popIndex].genomes[gen].triangles[i].x4 = tris[i].x4;
        pops[popIndex].genomes[gen].triangles[i].y4 = tris[i].y4;
        pops[popIndex].genomes[gen].triangles[i].r = tris[i].r;
        pops[popIndex].genomes[gen].triangles[i].g = tris[i].g;
        pops[popIndex].genomes[gen].triangles[i].b = tris[i].b;
        pops[popIndex].genomes[gen].triangles[i].a = tris[i].a;
        //genomeCopy.triangles[i].a = genomeOne.triangles[i].a;
    }
}



//---------------------------------------------------------------------//
//-----------------------------> Mutate <------------------------------//

function mutate() {
    for (var gen = 0; gen < popSize; gen++) {
        for (var i = 0; i < pops[popIndex].genomes[gen].triangles.length; i++) {
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].x1 = Math.floor(Math.random() * canvasWidth);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].x2 = Math.floor(Math.random() * canvasWidth);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].x3 = Math.floor(Math.random() * canvasWidth);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].y1 = Math.floor(Math.random() * canvasHeight);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].y2 = Math.floor(Math.random() * canvasHeight);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].y3 = Math.floor(Math.random() * canvasHeight);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].x4 = Math.floor(Math.random() * canvasWidth);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].y4 = Math.floor(Math.random() * canvasHeight);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].r = Math.floor(Math.random() * 255);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].g = Math.floor(Math.random() * 255);
            }
            if (Math.random() <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].b = Math.floor(Math.random() * 255);
            }
            if (Math.floor(Math.random()) <= mutationRate) {
                pops[popIndex].genomes[gen].triangles[i].a = Math.random();
            }
        }
    }
}



//---------------------------------------------------------------------//
//--------------------------> Constructors <---------------------------//

function Population(popSize, numShapes, context, targetPixelData) {
    this.genomes = [];
    for (var i = 0; i < popSize; i++) {
        this.genomes.push(new Genome(numShapes));
    }
    this.ctx = context;
    this.targetPixelData = targetPixelData;
}

function Genome(numShapes) {
    this.fit = 0;
    this.triangles = [];
    for (var i = 0; i < numShapes; i++) {
        this.triangles.push(new Triangle());
    }
}

function Triangle() {
    this.x = canvasWidth;
    this.y = canvasHeight;
    this.x1 = Math.floor(Math.random() * this.x);
    this.x2 = Math.floor(Math.random() * this.x);
    this.x3 = Math.floor(Math.random() * this.x);
    this.x4 = Math.floor(Math.random() * this.x);
    this.y1 = Math.floor(Math.random() * this.y);
    this.y2 = Math.floor(Math.random() * this.y);
    this.y3 = Math.floor(Math.random() * this.y);
    this.y4 = Math.floor(Math.random() * this.y);
    this.r = Math.floor(Math.random() * 255);
    //this.g = Math.floor( Math.random() * 255 );
    //this.b = Math.floor( Math.random() * 255 );
    //this.a =  Math.random();
}


//---------------------------------------------------------------------//
//-------------------> Initialization Functions <----------------------//

// --> create and append new target canvas
// --> draw letter to canvas
// --> read and return pixel data
function getTargetData(idNum, letter, backColor, letterColor) {
    var element = document.createElement('canvas');
    element.id = "targetCanvas" + idNum;
    document.body.appendChild(element);
    targetCanvas = document.getElementById("targetCanvas" + idNum); // idNum
    targetCtx = targetCanvas.getContext("2d");
    $("#targetCanvas" + idNum).css('background-color', backColor);
    targetCanvas.width = canvasWidth;
    targetCanvas.height = canvasHeight;
    targetCtx.font = "bold " + canvasHeight + "px Arial";
    targetCtx.fillStyle = letterColor;
    targetCtx.textAlign = "center";
    targetCtx.fillText(letter, targetCanvas.width / 2, targetCanvas.height - 10);
    targetPixels = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    targetCanvas.style.display = "none";
    return targetPixels.data;
};

// --> create and append new target canvases
// --> set size
function getWorkingCtx(idNum, numCanvases) {
    if (numCanvases == 1) {
        canvasWidth = Math.floor(window.innerHeight * 0.8);
    } else {
        canvasWidth = Math.floor(window.innerHeight * 0.8 / (numCanvases / 2));
    }
    canvasHeight = canvasWidth;
    var workingCanvas = document.createElement('canvas');
    workingCanvas.id = "workingCanvas" + idNum;
    workingCanvas.style.marginTop = window.innerHeight / 2 - canvasHeight / 2 + "px";
    document.body.appendChild(workingCanvas);
    var workingCtx = workingCanvas.getContext("2d");
    workingCtx.canvas.width = canvasWidth;
    workingCtx.canvas.height = canvasHeight;
    return workingCtx;
}


function reset() {
    targetCanvas = 0;
    targetCtx = 0;
    targetPixels = 0;
    targetData = 0;
    generation = 0;
    popIndex = 0;
    cycle = 0;
    pops = [];
    $("canvas").remove();
}

function submit() {
    write = $("input").val();
    if (on) {
        reset();
    }
    on = true;
    initialize();
}


//---------------------------------------------------------------------//
//----------------------------> Listeners <----------------------------//


$(document).click(function() {
  if (!on){
     $(".intro").css("visibility", "hidden");
     $(".wrapper").css("visibility", "visible");
     $( "#textInput" ).focus();

 }
});

function checkLength(){
  return (1 <= $("input").val().length);
}

$("body").keydown(function(event) {
    if (event.which == 13) {
      if (checkLength()){
        submit();
        $(".inputScreen").fadeOut(300, function() {
            $(".inputScreen").css("display", "none");
        });
    }
  }
});

$("#submit").click(function() {
  if (checkLength()){
    submit();
  }
});


$(".button").click(function() {
   if (on){
    if ($(".inputScreen").css("display") === "none") {
        $(".inputScreen").fadeIn(300, function() {
            $(".inputScreen").css("display", "block");
        });
    } else {
        $(".inputScreen").fadeOut(300, function() {
            $(".inputScreen").css("display", "none");
        });
    }
}
});

$(".mainClose").click(function() {
   if (on){
    if ($(".inputScreen").css("display") === "none") {
        $(".inputScreen").fadeIn(300, function() {
            $(".inputScreen").css("display", "block");
        });
    } else {
        $(".inputScreen").fadeOut(300, function() {
            $(".inputScreen").css("display", "none");
        });
    }
}
});

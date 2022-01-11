//inspired by https://codepen.io/nelsonr/

let canvas = document.querySelector("canvas");
let ctx = canvas.getContext("2d");
let file = document.getElementById("upload");
let audio = document.getElementById("audio");
let src = document.getElementById("src");

canvas.width = document.body.clientWidth -40;
canvas.height = 700;

let centerX = canvas.width / 2;
let centerY = canvas.height / 2;
let radius = document.body.clientWidth <= 425 ? 120 : 160;
let steps = document.body.clientWidth <= 425 ? 60 : 120;
let interval = 360 / steps;
let pointsUp = [];
let pointsDown = [];
let running = false;
let pCircle = 2 * Math.PI * radius;
let angleExtra = 90;

let context = null;
let splitter;
let analyserL;
let analyserR;
let bufferLengthL;
let bufferLengthR;
let audioDataArrayL;
let audioDataArrayR;
let source = null;


// Create points
for (let angle = 0; angle < 360; angle += interval) {
    let distUp = 1.1;
    let distDown = 0.9;

    pointsUp.push({
        angle: angle + angleExtra,
        x: centerX + radius * Math.cos((-angle + angleExtra) * Math.PI / 180) * distUp,
        y: centerY + radius * Math.sin((-angle + angleExtra) * Math.PI / 180) * distUp,
        dist: distUp
    });

    pointsDown.push({
        angle: angle + angleExtra + 5,
        x: centerX + radius * Math.cos((-angle + angleExtra + 5) * Math.PI / 180) * distDown,
        y: centerY + radius * Math.sin((-angle + angleExtra + 5) * Math.PI / 180) * distDown,
        dist: distDown
    });
}

window.onload = function () {
    file.addEventListener('change', (event) => {
        var files = event.target.files;
        src.src = URL.createObjectURL(files[0]);
        audio.load();
        
        context = context || new AudioContext();
        splitter = splitter || context.createChannelSplitter();
        analyserL = context.createAnalyser();
        analyserL.fftSize = 8192;
        analyserR = context.createAnalyser();
        analyserR.fftSize = 8192;
        splitter.connect(analyserL, 0, 0);
        splitter.connect(analyserR, 1, 0);
        bufferLengthL = analyserL.frequencyBinCount;
        audioDataArrayL = new Uint8Array(bufferLengthL);
        bufferLengthR = analyserR.frequencyBinCount;
        audioDataArrayR = new Uint8Array(bufferLengthR);

        source = source || context.createMediaElementSource(audio);
        source.connect(splitter);
        splitter.connect(context.destination);
    });

    audio.addEventListener('playing', (event) => {
        draw();
    });
}


function drawLine(points) {
    let origin = points[0];

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineJoin = 'round';
    ctx.moveTo(origin.x, origin.y);

    for (let i = 0; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.lineTo(origin.x, origin.y);
    ctx.stroke();
}

function connectPoints(pointsA, pointsB) {
    for (let i = 0; i < pointsA.length; i++) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.moveTo(pointsA[i].x, pointsA[i].y);
        ctx.lineTo(pointsB[i].x, pointsB[i].y);
        ctx.stroke();
    }
}

function update(dt) {
    let audioIndex, audioValue;

    // get the current audio data
    analyserL.getByteFrequencyData(audioDataArrayL);
    analyserR.getByteFrequencyData(audioDataArrayR);

    for (let i = 0; i < pointsUp.length; i++) {
        audioIndex = Math.ceil(pointsUp[i].angle * (bufferLengthL / (pCircle * 2))) | 0;
        // get the audio data and make it go from 0 to 1
        audioValue = audioDataArrayL[audioIndex] / 255;

        pointsUp[i].dist = 1.1 + audioValue * 0.8;
        pointsUp[i].x = centerX + radius * Math.cos(-pointsUp[i].angle * Math.PI / 180) * pointsUp[i].dist;
        pointsUp[i].y = centerY + radius * Math.sin(-pointsUp[i].angle * Math.PI / 180) * pointsUp[i].dist;

        audioIndex = Math.ceil(pointsDown[i].angle * (bufferLengthR / (pCircle * 2))) | 0;
        // get the audio data and make it go from 0 to 1
        audioValue = audioDataArrayR[audioIndex] / 255;

        pointsDown[i].dist = 0.9 + audioValue * 0.2;
        pointsDown[i].x = centerX + radius * Math.cos(-pointsDown[i].angle * Math.PI / 180) * pointsDown[i].dist;
        pointsDown[i].y = centerY + radius * Math.sin(-pointsDown[i].angle * Math.PI / 180) * pointsDown[i].dist;
    }
}

function draw(dt) {
    requestAnimationFrame(draw);

    if (!audio.paused) {
        update(dt);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawLine(pointsUp);
    drawLine(pointsDown);
    connectPoints(pointsUp, pointsDown);
    ctx.shadowBlur = 40;
    ctx.shadowColor = "black";
}
"use strict";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

const audioAnalyserNode = audioContext.createAnalyser();

//
// Audio inputs
//

let micStream;
let micStreamNode;
const micOnButton = document.getElementById("micOnButton");
micOnButton.addEventListener("click", async () => {
    try {
        // FIXME: Cannot call multiple times.
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        alert("Failed to get audio stream.");
        throw err;
    }
    micStreamNode = audioContext.createMediaStreamSource(micStream);
    micStreamNode.connect(audioAnalyserNode);
});

const oscillatorOnButton = document.getElementById("oscillatorOnButton");
oscillatorOnButton.addEventListener("click", () => {
    oscillatorOnButton.disabled = true;

    const oscillatorNode = audioContext.createOscillator();
    oscillatorNode.connect(audioContext.destination);
    oscillatorNode.connect(audioAnalyserNode);
    oscillatorNode.start();
    setTimeout(() => {
        oscillatorNode.stop();
        oscillatorNode.disconnect();

        oscillatorOnButton.disabled = false;
    }, 2000); // milliseconds
});

const audioFileInput = document.getElementById("audioFileInput");
const audioArea = document.getElementById("audioArea");
audioFileInput.addEventListener("change", () => {
    // TODO: Validate the audio file.

    // TODO: Revoke.
    const audioFileURL = URL.createObjectURL(audioFileInput.files[0]);

    const audioElement = document.createElement("audio");
    audioElement.controls = true;
    audioElement.src = audioFileURL;

    // TODO: Disconnect.
    const inputAudioNode = audioContext.createMediaElementSource(audioElement);
    inputAudioNode.connect(audioAnalyserNode);
    inputAudioNode.connect(audioContext.destination);

    while (audioArea.firstChild) {
        audioArea.removeChild(audioArea.firstChild);
    }
    audioArea.appendChild(audioElement);
});

//
// Analyzer settings
//

const minDecibelsInput = document.getElementById("minDecibelsInput");
const maxDecibelsInput = document.getElementById("maxDecibelsInput");
const smoothingTimeConstantInput = document.getElementById("smoothingTimeConstantInput");

function reflectSettings(audioAnalyserNode) {
    // TODO: Validate.
    audioAnalyserNode.minDecibels = Number(minDecibelsInput.value);
    audioAnalyserNode.maxDecibels = Number(maxDecibelsInput.value);
    audioAnalyserNode.smoothingTimeConstant = Number(smoothingTimeConstantInput.value);
}

const setRecommendedValueButton = document.getElementById("setRecommendedValueButton");
setRecommendedValueButton.addEventListener("click", () => {
    minDecibelsInput.value = -40;
    maxDecibelsInput.value = 0;
    smoothingTimeConstantInput.value = 0;
});

//
// Monitor
//

class ArrayChartEditor {
    constructor(canvas, valueUpperLimit) {
        this.canvas = canvas;
        // TODO: Check for canvas support (= whether getContext is not null).
        this.canvasContext = canvas.getContext("2d");
        // Use Cartesian coordinate system for ease of description.
        const ctx = this.canvasContext;
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);

        this.valueUpperLimit = valueUpperLimit;
    }

    draw(arr) {
        const canvas = this.canvas;
        const ctx = this.canvasContext;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const y = 0;
        const width = canvas.width / arr.length;
        arr.forEach((value, index) => {
            const x = width * index;
            const height = Math.min(value / this.valueUpperLimit, 1) * canvas.height;
            ctx.fillRect(x, y, width, height);
        });
    }
}

class TimeSeriesChartEditor {
    constructor(canvas, valueUpperLimit) {
        this.canvas = canvas;
        // TODO: Check for canvas support (= whether getContext is not null).
        this.canvasContext = canvas.getContext("2d");
        // Use Cartesian coordinate system for ease of description.
        const ctx = this.canvasContext;
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);

        this.valueUpperLimit = valueUpperLimit;
        this.isActive = false;
        this.timeUpperLimit = null;
    }

    clear() {
        const ctx = this.canvasContext;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.isActive = false;
    }

    begin(timeUpperLimit) {
        if (this.isActive) {
            throw new Error("The chart should not be active before beginning.");
        }

        this.timeUpperLimit = timeUpperLimit;
        this.isActive = true;
    }

    drawPoint(time, value) {
        if (!this.isActive) {
            throw new Error("The chart should be active.");
        }
        if (time > this.timeUpperLimit) {
            throw new Error("The time is over the limit.");
        }

        const x = time / this.timeUpperLimit * this.canvas.width;
        const y = Math.min(value / this.valueUpperLimit, 1) * this.canvas.height;
        const ctx = this.canvasContext;
        ctx.beginPath();
        ctx.arc(x, y,
            4,              // radius
            0, 2 * Math.PI, // angle of start and end
            true            // clockwise
        );
        ctx.fill();
        ctx.closePath();
    }
}

const frequencyDataChart = document.getElementById("frequencyDataChart");
const frequencyDataChartEditor = new ArrayChartEditor(frequencyDataChart, 255);

const frequencyChart = document.getElementById("frequencyChart");
// TODO: Decide the upper limit.
const frequencyChartEditor = new TimeSeriesChartEditor(frequencyChart, 2400);

const strengthChart = document.getElementById("strengthChart");
const strengthChartEditor = new TimeSeriesChartEditor(strengthChart, 255);

const measuredFrequencyText = document.getElementById("measuredFrequencyText");
const measuredStrengthText = document.getElementById("measuredStrengthText");

const measureButton = document.getElementById("measureButton");
measureButton.addEventListener("click", async () => {
    measureButton.disabled = true;

    try {
        reflectSettings(audioAnalyserNode);
    } catch (err) {
        window.alert(err);
        // TODO
    }

    const measureTime = 10 * 1000;  // milliseconds
    frequencyChartEditor.clear();
    frequencyChartEditor.begin(measureTime);
    strengthChartEditor.clear();
    strengthChartEditor.begin(measureTime);
    let lastDrawTimeOfFrequencyDataChart = 0;
    await repeatFor(measureTime, elapsedTime => {
        const {
            frequencyData,
            frequency,
            strength,
        } = analyzeCurrentSound(audioAnalyserNode);

        frequencyChartEditor.drawPoint(elapsedTime, frequency);
        measuredFrequencyText.textContent = frequency.toString();
        strengthChartEditor.drawPoint(elapsedTime, strength);
        measuredStrengthText.textContent = strength.toString();
        // Reduce refresh rate to watch the chart carefully.
        if (elapsedTime - lastDrawTimeOfFrequencyDataChart >= 400) {
            frequencyDataChartEditor.draw(frequencyData);
            lastDrawTimeOfFrequencyDataChart = elapsedTime;
        }
    });

    measureButton.disabled = false;
});

//
// Util
//

function analyzeCurrentSound(audioAnalyserNode) {
    const sampleRate = audioAnalyserNode.context.sampleRate;
    const frequencyLowerBound = 0;
    const frequencyUpperBound = sampleRate / 2;
    const frequencyRange = frequencyUpperBound - frequencyLowerBound;
    const frequencyBinCount = audioAnalyserNode.frequencyBinCount;

    const frequencyData = new Uint8Array(frequencyBinCount);
    audioAnalyserNode.getByteFrequencyData(frequencyData);

    const frequencyPeekIndex = getIndexOfMax(frequencyData);
    const frequency = frequencyLowerBound +
        frequencyRange / frequencyBinCount * (frequencyPeekIndex + 0.5);
    const strength = frequencyData[frequencyPeekIndex];
    return {
        frequencyData,
        frequency,
        strength,
    };
}

function getIndexOfMax(arr) {
    if (arr.length == 0) {
        throw new TypeError("Empty array.");
    }

    let [maxI, maxV] = [0, arr[0]];
    arr.forEach((v, i) => {
        if (v > maxV) {
            [maxI, maxV] = [i, v];
        }
    });

    return maxI;
}

function repeatFor(
    duration,   // milliseconds
    callback,   // (elapsedTime) => ()
) {
    return new Promise(resolve => {

        let startTime;
        const step = timeStamp => {
            const elapsedTime = timeStamp - startTime;  // milliseconds
            if (elapsedTime > duration) {
                return resolve();
            }

            callback(elapsedTime);

            window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(timeStamp => {
            startTime = timeStamp;
            step(timeStamp);
        });

    });
}

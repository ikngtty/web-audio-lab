"use strict";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

const audioAnalyserNode = audioContext.createAnalyser();

// TODO: make charts' fields readonly.

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
    this.lastDrawnDate = null;
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

    this.lastDrawnDate = new Date();
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
    this.timeUpperLimit = null;
    this.isMeasuring = false;
    this.snapshotOnMeasureEnded = null;
  }

  clear() {
    const ctx = this.canvasContext;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.timeUpperLimit = null;
    this.isMeasuring = false;
    this.snapshotOnMeasureEnded = null;
  }

  begin(timeUpperLimit) {
    if (this.isMeasuring) {
      throw new Error("The chart has begun already.");
    }

    this.timeUpperLimit = timeUpperLimit;
    this.isMeasuring = true;
  }

  end() {
    if (!this.isMeasuring) {
      throw new Error("The chart has not begun.");
    }

    const ctx = this.canvasContext;
    this.snapshotOnMeasureEnded = ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.isMeasuring = false;
  }

  drawPoint(time, value) {
    if (!this.isMeasuring) {
      throw new Error("The chart should have begun.");
    }
    if (time > this.timeUpperLimit) {
      throw new Error("The time is over the limit.");
    }

    const x = (time / this.timeUpperLimit) * this.canvas.width;
    const y = Math.min(value / this.valueUpperLimit, 1) * this.canvas.height;
    const ctx = this.canvasContext;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      4, // radius
      0,
      2 * Math.PI, // angle of start and end
      true // clockwise
    );
    ctx.fill();
    ctx.closePath();
  }

  selectPoint(time, value) {
    if (!this.timeUpperLimit) {
      throw new Error("The chart is empty.");
    }
    if (this.isMeasuring) {
      throw new Error("The chart should have ended."); // Because the saved snapshot is necessary.
    }
    // TODO: Validate time and value.

    // Reset the previous selection.
    const ctx = this.canvasContext;
    ctx.putImageData(this.snapshotOnMeasureEnded, 0, 0);

    // Draw the selected point.
    const x = (time / this.timeUpperLimit) * this.canvas.width;
    const y = Math.min(value / this.valueUpperLimit, 1) * this.canvas.height;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      4, // radius
      0,
      2 * Math.PI, // angle of start and end
      true // clockwise
    );
    ctx.save();
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.restore();
    ctx.closePath();
  }
}

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
    window.alert("Failed to get audio stream.");
    throw err;
  }
  micStreamNode = audioContext.createMediaStreamSource(micStream);
  micStreamNode.connect(audioAnalyserNode);
  micOnButton.disabled = true;
  // TODO: mic off button
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

let audioElement;
const audioArea = document.getElementById("audioArea");
const audioFileInput = document.getElementById("audioFileInput");
audioFileInput.addEventListener("change", () => {
  // TODO: Validate the audio file.

  // TODO: Revoke.
  const audioFileURL = URL.createObjectURL(audioFileInput.files[0]);

  if (audioElement) {
    audioArea.removeChild(audioElement);
  }

  audioElement = document.createElement("audio");
  audioElement.controls = true;
  audioElement.src = audioFileURL;
  audioArea.appendChild(audioElement);

  // TODO: Disconnect.
  const inputAudioNode = audioContext.createMediaElementSource(audioElement);
  inputAudioNode.connect(audioAnalyserNode);
  inputAudioNode.connect(audioContext.destination);
});

//
// Analyzer settings
//

const minDecibelsInput = document.getElementById("minDecibelsInput");
const maxDecibelsInput = document.getElementById("maxDecibelsInput");
const smoothingTimeConstantInput = document.getElementById(
  "smoothingTimeConstantInput"
);

function reflectSettings(audioAnalyserNode) {
  // TODO: Validate.
  audioAnalyserNode.minDecibels = Number(minDecibelsInput.value);
  audioAnalyserNode.maxDecibels = Number(maxDecibelsInput.value);
  audioAnalyserNode.smoothingTimeConstant = Number(
    smoothingTimeConstantInput.value
  );
}

const setRecommendedValueButton = document.getElementById(
  "setRecommendedValueButton"
);
setRecommendedValueButton.addEventListener("click", () => {
  minDecibelsInput.value = -40;
  maxDecibelsInput.value = 0;
  smoothingTimeConstantInput.value = 0;
});

//
// Monitor
//

const frequencyChart = document.getElementById("frequencyChart");
const measuredFrequencyText = document.getElementById("measuredFrequencyText");
const strengthChart = document.getElementById("strengthChart");
const measuredStrengthText = document.getElementById("measuredStrengthText");

// TODO: Decide the upper limit.
const frequencyChartEditor = new TimeSeriesChartEditor(frequencyChart, 2400);
const strengthChartEditor = new TimeSeriesChartEditor(strengthChart, 255);

class StateTimeSeries extends EventTarget {
  constructor() {
    super();
    this._dataPoints = [];
    this._estimatedDuration = null;
  }

  begin(estimatedDuration) {
    this._estimatedDuration = estimatedDuration;
    this.dispatchEvent(
      new CustomEvent("began", {
        detail: { estimatedDuration },
      })
    );
  }

  addDataPoint(elapsedTime, data) {
    const dataPoint = { elapsedTime, data };
    this._dataPoints.push(dataPoint);
    this.dispatchEvent(
      new CustomEvent("dataPointAdded", {
        detail: { dataPoint },
      })
    );
  }

  end(elapsedTime) {
    this.dispatchEvent(
      new CustomEvent("ended", {
        detail: { elapsedTime },
      })
    );
  }

  get dataPoints() {
    return this._dataPoints;
  }

  get estimatedDuration() {
    return this._estimatedDuration;
  }

  clear() {
    this._dataPoints = [];
    this._estimatedDuration = null;
    this.dispatchEvent(new CustomEvent("cleared"));
  }
}
const stateMeasurements = new StateTimeSeries();
stateMeasurements.addEventListener("began", (event) => {
  const { estimatedDuration } = event.detail;
  frequencyChartEditor.begin(estimatedDuration);
  strengthChartEditor.begin(estimatedDuration);
});
stateMeasurements.addEventListener("dataPointAdded", (event) => {
  const { dataPoint } = event.detail;
  const { elapsedTime, data } = dataPoint;
  const { frequency, strength } = data;

  frequencyChartEditor.drawPoint(elapsedTime, frequency);
  measuredFrequencyText.textContent = frequency.toString();
  strengthChartEditor.drawPoint(elapsedTime, strength);
  measuredStrengthText.textContent = strength.toString();
});
stateMeasurements.addEventListener("ended", (event) => {
  // const { elapsedTime } = event.detail;
  frequencyChartEditor.end();
  strengthChartEditor.end();
});
stateMeasurements.addEventListener("cleared", () => {
  frequencyChartEditor.clear();
  measuredFrequencyText.textContent = "";
  strengthChartEditor.clear();
  measuredStrengthText.textContent = "";
});

const measureButton = document.getElementById("measureButton");
const measureAndPlayFileButton = document.getElementById(
  "measureAndPlayFileButton"
);
measureButton.addEventListener("click", async () => {
  measureButton.disabled = true;
  // HACK: It is disgusting that measureButton knows measureAndPlayFileButton.
  measureAndPlayFileButton.disabled = true;

  try {
    reflectSettings(audioAnalyserNode);
  } catch (err) {
    window.alert(err);
    // TODO
  }

  stateMeasurements.clear();

  const measureTime = 10 * 1000; // milliseconds
  stateMeasurements.begin(measureTime);

  await repeatFor(measureTime, (elapsedTime) => {
    const analysisResult = analyzeCurrentSound(audioAnalyserNode);
    stateMeasurements.addDataPoint(elapsedTime, analysisResult);
  });

  stateMeasurements.end(measureTime); // TODO: Use the actual end time.

  measureButton.disabled = false;
  // HACK: It is disgusting that measureButton knows measureAndPlayFileButton.
  measureAndPlayFileButton.disabled = false;
});
measureAndPlayFileButton.addEventListener("click", async () => {
  if (!audioElement) {
    window.alert("No audio file.");
    return;
  }

  measureButton.click();
  audioElement.play();
});

//
// Inspector
//

const frequencyDataOfSelectedSoundChart = document.getElementById(
  "frequencyDataOfSelectedSoundChart"
);
const frequencyDataOfSelectedSoundChartEditor = new ArrayChartEditor(
  frequencyDataOfSelectedSoundChart,
  255
);

class StateSelection extends EventTarget {
  constructor() {
    super();
    this._value = null;
  }

  set value(value) {
    this._value = value;
    this.dispatchEvent(new CustomEvent("valueChanged", { detail: { value } }));
  }

  get value() {
    return this._value;
  }
}
const stateSoundIndexSelection = new StateSelection();
stateSoundIndexSelection.addEventListener("valueChanged", (event) => {
  const { value: soundIndex } = event.detail;
  const dataPoint = stateMeasurements.dataPoints[soundIndex];
  const { elapsedTime, data } = dataPoint;
  const { frequencyData, frequency, strength } = data;

  frequencyDataOfSelectedSoundChartEditor.draw(frequencyData);
  frequencyChartEditor.selectPoint(elapsedTime, frequency);
  measuredFrequencyText.textContent = frequency.toString();
  strengthChartEditor.selectPoint(elapsedTime, strength);
  measuredStrengthText.textContent = strength.toString();
});

const selectedSoundIndexInput = document.getElementById(
  "selectedSoundIndexInput"
);
const selectSoundButton = document.getElementById("selectSoundButton");
selectSoundButton.addEventListener("click", () => {
  // TODO: Disable before measuring.
  // TODO: Validate.
  const soundIndex = Number(selectedSoundIndexInput.value);
  stateSoundIndexSelection.value = soundIndex;
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
  const frequency =
    frequencyLowerBound +
    (frequencyRange / frequencyBinCount) * (frequencyPeekIndex + 0.5);
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
  duration, // milliseconds
  callback // (elapsedTime) => ()
) {
  return new Promise((resolve) => {
    let startTime;
    const step = (timeStamp) => {
      const elapsedTime = timeStamp - startTime; // milliseconds
      if (elapsedTime > duration) {
        return resolve();
      }

      callback(elapsedTime);

      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame((timeStamp) => {
      startTime = timeStamp;
      step(timeStamp);
    });
  });
}

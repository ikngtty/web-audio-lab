import { ArrayChartEditor } from "./lib/components/ArrayChartEditor.js";
import { TimeSeriesChartEditor } from "./lib/components/TimeSeriesChartEditor.js";
import { StateSelection } from "./lib/states/StateSelection.js";
import { StateTimeSeries } from "./lib/states/StateTimeSeries.js";
import { analyzeCurrentSound, repeatFor } from "./lib/util.js";

//
// DOMs
//

// Audio inputs

const micOnButton = document.getElementById("micOnButton");
const oscillatorOnButton = document.getElementById("oscillatorOnButton");
const audioFileInput = document.getElementById("audioFileInput");
const audioArea = document.getElementById("audioArea");
let audioElement; // dynamically created

// Analyzer Settings

const minDecibelsInput = document.getElementById("minDecibelsInput");
const maxDecibelsInput = document.getElementById("maxDecibelsInput");
const smoothingTimeConstantInput = document.getElementById(
  "smoothingTimeConstantInput"
);
const setRecommendedValueButton = document.getElementById(
  "setRecommendedValueButton"
);

// Monitor

const measureButton = document.getElementById("measureButton");
const measureAndPlayFileButton = document.getElementById(
  "measureAndPlayFileButton"
);
const measuredPitchText = document.getElementById("measuredPitchText");
const pitchChart = document.getElementById("pitchChart");
const measuredStrengthText = document.getElementById("measuredStrengthText");
const strengthChart = document.getElementById("strengthChart");

// Inspector

const selectedSoundIndexInput = document.getElementById(
  "selectedSoundIndexInput"
);
const selectSoundButton = document.getElementById("selectSoundButton");
const frequencyDataOfSelectedSoundChart = document.getElementById(
  "frequencyDataOfSelectedSoundChart"
);

//
// Global vars
//

const audioContext = new AudioContext();
const audioAnalyserNode = audioContext.createAnalyser();
let micStream;
let micStreamNode;

// Components

const pitchChartEditor = new TimeSeriesChartEditor(pitchChart, 1200);
const strengthChartEditor = new TimeSeriesChartEditor(strengthChart, 255);

const frequencyDataOfSelectedSoundChartEditor = new ArrayChartEditor(
  frequencyDataOfSelectedSoundChart,
  255
);

// States

const stateMeasurements = new StateTimeSeries();
const stateSoundIndexSelection = new StateSelection();

//
// Event handlers
//

// States

stateMeasurements.addEventListener("began", (event) => {
  const { estimatedDuration } = event.detail;
  pitchChartEditor.begin(estimatedDuration);
  strengthChartEditor.begin(estimatedDuration);
});
stateMeasurements.addEventListener("dataPointAdded", (event) => {
  const { dataPoint } = event.detail;
  const { elapsedTime, data } = dataPoint;
  const { pitch, strength } = data;

  pitchChartEditor.drawPoint(elapsedTime, pitch);
  measuredPitchText.textContent = pitch.toString();
  strengthChartEditor.drawPoint(elapsedTime, strength);
  measuredStrengthText.textContent = strength.toString();
});
stateMeasurements.addEventListener("ended", (event) => {
  // const { elapsedTime } = event.detail;
  pitchChartEditor.end();
  strengthChartEditor.end();
});
stateMeasurements.addEventListener("cleared", () => {
  pitchChartEditor.clear();
  measuredPitchText.textContent = "";
  strengthChartEditor.clear();
  measuredStrengthText.textContent = "";
});

stateSoundIndexSelection.addEventListener("valueChanged", (event) => {
  const { value: soundIndex } = event.detail;
  const dataPoint = stateMeasurements.dataPoints[soundIndex];
  const { elapsedTime, data } = dataPoint;
  const { frequencyData, pitch, strength } = data;

  frequencyDataOfSelectedSoundChartEditor.draw(frequencyData);
  pitchChartEditor.selectPoint(elapsedTime, pitch);
  measuredPitchText.textContent = pitch.toString();
  strengthChartEditor.selectPoint(elapsedTime, strength);
  measuredStrengthText.textContent = strength.toString();
});

// Audio inputs

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

// Analyzer settings

setRecommendedValueButton.addEventListener("click", () => {
  minDecibelsInput.value = -40;
  maxDecibelsInput.value = 0;
  smoothingTimeConstantInput.value = 0;
});

// Monitor

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

// Inspector

selectSoundButton.addEventListener("click", () => {
  // TODO: Disable before measuring.
  // TODO: Validate.
  const soundIndex = Number(selectedSoundIndexInput.value);
  stateSoundIndexSelection.value = soundIndex;
});

//
// Functions
//

function reflectSettings(audioAnalyserNode) {
  // TODO: Validate.
  audioAnalyserNode.minDecibels = Number(minDecibelsInput.value);
  audioAnalyserNode.maxDecibels = Number(maxDecibelsInput.value);
  audioAnalyserNode.smoothingTimeConstant = Number(
    smoothingTimeConstantInput.value
  );
}

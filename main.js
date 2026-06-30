import { ArrayChartEditor } from "./lib/components/ArrayChartEditor.js";
import { Foldable } from "./lib/components/Foldable.js";
import { TimeSeriesChartEditor } from "./lib/components/TimeSeriesChartEditor.js";
import { StateSelection } from "./lib/states/StateSelection.js";
import { StateTimeSeries } from "./lib/states/StateTimeSeries.js";
import {
  analyzeSoundUsingAutocorrelation,
  analyzeSoundUsingFft,
  repeatFor,
} from "./lib/util.js";

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

const fftPitchMonitorFoldButton = document.getElementById(
  "fftPitchMonitorFoldButton"
);
const measuredFftPitchText = document.getElementById("measuredFftPitchText");
const fftPitchMonitor = document.getElementById("fftPitchMonitor");
const fftPitchChart = document.getElementById("fftPitchChart");
const fftStrengthMonitorFoldButton = document.getElementById(
  "fftStrengthMonitorFoldButton"
);
const measuredFftStrengthText = document.getElementById(
  "measuredFftStrengthText"
);
const fftStrengthMonitor = document.getElementById("fftStrengthMonitor");
const fftStrengthChart = document.getElementById("fftStrengthChart");

const acPitchMonitorFoldButton = document.getElementById(
  "acPitchMonitorFoldButton"
);
const measuredAcPitchText = document.getElementById("measuredAcPitchText");
const acPitchMonitor = document.getElementById("acPitchMonitor");
const acPitchChart = document.getElementById("acPitchChart");
const acStrengthMonitorFoldButton = document.getElementById(
  "acStrengthMonitorFoldButton"
);
const measuredAcStrengthText = document.getElementById(
  "measuredAcStrengthText"
);
const acStrengthMonitor = document.getElementById("acStrengthMonitor");
const acStrengthChart = document.getElementById("acStrengthChart");

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

const fftPitchMonitorFoldable = new Foldable(
  fftPitchMonitor,
  fftPitchMonitorFoldButton
);
const fftPitchChartEditor = new TimeSeriesChartEditor(fftPitchChart, 1200);
const fftStrengthMonitorFoldable = new Foldable(
  fftStrengthMonitor,
  fftStrengthMonitorFoldButton
);
const fftStrengthChartEditor = new TimeSeriesChartEditor(fftStrengthChart, 255);

const acPitchMonitorFoldable = new Foldable(
  acPitchMonitor,
  acPitchMonitorFoldButton
);
const acPitchChartEditor = new TimeSeriesChartEditor(acPitchChart, 1200);
const acStrengthMonitorFoldable = new Foldable(
  acStrengthMonitor,
  acStrengthMonitorFoldButton
);
const acStrengthChartEditor = new TimeSeriesChartEditor(acStrengthChart, 255);

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

  fftPitchChartEditor.begin(estimatedDuration);
  fftStrengthChartEditor.begin(estimatedDuration);

  acPitchChartEditor.begin(estimatedDuration);
  acStrengthChartEditor.begin(estimatedDuration);
});
stateMeasurements.addEventListener("dataPointAdded", (event) => {
  const { dataPoint } = event.detail;
  const { elapsedTime, data } = dataPoint;
  const { fft, ac } = data;

  fftPitchChartEditor.drawPoint(elapsedTime, fft.pitch);
  measuredFftPitchText.textContent = fft.pitch.toString();
  fftStrengthChartEditor.drawPoint(elapsedTime, fft.strength);
  measuredFftStrengthText.textContent = fft.strength.toString();

  acPitchChartEditor.drawPoint(elapsedTime, ac.pitch);
  measuredAcPitchText.textContent = ac.pitch.toString();
  acStrengthChartEditor.drawPoint(elapsedTime, ac.strength);
  measuredAcStrengthText.textContent = ac.strength.toString();
});
stateMeasurements.addEventListener("ended", (event) => {
  // const { elapsedTime } = event.detail;

  fftPitchChartEditor.end();
  fftStrengthChartEditor.end();

  acPitchChartEditor.end();
  acStrengthChartEditor.end();
});
stateMeasurements.addEventListener("cleared", () => {
  fftPitchChartEditor.clear();
  measuredFftPitchText.textContent = "";
  fftStrengthChartEditor.clear();
  measuredFftStrengthText.textContent = "";

  acPitchChartEditor.clear();
  measuredAcPitchText.textContent = "";
  acStrengthChartEditor.clear();
  measuredAcStrengthText.textContent = "";
});

stateSoundIndexSelection.addEventListener("valueChanged", (event) => {
  const { value: soundIndex } = event.detail;
  const dataPoint = stateMeasurements.dataPoints[soundIndex];
  const { elapsedTime, data } = dataPoint;
  const { fft, ac } = data;

  frequencyDataOfSelectedSoundChartEditor.draw(fft.frequencyData);

  fftPitchChartEditor.selectPoint(elapsedTime, fft.pitch);
  measuredFftPitchText.textContent = fft.pitch.toString();
  fftStrengthChartEditor.selectPoint(elapsedTime, fft.strength);
  measuredFftStrengthText.textContent = fft.strength.toString();

  acPitchChartEditor.selectPoint(elapsedTime, ac.pitch);
  measuredAcPitchText.textContent = ac.pitch.toString();
  acStrengthChartEditor.selectPoint(elapsedTime, ac.strength);
  measuredAcStrengthText.textContent = ac.strength.toString();
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
    const fftAnalysis = analyzeSoundUsingFft(audioAnalyserNode);
    const acAnalysis = analyzeSoundUsingAutocorrelation(audioAnalyserNode);
    stateMeasurements.addDataPoint(elapsedTime, {
      fft: fftAnalysis,
      ac: acAnalysis,
    });
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

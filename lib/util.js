// Use FFT to check the strength of each frequency, then treat the lowest
// frequency that is strong enough as the fundamental, used as the pitch.
export function analyzeSoundUsingFft(audioAnalyserNode) {
  const sampleRate = audioAnalyserNode.context.sampleRate;
  const frequencyLowerBound = 0;
  const frequencyUpperBound = sampleRate / 2;
  const frequencyRange = frequencyUpperBound - frequencyLowerBound;
  const frequencyBinCount = audioAnalyserNode.frequencyBinCount;

  const frequencyData = new Uint8Array(frequencyBinCount);
  audioAnalyserNode.getByteFrequencyData(frequencyData);

  const maxStrength = getMax(frequencyData).value;
  const peekStrengthThreshold = maxStrength * 0.4; // This parameter is from my experiments.
  const firstPeekIndex = frequencyData.findIndex(
    (v) => v >= peekStrengthThreshold,
  );
  const pitch =
    frequencyLowerBound +
    (frequencyRange / frequencyBinCount) * (firstPeekIndex + 0.5);

  return {
    frequencyData,
    pitch,
    strength: maxStrength,
  };
}

export function analyzeSoundUsingAutocorrelation(audioAnalyserNode) {
  const sampleRate = audioAnalyserNode.context.sampleRate;

  const timeDomainDataCount = audioAnalyserNode.fftSize;
  const timeDomainData = new Uint8Array(timeDomainDataCount);
  audioAnalyserNode.getByteTimeDomainData(timeDomainData);

  const maxShift = timeDomainDataCount / 2;
  let bestOffset = -1;
  let bestCorr = -Infinity;
  for (let offset = 1; offset < timeDomainDataCount; offset++) {
    let corr = 0;
    for (let i = 0; i < maxShift; i++) {
      corr += timeDomainData[i] * timeDomainData[i + offset];
    }

    if (corr > bestCorr) {
      bestCorr = corr;
      bestOffset = offset;
    }
  }

  const pitch = sampleRate / bestOffset;

  return {
    pitch,
    strength: 0, // TODO
  };
}

function getMax(arr) {
  if (arr.length == 0) {
    throw new TypeError("Empty array.");
  }

  let max = { index: 0, value: arr[0] };
  arr.forEach((v, i) => {
    if (v > max.value) {
      max = { index: i, value: v };
    }
  });

  return max;
}

export function repeatFor(
  duration, // milliseconds
  callback, // (elapsedTime) => ()
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

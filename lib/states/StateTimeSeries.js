export class StateTimeSeries extends EventTarget {
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

// TODO: make charts' fields readonly.

export class TimeSeriesChartEditor {
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

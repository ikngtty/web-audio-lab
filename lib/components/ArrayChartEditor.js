// TODO: make charts' fields readonly.

export class ArrayChartEditor {
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

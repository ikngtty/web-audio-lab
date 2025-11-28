export class Foldable {
  constructor(div, toggleSpan) {
    this._div = div;
    this._divDisplay = div.style.display;
    this._toggleSpan = toggleSpan;

    this.unfold();

    this._toggleSpan.addEventListener("click", () => this.toggle());
  }

  fold() {
    this._isFolded = true;
    this._div.style.display = "none";
    this._toggleSpan.innerText = "▶︎";
  }

  unfold() {
    this._isFolded = false;
    this._div.style.display = this._divDisplay;
    this._toggleSpan.innerText = "▼";
  }

  toggle() {
    if (this._isFolded) {
      this.unfold();
    } else {
      this.fold();
    }
  }
}

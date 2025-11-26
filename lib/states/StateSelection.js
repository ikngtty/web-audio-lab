export class StateSelection extends EventTarget {
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

/**
 * This is a simple Spring implementation of a damped spring using a symbolic
 * integration of Hooke's law: F = -kx - cv.
 *
 * This is based on the implementation of iamralpht. Have a look at it here:
 * https://github.com/iamralpht/iamralpht.github.io/tree/master/physics
 *
 * The implementation is quite simple, but thus quite performant.
 *
 * This physics textbook explains the model:
 * http://www.stewartcalculus.com/data/CALCULUS%20Concepts%20and%20Contexts/up iles/3c3-AppsOf2ndOrders_Stu.pdf
 */

const EPSILON = 0.001;

const almostEqual = (a, b) => a > b - EPSILON && a < b + EPSILON;
const almostZero = a => almostEqual(a, 0);

/**
 * @param {Number} springConstant
 * @param {Number} damping
 * @param {Number} [mass = 1]
 */

export default class Spring {
  constructor(springConstant, damping, mass = 1) {
    this._m = mass;
    this._k = springConstant;
    this._c = damping;
    this._solution = null;
    this._endValue = 0;
    this._startTime = 0;
  }

  /**
   * Returns an object with solvers for `x` and `dx`.
   * @param {Number} initial Value for x.
   * @param {Number} velocity
   * @return {Object} E.g. `{x: () => {}, dx: () => {}}`
   */
  _solve(initial, velocity) {
    const c = this._c;
    const m = this._m;
    const k = this._k;

    // Get the type of the damping.
    // Solve the quadratic equation; root = (-c +/- sqrt(c^2 - 4mk)) / 2m.
    const cmk = c * c - 4 * m * k;

    if (cmk === 0) {
      // The spring is critically damped.
      // x = (c1 + c2 * t) * e ^ (-c / 2 * m) * t
      const r = -c / (2 * m);
      const c1 = initial;
      const c2 = velocity / (r * initial);
      return {
        x: t => (c1 + c2 * t) * Math.pow(Math.E, r * t),
        dx: t => {
          const pow = Math.pow(Math.E, r * t);
          return r * (c1 + c2 * t) * pow + c2 * pow;
        }
      };
    } else if (cmk > 0) {
      // The spring is overdamped; no bounces.
      // x = c1 * e ^ (r1 * t) + c2 * e ^ (r2 * t)
      // Need to find r1 and r2, the roots, then solve c1 and c2.
      const r1 = (-c - Math.sqrt(cmk)) / (2 * m);
      const r2 = (-c + Math.sqrt(cmk)) / (2 * m);
      const c2 = (velocity - r1 * initial) / (r2 - r1);
      const c1 = initial - c2;

      return {
        x: t => c1 * Math.pow(Math.E, r1 * t) + c2 * Math.pow(Math.E, r2 * t),
        dx: t =>
          c1 * r1 * Math.pow(Math.E, r1 * t) +
          c2 * r2 * Math.pow(Math.E, r2 * t)
      };
    } else {
      // The spring is underdamped, it has imaginary roots.
      // r = -(c / 2 * m) +- w * i
      // w = sqrt(4 * m * k - c ^ 2) / 2 * m
      // x = (e ^ -(c / 2 * m) * t) * (c1 * cos(wt) + c2 * sin(wt))
      const w = Math.sqrt(4 * m * k - c * c) / (2 * m);
      const r = -((c / 2) * m);
      const c1 = initial;
      const c2 = (velocity - r * initial) / w;

      return {
        x: t =>
          Math.pow(Math.E, r * t) *
          (c1 * Math.cos(w * t) + c2 * Math.sin(w * t)),
        dx: t => {
          const power = Math.pow(Math.E, r * t);
          const cos = Math.cos(w * t);
          const sin = Math.sin(w * t);
          return (
            power * (c2 * w * cos - c1 * w * sin) +
            r * power * (c2 * sin + c1 * cos)
          );
        }
      };
    }
  }

  /**
   * The current value of the spring.
   * @param {Number} [dt] The time that has passed since `_startTime`.
   * @return {Number}
   */
  x(dt) {
    if (dt === undefined) {
      dt = (new Date().getTime() - this._startTime) / 1000.0;
    }

    return this._solution ? this._endValue + this._solution.x(dt) : 0;
  }

  endValue = () => this._endValue;

  velocity() {
    return this.dx((Date.now() - this._startTime) / 1000.0);
  }

  dx(dt) {
    if (dt === undefined) {
      dt = (new Date().getTime() - this._startTime) / 1000.0;
    }
    return this._solution ? this._solution.dx(dt) : 0;
  }

  /**
   * Setting a new end value that can be solved (animated) towards.
   * @param {Number} endValue
   * @param {Number} [velocity = 0]
   * @param {Number} [t = the current time]
   */
  setEnd(endValue, velocity = 0, t) {
    let position = this._endValue;

    if (!t) t = new Date().getTime();
    if (endValue === this._endValue && almostZero(velocity)) return;

    if (this._solution) {
      if (almostZero(velocity)) {
        velocity = this._solution.dx((t - this._startTime) / 1000.0);
      }
      position = this._solution.x((t - this._startTime) / 1000.0);
      if (almostZero(velocity)) velocity = 0;
      if (almostZero(position)) position = 0;
      position += this._endValue;
    }

    if (
      this._solution &&
      almostZero(position - endValue) &&
      almostZero(velocity)
    ) {
      return;
    }

    this._endValue = endValue;
    this._solution = this._solve(position - this._endValue, velocity);
    this._startTime = t;
  }

  /**
   * Set a new end value directly without solving the intermediate steps.
   * @param {Number} endValue
   */
  snap(endValue) {
    this._startTime = new Date().getTime();
    this._endValue = endValue;
    this._solution = {
      x: () => 0,
      dx: () => 0
    };
  }

  /**
   * Returns if the solving towards the end value is complete.
   * @param {Number} [t = the current time]
   * @return {bool}
   */
  done(t) {
    if (!t) t = new Date().getTime();
    return almostEqual(this.x(), this._endValue) && almostZero(this.dx());
  }

  reconfigure(mass, springConstant, damping) {
    this._m = mass;
    this._k = springConstant;
    this._c = damping;

    if (this.done()) return;
    this._solution = this._solve(this.x() - this._endValue, this.dx());
    this._startTime = new Date().getTime();
  }

  springConstant() {
    return this._k;
  }

  damping() {
    return this._c;
  }
}

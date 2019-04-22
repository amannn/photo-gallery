/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {Spring, runAnimation} from '../utils/physics';
import breakpoint from '../utils/breakpoint';
import TouchUtils from '../utils/TouchUtils';
import styles from './PhotosContainer.module.scss';

/**
 * Takes care of all touch interactions and invokes `onChange` if there's
 * a change to the selected photo index. The change is immediately applied and
 * doesn't need the owner to permit the change.
 */
export default class PhotosContainer extends Component {
  static propTypes = {
    photos: PropTypes.array.isRequired,
    selected: PropTypes.number,
    onChange: PropTypes.func.isRequired,
    overshootDamping: PropTypes.number,
    springConfig: PropTypes.object,
    animateIndividualPhotos: PropTypes.bool,
    swipeVelocityThreshold: PropTypes.number,
    indicateBoundaryVelocity: PropTypes.number
  };

  static defaultProps = {
    selected: 0,
    overshootDamping: 0.75,
    springConfig: {
      damping: 30,
      springConstant: 230
    },
    animateIndividualPhotos: true,
    swipeVelocityThreshold: 500, // px per second
    indicateBoundaryVelocity: 2000 // px per second
  };

  componentDidMount() {
    const {springConfig} = this.props;

    this.spring = new Spring(springConfig.springConstant, springConfig.damping);
    this.spring.snap(0);
    this.offset = 0;

    // eslint-disable-next-line react/no-find-dom-node
    this.node = ReactDOM.findDOMNode(this);

    this.setup();
    this.update();

    window.addEventListener('resize', this.onWindowResize);
  }

  componentDidUpdate() {
    this.setup();
    this.update();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
  }

  onWindowResize = () => {
    this.setup();
    this.update();
  };

  onTouchStart = TouchUtils.decorateTouchStart(() => {
    if (this.animation) this.animation.cancel();
    this.startOffset = this.offset;
  });

  /**
   * Sets `this.offset` accordingly and invokes the update of the container.
   */
  onTouchMove = TouchUtils.decorateTouchMove(delta => {
    const {overshootDamping} = this.props;

    let dx = delta.x;

    // Adjust `dx` if there's an overshoot at the beginning or the end
    // of the container (the user tries to scroll past the boundaries).
    if (this.startOffset - delta.x < this.minOffset) {
      const overshoot = this.minOffset - this.startOffset - delta.x;
      dx = delta.x + overshoot * overshootDamping;
    } else if (this.startOffset - delta.x > this.maxOffset) {
      const overshoot = this.maxOffset - this.startOffset - delta.x;
      dx = delta.x + overshoot * overshootDamping;
    }

    this.offset = this.startOffset - dx;

    this.updateContainer();
  });

  onTouchEnd = TouchUtils.decorateTouchEnd((delta, velocity) => {
    const {swipeVelocityThreshold} = this.props;

    const viewportWidth = breakpoint.viewport.width;

    // Immediately set the spring to the position where the container got
    // dropped, so the animation can begin from there.
    this.spring.snap(this.offset);

    const passedThreshold =
      Math.abs(delta.x) > viewportWidth / 2 ||
      Math.abs(velocity.x) > swipeVelocityThreshold;

    if (passedThreshold) {
      // If the swipe was to the right, then pick the next lowest
      // image number and otherwise the next higher.
      const roundingFn = velocity.x > 0 ? Math.floor : Math.ceil;

      // Make sure the offset is within the boundaries.
      const offset = Math.max(
        Math.min(this.offset, this.maxOffset),
        this.minOffset
      );

      const nextPhotoIndex = roundingFn(offset / viewportWidth);
      this.update(nextPhotoIndex, -velocity.x);
    } else {
      this.update();
    }
  });

  setup() {
    const {photos} = this.props;

    this.minOffset = 0;
    this.maxOffset = (photos.length - 1) * breakpoint.viewport.width;

    this.photoNodes = this.node.querySelectorAll('.' + styles.photo);
  }

  indicateLowerBoundary() {
    const {indicateBoundaryVelocity} = this.props;
    this.update(undefined, this.spring.velocity() - indicateBoundaryVelocity);
  }

  indicateUpperBoundary() {
    const {indicateBoundaryVelocity} = this.props;
    this.update(undefined, this.spring.velocity() + indicateBoundaryVelocity);
  }

  /**
   * @param {Number} [overrideSelected] Can be provided to override
   * `this.props.selected`. This will furthermore result in a call to
   * `onChange` as soon as the animation is finished.
   * @param {Number} [velocity]
   */
  update(overrideSelected, velocity) {
    const {selected} = this.props;
    const {onChange} = this.props;

    const actualCurrent =
      overrideSelected !== undefined ? overrideSelected : selected;

    const offset = actualCurrent * breakpoint.viewport.width;

    // If the spring is already animating to the desired offset, don't
    // interrupt the animation. This is important, because otherwise the
    // velocity would be lost.
    const dontInterrupt = this.spring.endValue() === offset && !velocity;
    if (dontInterrupt) return;

    this.spring.setEnd(offset, velocity);

    if (this.animation) this.animation.cancel();

    // Start animation loop
    this.animation = runAnimation(
      this.spring,

      () => {
        // onFrame
        this.offset = this.spring.x();
        this.updateContainer();
      },

      () => {
        // onFinish
        this.animation = undefined;
      }
    );

    // May notify owner about an override
    if (overrideSelected !== undefined && overrideSelected !== selected) {
      onChange(overrideSelected);
    }
  }

  updateContainer() {
    const {animateIndividualPhotos} = this.props;

    this.node.style.transform = `translateX(${-this.offset}px)`;

    if (animateIndividualPhotos) {
      const startIndex = Math.floor(this.offset / breakpoint.viewport.width);

      for (let i = startIndex; i < startIndex + 2; i++) {
        const photoNode = this.photoNodes[i];

        if (!photoNode) continue;

        const progress =
          (breakpoint.viewport.width * i - this.offset) /
          breakpoint.viewport.width;

        const maxOpacity = 1;
        const minOpacity = 0;
        const opacity =
          (1 - Math.abs(progress)) * (maxOpacity - minOpacity) + minOpacity;

        photoNode.style.opacity = opacity;
      }
    }
  }

  render() {
    const {photos} = this.props;

    return (
      <div
        className={styles.root}
        onMouseDown={this.onTouchStart}
        onMouseMove={this.onTouchMove}
        onMouseUp={this.onTouchEnd}
        onTouchEnd={this.onTouchEnd}
        onTouchMove={this.onTouchMove}
        onTouchStart={this.onTouchStart}
      >
        {photos.map(photo => (
          <div
            key={photo}
            className={styles.photo}
            style={{backgroundImage: `url(${photo})`}}
          />
        ))}
      </div>
    );
  }
}

/* eslint-disable react/no-string-refs, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import breakpoint from '../utils/breakpoint';
import EnvUtils from '../utils/EnvUtils';
import IconButton from './IconButton';
import PhotosContainer from './PhotosContainer';
import styles from './PhotoGallery.module.scss';

let key;
if (EnvUtils.isClient()) {
  key = require('keymaster');
}

export default class PhotoGallery extends Component {
  static propTypes = {
    album: PropTypes.object.isRequired
  };

  state = {
    selected: 0,
    hideControls: false
  };

  componentDidMount() {
    this.startHideControlsTimer();

    key('left', this.onShowPrev);
    key('right', this.onShowNext);
    key('esc', this.onEsc);
  }

  componentWillUnmount() {
    this.cancelHideControlsTimer();

    key.unbind('left');
    key.unbind('right');
    key.unbind('esc');
  }

  onHideControls = () => {
    this.setState({hideControls: true});
  };

  onShowControls = () => {
    this.setState({hideControls: false});
    this.startHideControlsTimer();
  };

  onShowPrev = () => {
    if (this.hasPrev()) {
      this.setState(prevState => ({selected: prevState.selected - 1}));
    } else {
      this.refs.container.indicateLowerBoundary();
    }
  };

  onShowNext = () => {
    if (this.hasNext()) {
      this.setState(prevState => ({selected: prevState.selected + 1}));
    } else {
      this.refs.container.indicateUpperBoundary();
    }
  };

  onChange = selected => {
    this.setState({selected});
  };

  onMouseMove = () => {
    this.showControls();
  };

  onClick = () => {
    this.showControls();
  };

  startHideControlsTimer() {
    this.cancelHideControlsTimer();
    if (!EnvUtils.hasTouch()) {
      this.hideControlsTimerID = setTimeout(this.hideControls, 2000);
    }
  }

  cancelHideControlsTimer() {
    if (this.hideControlsTimerID) {
      clearInterval(this.hideControlsTimerID);
    }
  }

  hideControls = () => {
    this.setState({hideControls: true});
  };

  showControls = () => {
    this.setState({hideControls: false});
    this.startHideControlsTimer();
  };

  hasNext = () => this.state.selected < this.props.album.photos.length - 1;

  hasPrev = () => this.state.selected > 0;

  render() {
    const {album} = this.props;
    const {selected, hideControls} = this.state;

    const photos =
      breakpoint.isSmallerThan('medium') && album.smallImages
        ? album.smallPhotos
        : album.photos;

    const className = cx(styles.root, {
      [styles.root_hideControls]: hideControls
    });

    return (
      <div
        className={className}
        onClick={this.onClick}
        onMouseMove={this.onMouseMove}
      >
        {!EnvUtils.hasTouch() && (
          <IconButton
            className={cx(styles.prev, {
              [styles.control_disabled]: !this.hasPrev()
            })}
            icon="chevron-left"
            onClick={this.onShowPrev}
          />
        )}
        {!EnvUtils.hasTouch() && (
          <IconButton
            className={cx(styles.next, {
              [styles.control_disabled]: !this.hasNext()
            })}
            icon="chevron-right"
            onClick={this.onShowNext}
          />
        )}
        <PhotosContainer
          ref="container"
          onChange={this.onChange}
          photos={photos}
          selected={selected}
        />
      </div>
    );
  }
}

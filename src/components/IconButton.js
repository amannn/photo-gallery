import React, {Component} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Icon from './Icon';
import styles from './IconButton.module.scss';

export default class IconButton extends Component {
  static propTypes = {
    className: PropTypes.string,
    icon: PropTypes.string,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
    children: PropTypes.node
  };

  render() {
    const {className, children, icon, disabled, onClick} = this.props;

    return (
      <button
        className={cx(styles.root, className, {
          [styles.root_disabled]: disabled
        })}
        onClick={onClick}
      >
        {icon ? <Icon name={icon} /> : children}
      </button>
    );
  }
}

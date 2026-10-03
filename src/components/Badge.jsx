// src/components/Badge.jsx

import React from "react";
import PropTypes from 'prop-types';

const Badge = ({ name, color, position }) => {
  // Define positioning styles
  const positionStyles = {
    topLeft: "top-2 left-2",
    topRight: "top-2 right-2",
    bottomLeft: "bottom-2 left-2",
    bottomRight: "bottom-2 right-2",
    // Add more positions if needed
  };

  // Helper function to determine text color based on badge background color
  const getTextColor = (bgColor) => {
    // Simple algorithm to decide text color based on brightness
    // You can use a more sophisticated method or a library for better accuracy
    const color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0,2), 16);
    const g = parseInt(color.substring(2,4), 16);
    const b = parseInt(color.substring(4,6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? '#000' : '#fff';
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold absolute ${positionStyles[position] || positionStyles["topLeft"]} z-10`}
      style={{ backgroundColor: color, color: getTextColor(color) }}
    >
      {name}
    </span>
  );
};

Badge.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired, // e.g., "#FF0000" or "red"
  position: PropTypes.string, // e.g., "topLeft", "topRight"
};

Badge.defaultProps = {
  position: "topLeft",
};

export default Badge;

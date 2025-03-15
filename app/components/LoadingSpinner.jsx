"use client";

import React from "react";

/**
 * A reusable loading spinner component with customizable size and color
 *
 * @param {Object} props
 * @param {string} props.size - Size of the spinner: "small", "medium", or "large"
 * @param {string} props.color - Color of the spinner: "primary", "secondary", or custom color
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = "medium",
  color = "secondary",
  className = "",
}) => {
  // Define sizes
  const sizes = {
    small: "h-6 w-6",
    medium: "h-10 w-10",
    large: "h-12 w-12",
  };

  // Define colors
  const colors = {
    primary: "border-primary",
    secondary: "border-secondary",
    white: "border-white",
  };

  // Get the appropriate size and color classes
  const sizeClass = sizes[size] || sizes.medium;
  const colorClass = colors[color] || color;

  return (
    <div
      className={`animate-spin rounded-full border-t-2 border-b-2 ${sizeClass} ${colorClass} ${className}`}
      aria-label="Loading"
    />
  );
};

export default LoadingSpinner;

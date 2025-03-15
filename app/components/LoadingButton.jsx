"use client";

import React from "react";
import LoadingSpinner from "./LoadingSpinner";

/**
 * A button component that shows a loading spinner when in loading state
 *
 * @param {Object} props
 * @param {boolean} props.isLoading - Whether the button is in loading state
 * @param {string} props.loadingText - Text to display when loading
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.variant - Button variant (primary, secondary)
 * @param {boolean} props.fullWidth - Whether the button should take full width
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.className - Additional CSS classes
 */
const LoadingButton = ({
  isLoading = false,
  loadingText = "Loading...",
  type = "button",
  variant = "primary",
  fullWidth = false,
  onClick,
  disabled = false,
  children,
  className = "",
}) => {
  // Define variant styles
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark",
    secondary: "bg-secondary text-primary hover:bg-secondary-dark",
    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary/10",
  };

  const variantClass = variants[variant] || variants.primary;
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${widthClass} ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner
            size="small"
            color={variant === "primary" ? "white" : "primary"}
          />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;

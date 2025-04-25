/**
 * Helper functions for formatting and styling order and payment status
 */

/**
 * Get the color class for a payment status
 * @param {string} status - The payment status
 * @returns {string} The CSS class for background and text color
 */
export function getPaymentStatusColor(status) {
  if (!status) return "bg-gray-100 text-gray-500";
  
  status = status.toUpperCase();
  
  switch (status) {
    case "SUCCESSFUL":
    case "PAID":
      return "bg-green-100 text-green-800";
    case "PENDING":
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

/**
 * Format payment status to a user-friendly display string
 * @param {string} status - The payment status from database
 * @returns {string} Formatted payment status
 */
export function formatPaymentStatus(status) {
  if (!status) return "Unknown";
  
  status = status.toUpperCase();
  
  switch (status) {
    case "SUCCESSFUL":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

/**
 * Get the appropriate icon name for a payment status
 * @param {string} status - The payment status
 * @returns {string} The icon name
 */
export function getPaymentStatusIcon(status) {
  if (!status) return "question-mark";
  
  status = status.toUpperCase();
  
  switch (status) {
    case "SUCCESSFUL":
    case "PAID":
      return "check-circle";
    case "PENDING":
      return "clock";
    case "PROCESSING":
      return "refresh-cw";
    case "FAILED":
      return "x-circle";
    case "REFUNDED":
      return "rotate-ccw";
    default:
      return "help-circle";
  }
} 
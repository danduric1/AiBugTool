/**
 * Toast Notification Integration for AI Bug Tool
 * This file integrates the Toast Notification Service with the main application,
 * making it easy to show notifications from anywhere in the app.
 */

// Global toast notification service instance
let appToastService;

/**
 * Initialize the toast notification service
 * Should be called once when the application loads
 */
function initializeToastService() {
  if (!appToastService) {
    appToastService = new ToastNotificationService();
    console.log("Toast notification service initialized");
  }
}

/**
 * Show an info toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration before auto-dismiss (milliseconds)
 * @param {Array} actions - Optional array of action objects { text: string, callback: function }
 * @returns {string} - The ID of the created toast
 */
function showInfoToast(message, duration = 3000, actions = []) {
  ensureServiceInitialized();
  return appToastService.info(message, duration, actions);
}

/**
 * Show a success toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration before auto-dismiss (milliseconds)
 * @param {Array} actions - Optional array of action objects { text: string, callback: function }
 * @returns {string} - The ID of the created toast
 */
function showSuccessToast(message, duration = 3000, actions = []) {
  ensureServiceInitialized();
  return appToastService.success(message, duration, actions);
}

/**
 * Show an error toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration before auto-dismiss (milliseconds)
 * @param {Array} actions - Optional array of action objects { text: string, callback: function }
 * @returns {string} - The ID of the created toast
 */
function showErrorToast(message, duration = 4000, actions = []) {
  ensureServiceInitialized();
  return appToastService.error(message, duration, actions);
}

/**
 * Show a warning toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration before auto-dismiss (milliseconds)
 * @param {Array} actions - Optional array of action objects { text: string, callback: function }
 * @returns {string} - The ID of the created toast
 */
function showWarningToast(message, duration = 4000, actions = []) {
  ensureServiceInitialized();
  return appToastService.warning(message, duration, actions);
}

/**
 * Show a working/loading toast notification with a spinner
 * @param {string} message - The message to display
 * @returns {string} - The ID of the created toast
 */
function showWorkingToast(message) {
  ensureServiceInitialized();
  return appToastService.working(message);
}

/**
 * Complete a working toast by updating it to a success message
 * @param {string} toastId - The ID of the working toast
 * @param {string} message - The success message
 * @param {number} duration - Duration before auto-dismiss
 * @returns {boolean} - Whether the operation was successful
 */
function completeWorkingToast(toastId, message, duration = 3000) {
  ensureServiceInitialized();
  return appToastService.completeWorking(toastId, message, duration);
}

/**
 * Fail a working toast by updating it to an error message
 * @param {string} toastId - The ID of the working toast
 * @param {string} message - The error message
 * @param {number} duration - Duration before auto-dismiss
 * @returns {boolean} - Whether the operation was successful
 */
function failWorkingToast(toastId, message, duration = 4000) {
  ensureServiceInitialized();
  return appToastService.failWorking(toastId, message, duration);
}

/**
 * Show a confirmation toast with actions
 * @param {string} message - The message to display
 * @param {function} onConfirm - Callback function when confirmed
 * @param {function} onCancel - Callback function when cancelled
 * @param {string} confirmText - Text for the confirm button
 * @param {string} cancelText - Text for the cancel button
 * @returns {string} - The ID of the created toast
 */
function showConfirmationToast(
  message,
  onConfirm,
  onCancel = null,
  confirmText = "Confirm",
  cancelText = "Cancel"
) {
  ensureServiceInitialized();

  const actions = [
    {
      text: cancelText,
      callback: function () {
        if (onCancel && typeof onCancel === "function") {
          onCancel();
        }
      },
    },
    {
      text: confirmText,
      callback: function () {
        if (onConfirm && typeof onConfirm === "function") {
          onConfirm();
        }
      },
    },
  ];

  return appToastService.warning(message, Infinity, actions);
}

/**
 * Dismiss a specific toast notification
 * @param {string} toastId - The ID of the toast to dismiss
 * @returns {boolean} - Whether the dismissal was successful
 */
function dismissToast(toastId) {
  ensureServiceInitialized();
  return appToastService.dismiss(toastId);
}

/**
 * Dismiss all active toast notifications
 */
function dismissAllToasts() {
  ensureServiceInitialized();
  appToastService.dismissAll();
}

/**
 * Helper function to ensure the toast service is initialized
 * @private
 */
function ensureServiceInitialized() {
  if (!appToastService) {
    initializeToastService();
  }
}

// Initialize toast service when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Create toast container if it doesn't exist
  if (!document.getElementById("toastNotificationsContainer")) {
    const container = document.createElement("div");
    container.id = "toastNotificationsContainer";
    container.className = "toast-notifications-container";
    document.body.appendChild(container);
  }

  // Initialize the toast service
  initializeToastService();
});

/**
 * Usage examples:
 *
 * // Show a simple notification
 * showInfoToast('This is an information message');
 * showSuccessToast('Operation completed successfully!');
 * showWarningToast('Please save your changes before continuing');
 * showErrorToast('Unable to connect to the server');
 *
 * // Show a working notification
 * const toastId = showWorkingToast('Uploading your file...');
 *
 * // Later, complete it
 * completeWorkingToast(toastId, 'File uploaded successfully!');
 *
 * // Or mark it as failed
 * failWorkingToast(toastId, 'Failed to upload file. Please try again.');
 *
 * // Show a confirmation dialog
 * showConfirmationToast(
 *   'Delete this item?',
 *   function() {
 *     // User confirmed
 *     deleteItem(itemId);
 *     showSuccessToast('Item deleted');
 *   },
 *   function() {
 *     // User cancelled
 *     showInfoToast('Action cancelled');
 *   },
 *   'Delete',  // Confirm button text
 *   'Cancel'   // Cancel button text
 * );
 */

/**
 * Toast Integration - Provides simplified access to the Toast Notification Service
 *
 * This file provides convenient global functions to use the toast notification service
 * without having to directly interact with the ToastNotificationService class.
 */

/**
 * Displays a toast notification.
 * @param {string} message - The text content of the toast message.
 * @param {string} [type='info'] - The type of message: 'info', 'success', 'error', 'warning'.
 * @param {number|null} [duration=5000] - The duration in milliseconds before auto-closing. Set to null for persistent toasts.
 * @param {string|null} [toastId=null] - A unique ID for the toast (for updating/removing specific toasts).
 * @param {Array<{text: string, onClick: Function, ariaLabel: string}>} [actions=[]] - Optional action buttons to add.
 * @returns {string} The ID of the created toast.
 */
function showToast(
  message,
  type = "info",
  duration = 5000,
  toastId = null,
  actions = []
) {
  if (window.toastService) {
    return window.toastService.showToast(
      message,
      type,
      duration,
      toastId,
      actions
    );
  } else {
    console.error("Toast service not initialized!");
    return null;
  }
}

/**
 * Removes a toast notification by its ID.
 * @param {string} toastId - The unique ID of the toast to remove.
 * @returns {boolean} True if the toast was found and removed, false otherwise.
 */
function removeToast(toastId) {
  if (window.toastService) {
    return window.toastService.removeProcessToast(toastId);
  } else {
    console.error("Toast service not initialized!");
    return false;
  }
}

/**
 * Updates an existing toast notification.
 * @param {string} toastId - The ID of the toast to update.
 * @param {Object} options - The options to update.
 * @returns {boolean} True if the toast was found and updated, false otherwise.
 */
function updateToast(toastId, options) {
  if (window.toastService) {
    return window.toastService.updateToast(toastId, options);
  } else {
    console.error("Toast service not initialized!");
    return false;
  }
}

/**
 * Starts an elapsed time updater that shows a toast with continuously updating time.
 * @param {string} processId - A unique ID for the toast.
 * @param {string} [baseMessage="AI is working..."] - The base message to display.
 * @param {string} [type="info"] - The type of toast to display.
 * @returns {string} The ID of the toast.
 */
function startElapsedTimeUpdater(
  processId,
  baseMessage = "AI is working...",
  type = "info"
) {
  if (window.toastService) {
    return window.toastService.startElapsedTimeUpdater(
      processId,
      baseMessage,
      type
    );
  } else {
    console.error("Toast service not initialized!");
    return null;
  }
}

/**
 * Stops the elapsed time updater and optionally removes the associated toast.
 * @param {boolean} [removeToast=true] - Whether to remove the toast or just stop updating it.
 * @param {Object} [finalToastOptions=null] - Optional settings for a final toast to show instead.
 */
function stopElapsedTimeUpdater(removeToast = true, finalToastOptions = null) {
  if (window.toastService) {
    window.toastService.stopElapsedTimeUpdater(removeToast, finalToastOptions);
  } else {
    console.error("Toast service not initialized!");
  }
}

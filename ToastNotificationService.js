/**
 * Toast Notification Service
 * A lightweight, modern service for displaying toast notifications in the AI Bug Tool.
 *
 * Features:
 * - Multiple notification types (info, success, error, warning)
 * - Auto-dismiss with customizable duration
 * - Interactive close button
 * - Support for action buttons
 * - Stacking of multiple notifications
 * - Animation effects
 * - Progress indicator for working states
 */

class ToastNotificationService {
  constructor(containerId = "toastNotificationsContainer") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(
        `Toast container with ID "${containerId}" not found. Creating one.`
      );
      this.container = document.createElement("div");
      this.container.id = containerId;
      this.container.className = "toast-notifications-container";
      document.body.appendChild(this.container);
    }

    this.activeToasts = new Map();
    this.toastIdCounter = 0;
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of notification: 'info', 'success', 'error', 'warning'
   * @param {number} duration - Duration in milliseconds before auto-dismiss (Infinity for no auto-dismiss)
   * @param {Array} actions - Optional array of action objects { text: string, callback: function }
   * @returns {string} - The ID of the created toast
   */
  show(message, type = "info", duration = 3000, actions = []) {
    if (!this.container) return null;

    const toastId = `toast-${Date.now()}-${this.toastIdCounter++}`;
    const toastElement = document.createElement("div");
    toastElement.className = `toast-notification toast-bg-${type}`;
    if (actions.length > 0) {
      toastElement.classList.add("has-action");
    }
    toastElement.setAttribute("data-toast-id", toastId);

    let messageContent = `<span class="toast-message-text">${message}</span>`;
    let closeButton = `<button type="button" class="toast-close-button" aria-label="Close notification">&times;</button>`;

    let actionsHtml = "";
    if (actions.length > 0) {
      actionsHtml = '<div class="toast-actions">';
      actions.forEach((action, index) => {
        actionsHtml += `<button type="button" class="toast-action-button" data-action-index="${index}">${action.text}</button>`;
      });
      actionsHtml += "</div>";
    }

    toastElement.innerHTML = `${messageContent}${closeButton}${actionsHtml}`;

    // Add event listener to close button
    const closeButtonElement = toastElement.querySelector(
      ".toast-close-button"
    );
    closeButtonElement.addEventListener("click", () => {
      this.dismiss(toastId);
    });

    // Add event listeners to action buttons
    if (actions.length > 0) {
      const actionButtons = toastElement.querySelectorAll(
        ".toast-action-button"
      );
      actionButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const actionIndex = parseInt(
            button.getAttribute("data-action-index")
          );
          if (
            actions[actionIndex] &&
            typeof actions[actionIndex].callback === "function"
          ) {
            actions[actionIndex].callback();
          }
          this.dismiss(toastId);
        });
      });
    }

    // Add to container
    this.container.appendChild(toastElement);

    // Force reflow to enable transition
    toastElement.offsetHeight;
    toastElement.classList.add("show");

    // Store reference to the toast
    this.activeToasts.set(toastId, {
      element: toastElement,
      timeoutId: null,
    });

    // Set auto-dismiss timer if duration is not Infinity
    if (duration !== Infinity) {
      const timeoutId = setTimeout(() => {
        this.dismiss(toastId);
      }, duration);

      // Store the timeout ID
      this.activeToasts.get(toastId).timeoutId = timeoutId;
    }

    return toastId;
  }

  /**
   * Show an info toast notification
   * @param {string} message - The message to display
   * @param {number} duration - Duration before auto-dismiss
   * @param {Array} actions - Optional action buttons
   * @returns {string} - The ID of the created toast
   */
  info(message, duration = 3000, actions = []) {
    return this.show(message, "info", duration, actions);
  }

  /**
   * Show a success toast notification
   * @param {string} message - The message to display
   * @param {number} duration - Duration before auto-dismiss
   * @param {Array} actions - Optional action buttons
   * @returns {string} - The ID of the created toast
   */
  success(message, duration = 3000, actions = []) {
    return this.show(message, "success", duration, actions);
  }

  /**
   * Show an error toast notification
   * @param {string} message - The message to display
   * @param {number} duration - Duration before auto-dismiss
   * @param {Array} actions - Optional action buttons
   * @returns {string} - The ID of the created toast
   */
  error(message, duration = 4000, actions = []) {
    return this.show(message, "error", duration, actions);
  }

  /**
   * Show a warning toast notification
   * @param {string} message - The message to display
   * @param {number} duration - Duration before auto-dismiss
   * @param {Array} actions - Optional action buttons
   * @returns {string} - The ID of the created toast
   */
  warning(message, duration = 4000, actions = []) {
    return this.show(message, "warning", duration, actions);
  }

  /**
   * Show a working/loading toast notification
   * @param {string} message - The message to display
   * @returns {string} - The ID of the created toast
   */
  working(message) {
    const messageWithSpinner = `<span class="toast-spinner"></span>${message}`;
    return this.show(messageWithSpinner, "info", Infinity);
  }

  /**
   * Update an existing toast notification
   * @param {string} toastId - The ID of the toast to update
   * @param {Object} options - Options to update (message, type, duration)
   * @returns {boolean} - Whether the update was successful
   */
  update(toastId, options = {}) {
    const toast = this.activeToasts.get(toastId);
    if (!toast) return false;

    const { element, timeoutId } = toast;

    // Update message if provided
    if (options.message) {
      const messageEl = element.querySelector(".toast-message-text");
      if (messageEl) {
        messageEl.innerHTML = options.message;
      }
    }

    // Update type if provided
    if (options.type) {
      element.className = element.className.replace(
        /toast-bg-\w+/,
        `toast-bg-${options.type}`
      );
    }

    // Update duration if provided
    if (options.duration !== undefined) {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout if duration is not Infinity
      if (options.duration !== Infinity) {
        const newTimeoutId = setTimeout(() => {
          this.dismiss(toastId);
        }, options.duration);

        // Update stored timeout ID
        this.activeToasts.get(toastId).timeoutId = newTimeoutId;
      } else {
        // No auto-dismiss
        this.activeToasts.get(toastId).timeoutId = null;
      }
    }

    return true;
  }

  /**
   * Dismiss a toast notification
   * @param {string} toastId - The ID of the toast to dismiss
   * @returns {boolean} - Whether the dismissal was successful
   */
  dismiss(toastId) {
    const toast = this.activeToasts.get(toastId);
    if (!toast) return false;

    const { element, timeoutId } = toast;

    // Clear timeout if exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Animate out
    element.classList.remove("show");

    // Remove after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.activeToasts.delete(toastId);
    }, 300); // Match CSS transition duration

    return true;
  }

  /**
   * Dismiss all active toast notifications
   */
  dismissAll() {
    this.activeToasts.forEach((toast, toastId) => {
      this.dismiss(toastId);
    });
  }

  /**
   * Complete a working/loading toast by updating it to a success and setting auto-dismiss
   * @param {string} toastId - The ID of the working toast
   * @param {string} message - The success message
   * @param {number} duration - Duration before auto-dismiss
   * @returns {boolean} - Whether the operation was successful
   */
  completeWorking(toastId, message, duration = 3000) {
    return this.update(toastId, {
      message,
      type: "success",
      duration,
    });
  }

  /**
   * Fail a working/loading toast by updating it to an error and setting auto-dismiss
   * @param {string} toastId - The ID of the working toast
   * @param {string} message - The error message
   * @param {number} duration - Duration before auto-dismiss
   * @returns {boolean} - Whether the operation was successful
   */
  failWorking(toastId, message, duration = 4000) {
    return this.update(toastId, {
      message,
      type: "error",
      duration,
    });
  }
}

// Initialize the service when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Create global toast service instance
  window.toastService = new ToastNotificationService();

  // Example usage:
  // toastService.info('This is an info message');
  // toastService.success('Operation successful!');
  // toastService.error('Something went wrong');
  // toastService.warning('Warning: This action cannot be undone');

  // Working toast example:
  // const workingToastId = toastService.working('Processing your request...');
  // setTimeout(() => {
  //   toastService.completeWorking(workingToastId, 'Request completed successfully!');
  // }, 3000);

  // Toast with actions:
  // toastService.warning('Delete this item?', Infinity, [
  //   { text: 'Cancel', callback: () => console.log('Cancelled') },
  //   { text: 'Delete', callback: () => console.log('Deleted') }
  // ]);
});

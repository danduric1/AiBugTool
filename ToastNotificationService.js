/**
 * Toast Notification Service for AI Bug Tool
 * This service provides a reusable, standardized way to display toast notifications across the application.
 */

class ToastNotificationService {
  constructor(containerId = "toastNotificationsContainer") {
    this.toastNotificationsContainer = document.getElementById(containerId);
    if (!this.toastNotificationsContainer) {
      console.error(
        `Toast notifications container with ID "${containerId}" not found.`
      );
      // Create the container if it doesn't exist
      this.toastNotificationsContainer = document.createElement("div");
      this.toastNotificationsContainer.id = containerId;
      this.toastNotificationsContainer.className =
        "toast-notifications-container";
      document.body.appendChild(this.toastNotificationsContainer);
    }

    this.activeProcessToasts = new Map(); // To manage persistent toasts
    this.toastIdCounter = 0; // Counter to generate unique toast IDs
    this._elapsedTimeIntervalId = null; // For tracking elapsed time
    this.currentElapsedTimeToastId = null; // To track the AI working toast
  }

  /**
   * Displays a toast message notification.
   * @param {string} message - The text content of the toast message.
   * @param {string} [type='info'] - The type of message: 'info', 'success', 'error', 'warning'.
   * @param {number|null} [duration=5000] - The duration in milliseconds before auto-closing. Set to null or Infinity for persistent toasts.
   * @param {string|null} [toastId=null] - A unique ID for the toast. Useful for updating/removing specific process-related toasts.
   * @param {Array<{text: string, onClick: Function, ariaLabel: string}>} [actions=[]] - Optional array of action buttons to add to the toast.
   * @returns {string} The ID of the created or updated toast.
   */
  showToast(
    message,
    type = "info",
    duration = 5000,
    toastId = null,
    actions = []
  ) {
    if (!this.toastNotificationsContainer) {
      console.error("Toast notifications container not found.");
      return null;
    }

    // Generate a unique ID if not provided
    if (!toastId) {
      toastId = `toast-${Date.now()}-${this.toastIdCounter++}`;
    }

    let toastElement;
    let isNewToast = false;

    if (this.activeProcessToasts.has(toastId)) {
      // Update existing toast if toastId is provided and it's active
      toastElement = this.activeProcessToasts.get(toastId);
      const messageTextSpan = toastElement.querySelector(".toast-message-text");
      if (messageTextSpan) {
        messageTextSpan.innerHTML = message;
      }

      // Update the toast type if it's changed
      toastElement.className = toastElement.className.replace(
        /toast-bg-\w+/,
        `toast-bg-${type}`
      );
    } else {
      // Create new toast element
      isNewToast = true;
      toastElement = document.createElement("div");
      toastElement.className = `toast-notification toast-bg-${type}`;
      toastElement.setAttribute("data-toast-id", toastId);
      toastElement.setAttribute("role", "alert"); // Accessibility: announce to screen readers
      toastElement.setAttribute("aria-live", "polite"); // Announce changes without interrupting

      // Add the message content and close button
      toastElement.innerHTML = `
        <span class="toast-message-text">${message}</span>
        <button type="button" class="toast-close-button" aria-label="Close notification">&times;</button>
      `;

      // Add actions if provided
      if (actions && actions.length > 0) {
        toastElement.classList.add("has-action");
        const actionsContainer = document.createElement("div");
        actionsContainer.className = "toast-actions";

        actions.forEach((action, index) => {
          const actionButton = document.createElement("button");
          actionButton.className = "toast-action-button";
          actionButton.textContent = action.text;
          actionButton.setAttribute(
            "aria-label",
            action.ariaLabel || action.text
          );
          actionButton.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof action.onClick === "function") {
              action.onClick();
            }
          });
          actionsContainer.appendChild(actionButton);
        });

        // Insert after the message text
        const messageTextEl = toastElement.querySelector(".toast-message-text");
        messageTextEl.parentNode.insertBefore(
          actionsContainer,
          messageTextEl.nextSibling
        );
      }

      // Add click handler for close button
      const closeButton = toastElement.querySelector(".toast-close-button");
      closeButton.addEventListener("click", () => this.hideToast(toastElement));

      // Add to DOM and prepare for animation
      this.toastNotificationsContainer.appendChild(toastElement);
      // Force reflow to enable transition
      toastElement.offsetHeight;
    }

    // Add or update spinner for "working" states
    const messageTextSpan = toastElement.querySelector(".toast-message-text");
    if (messageTextSpan) {
      if (
        message.includes("working") ||
        message.includes("loading") ||
        message.includes("processing")
      ) {
        // Only add spinner if it doesn't already exist
        if (!messageTextSpan.querySelector(".toast-spinner")) {
          const spinnerEl = document.createElement("div");
          spinnerEl.className = "toast-spinner";
          messageTextSpan.insertBefore(spinnerEl, messageTextSpan.firstChild);
        }
      } else {
        // Remove spinner if it exists but message no longer implies work
        const spinner = messageTextSpan.querySelector(".toast-spinner");
        if (spinner) {
          spinner.remove();
        }
      }
    }

    // Show the toast
    toastElement.classList.add("show");

    // Clear any existing timeout for this toast
    if (toastElement.dataset.timeoutId) {
      clearTimeout(parseInt(toastElement.dataset.timeoutId));
    }

    // Set auto-close timeout unless duration is null or Infinity
    if (duration !== null && duration !== Infinity) {
      const timeoutId = setTimeout(
        () => this.hideToast(toastElement),
        duration
      );
      toastElement.dataset.timeoutId = timeoutId;
    }

    // Store persistent toasts in the map
    if (duration === null || duration === Infinity) {
      this.activeProcessToasts.set(toastId, toastElement);
    } else if (
      isNewToast &&
      this.toastNotificationsContainer.childNodes.length > 5
    ) {
      // If there are too many toasts, remove the oldest (except persistent ones)
      const nonPersistentToasts = Array.from(
        this.toastNotificationsContainer.childNodes
      ).filter(
        (t) => !this.activeProcessToasts.has(t.getAttribute("data-toast-id"))
      );

      if (nonPersistentToasts.length > 5) {
        this.hideToast(nonPersistentToasts[0]); // Remove oldest non-persistent toast
      }
    }

    return toastId;
  }

  /**
   * Hides and removes a specific toast element.
   * @param {HTMLElement} toastElement - The toast DOM element to hide.
   */
  hideToast(toastElement) {
    if (!toastElement) return;

    toastElement.classList.remove("show"); // Start fade out
    toastElement.setAttribute("aria-hidden", "true"); // Accessibility: mark as hidden

    // Clear any associated timeout
    const timeoutId = toastElement.dataset.timeoutId;
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      delete toastElement.dataset.timeoutId;
    }

    // Remove from DOM after transition
    toastElement.addEventListener(
      "transitionend",
      () => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      },
      { once: true }
    );

    // If it's a process toast, remove it from the active map
    const toastId = toastElement.getAttribute("data-toast-id");
    if (toastId && this.activeProcessToasts.has(toastId)) {
      this.activeProcessToasts.delete(toastId);

      // If this was the elapsed time toast, clear its interval
      if (toastId === this.currentElapsedTimeToastId) {
        if (this._elapsedTimeIntervalId) {
          clearInterval(this._elapsedTimeIntervalId);
          this._elapsedTimeIntervalId = null;
        }
        this.currentElapsedTimeToastId = null;
      }
    }
  }

  /**
   * Removes a persistent toast by its ID.
   * @param {string} toastId - The unique ID of the toast to remove.
   * @returns {boolean} True if the toast was found and removed, false otherwise.
   */
  removeProcessToast(toastId) {
    const toastElement = this.activeProcessToasts.get(toastId);
    if (toastElement) {
      this.hideToast(toastElement);
      return true;
    }
    return false;
  }

  /**
   * Updates an existing toast with new content and/or settings.
   * @param {string} toastId - The ID of the toast to update.
   * @param {Object} options - The options to update.
   * @param {string} [options.message] - New message text.
   * @param {string} [options.type] - New toast type (info, success, error, warning).
   * @param {number|null} [options.duration] - New duration before auto-close.
   * @param {Array} [options.actions] - New action buttons array.
   * @returns {boolean} True if the toast was found and updated, false otherwise.
   */
  updateToast(toastId, { message, type, duration, actions } = {}) {
    if (!toastId || !this.activeProcessToasts.has(toastId)) {
      return false;
    }

    // Get existing toast
    const toastElement = this.activeProcessToasts.get(toastId);

    // Update message if provided
    if (message !== undefined) {
      const messageTextSpan = toastElement.querySelector(".toast-message-text");
      if (messageTextSpan) {
        // Preserve spinner if it exists
        const spinner = messageTextSpan.querySelector(".toast-spinner");
        messageTextSpan.innerHTML = message;
        if (
          spinner &&
          (message.includes("working") || message.includes("loading"))
        ) {
          messageTextSpan.insertBefore(
            spinner.cloneNode(true),
            messageTextSpan.firstChild
          );
        }
      }
    }

    // Update type if provided
    if (type !== undefined) {
      toastElement.className = toastElement.className.replace(
        /toast-bg-\w+/,
        `toast-bg-${type}`
      );
    }

    // Update duration if provided
    if (duration !== undefined) {
      // Clear existing timeout
      if (toastElement.dataset.timeoutId) {
        clearTimeout(parseInt(toastElement.dataset.timeoutId));
        delete toastElement.dataset.timeoutId;
      }

      // Set new timeout if not persistent
      if (duration !== null && duration !== Infinity) {
        const timeoutId = setTimeout(
          () => this.hideToast(toastElement),
          duration
        );
        toastElement.dataset.timeoutId = timeoutId;
      }
    }

    // Update actions if provided
    if (actions !== undefined) {
      // Remove existing actions container
      const existingActions = toastElement.querySelector(".toast-actions");
      if (existingActions) {
        existingActions.remove();
      }

      // Add new actions if any
      if (actions && actions.length > 0) {
        toastElement.classList.add("has-action");
        const actionsContainer = document.createElement("div");
        actionsContainer.className = "toast-actions";

        actions.forEach((action) => {
          const actionButton = document.createElement("button");
          actionButton.className = "toast-action-button";
          actionButton.textContent = action.text;
          actionButton.setAttribute(
            "aria-label",
            action.ariaLabel || action.text
          );
          actionButton.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof action.onClick === "function") {
              action.onClick();
            }
          });
          actionsContainer.appendChild(actionButton);
        });

        // Insert after the message text
        const messageTextEl = toastElement.querySelector(".toast-message-text");
        messageTextEl.parentNode.insertBefore(
          actionsContainer,
          messageTextEl.nextSibling
        );
      } else {
        toastElement.classList.remove("has-action");
      }
    }

    return true;
  }

  /**
   * Starts an elapsed time updater that shows a toast with continuously updating time.
   * @param {string} processId - A unique ID for the toast.
   * @param {string} [baseMessage="AI is working..."] - The base message to display.
   * @param {string} [type="info"] - The type of toast to display.
   * @returns {string} The ID of the toast.
   */
  startElapsedTimeUpdater(
    processId,
    baseMessage = "AI is working...",
    type = "info"
  ) {
    // Clear any previously running interval
    if (this._elapsedTimeIntervalId) {
      clearInterval(this._elapsedTimeIntervalId);
      this._elapsedTimeIntervalId = null;
    }

    // If there's an existing elapsed time toast, remove it
    if (this.currentElapsedTimeToastId) {
      this.removeProcessToast(this.currentElapsedTimeToastId);
    }

    this.currentElapsedTimeToastId = processId;
    this._elapsedTimeStartTime = Date.now();

    // Show the initial toast message
    this.showToast(
      `${baseMessage} (0.0s)`,
      type,
      Infinity,
      this.currentElapsedTimeToastId
    );

    // Start updating the elapsed time
    this._elapsedTimeIntervalId = setInterval(() => {
      const elapsedTime = (Date.now() - this._elapsedTimeStartTime) / 1000;
      // Update the existing toast with the new elapsed time
      this.updateToast(this.currentElapsedTimeToastId, {
        message: `${baseMessage} (${elapsedTime.toFixed(1)}s)`,
      });
    }, 100); // Update every 100ms for smoother animation

    console.log(`Started elapsed time updater for process: ${processId}`);
    return this.currentElapsedTimeToastId;
  }

  /**
   * Stops the elapsed time updater and optionally removes the associated toast.
   * @param {boolean} [removeToast=true] - Whether to remove the toast or just stop updating it.
   * @param {Object} [finalToastOptions=null] - Optional settings for a final toast to show instead.
   */
  stopElapsedTimeUpdater(removeToast = true, finalToastOptions = null) {
    if (this._elapsedTimeIntervalId) {
      clearInterval(this._elapsedTimeIntervalId);
      this._elapsedTimeIntervalId = null;
      console.log("Stopped elapsed time updater.");
    }

    if (this.currentElapsedTimeToastId) {
      if (removeToast) {
        if (finalToastOptions) {
          // Replace with final toast
          const { message, type, duration, actions } = finalToastOptions;
          this.updateToast(this.currentElapsedTimeToastId, {
            message: message || "Process completed",
            type: type || "success",
            duration: duration || 5000,
            actions,
          });
        } else {
          // Just remove the toast
          this.removeProcessToast(this.currentElapsedTimeToastId);
        }
      }
      this.currentElapsedTimeToastId = null;
    }

    this._elapsedTimeStartTime = 0;
  }
}

// Create a global instance of the service that can be used throughout the application
window.toastService = null;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the toast service once the DOM is ready
  window.toastService = new ToastNotificationService(
    "toastNotificationsContainer"
  );
  console.log("Toast Notification Service initialized.");
});

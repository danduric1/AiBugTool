# Toast Notification Integration Guide

This guide demonstrates how to use the toast notification system in the AI Bug Tool application.

## Overview

The toast notification system provides a standardized way to display toast notifications across the application. It works in both client-side and server-side contexts, with the following key features:

- Basic toast notifications (info, success, warning, error)
- Persistent toast notifications
- Toast notifications with action buttons
- Updatable toast notifications
- Elapsed time progress toasts

## Available Functions

### Basic Toast Functions

```javascript
// Display a basic toast notification
showToast(message, type, duration, toastId, actions);

// Remove a toast by ID
removeToast(toastId);

// Update an existing toast
updateToast(toastId, { message, type, duration, actions });

// Start a toast with elapsed time (for long-running operations)
startElapsedTimeUpdater(processId, baseMessage, type);

// Stop an elapsed time toast
stopElapsedTimeUpdater(removeToast, finalToastOptions);
```

### Parameters

- `message`: String - The text content of the toast message
- `type`: String - 'info', 'success', 'warning', or 'error'
- `duration`: Number or null - Milliseconds to display toast (null for persistent)
- `toastId`: String - Optional unique ID for the toast
- `actions`: Array - Optional array of action button configurations
- `processId`: String - Unique ID for an elapsed time process
- `baseMessage`: String - Base message for elapsed time updater
- `removeToast`: Boolean - Whether to remove toast when stopping elapsed time
- `finalToastOptions`: Object - Options for final toast when stopping elapsed time

## Integration Examples

### 1. Basic Notification Examples

```javascript
// Show an information toast for 5 seconds
showToast("Data loaded successfully", "info", 5000);

// Show a success toast for 3 seconds
showToast("Operation completed successfully!", "success", 3000);

// Show a warning toast for 7 seconds
showToast("You have unsaved changes", "warning", 7000);

// Show an error toast for 10 seconds
showToast("Error: Failed to save data", "error", 10000);
```

### 2. Persistent Toast Example

```javascript
// Show a persistent toast (will not auto-close)
const persistentToastId = showToast(
  "Please complete this operation before proceeding",
  "info",
  null, // null duration makes it persistent
  "operation-reminder-toast"
);

// Later, you can manually remove it
removeToast(persistentToastId);
```

### 3. Toast with Action Buttons

```javascript
showToast(
  "Would you like to generate a bug report?",
  "info",
  null, // null duration makes it persistent
  "bug-report-prompt",
  [
    {
      text: "Yes",
      onClick: function () {
        // Generate bug report
        generateBugReport();
        removeToast("bug-report-prompt");
      },
    },
    {
      text: "No",
      onClick: function () {
        removeToast("bug-report-prompt");
      },
    },
  ]
);
```

### 4. Updatable Toast Example

```javascript
// Create an initial toast
const updatableToastId = showToast(
  "Starting operation...",
  "info",
  null, // Persistent
  "updatable-operation-toast"
);

// Later, update the toast content and type
updateToast(updatableToastId, {
  message: "Operation in progress: 50% complete",
  type: "warning",
});

// Finally, update to success and add a close action
updateToast(updatableToastId, {
  message: "Operation completed!",
  type: "success",
  duration: 5000, // Auto-close after 5 seconds
  actions: [
    {
      text: "Close",
      onClick: function () {
        removeToast(updatableToastId);
      },
    },
  ],
});
```

### 5. Elapsed Time Toast Example

```javascript
// For long-running operations, show a toast with elapsed time
const processId = "bug-generation-process";
startElapsedTimeUpdater(processId, "Generating bug description...", "info");

// Perform your long-running operation
generateBugDescription()
  .then(() => {
    // When complete, stop the timer and show a success message
    stopElapsedTimeUpdater(true, {
      message: "Bug description generated successfully!",
      type: "success",
      duration: 5000,
    });
  })
  .catch((error) => {
    // On error, stop the timer and show an error message
    stopElapsedTimeUpdater(true, {
      message: "Error generating bug description: " + error.message,
      type: "error",
      duration: 10000,
    });
  });
```

## Common Use Cases in AI Bug Tool

### In BugReportUI.html (Main App)

- Show toast notifications for form validation errors
- Display success/error messages after bug generation
- Show elapsed time during API calls
- Provide feedback after bug reporting

### In BugVerificationUI.html (Bug Verification)

- Display toast messages when fetching child bugs
- Show success/error messages when adding verification comments
- Notify users about AI summary generation progress

### In GenerateOnePager.html (One-Pager Generator)

- Display toast notifications when extracting bug IDs from a spreadsheet
- Show progress during one-pager generation
- Provide success/error messages after document generation

## Working with Server-Side Functions

For functions that call server-side Apps Script code, always show toast notifications to keep the user informed:

```javascript
// Before the server call
const processId = "fetch-child-bugs-process";
startElapsedTimeUpdater(processId, "Fetching child bugs...", "info");

// Make the server call
google.script.run
  .withSuccessHandler(function (result) {
    // On success, stop the elapsed time and show success message
    stopElapsedTimeUpdater(true, {
      message: `Found ${result.length} child bugs.`,
      type: "success",
      duration: 3000,
    });

    // Process the results
    displayChildBugs(result);
  })
  .withFailureHandler(function (error) {
    // On failure, stop the elapsed time and show error message
    stopElapsedTimeUpdater(true, {
      message: "Error fetching child bugs: " + error.message,
      type: "error",
      duration: 10000,
    });
  })
  .fetchChildBugDetailsWithCount(masterBugId);
```

## Best Practices

1. Always use toast notifications for important user feedback
2. Use appropriate toast types for different message categories:
   - `info` - General information
   - `success` - Successful operations
   - `warning` - Potential issues that don't prevent operation
   - `error` - Errors that prevent operation
3. Set appropriate durations based on message importance:
   - 3000-5000ms for simple success/info messages
   - 7000-10000ms for warnings or errors
   - null for messages requiring user action
4. For long-running operations, use elapsed time toasts to keep users informed
5. For critical errors, use persistent toasts with action buttons
6. Keep toast messages concise and clear
7. Always handle both success and error cases in server calls

## See Also

For a full interactive demo of all toast features, see the `ToastDemo.html` file.

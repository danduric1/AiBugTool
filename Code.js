// --- Toast Notification Service ---
/**
 * Toast Notification Service for AI Bug Tool
 * This service provides a standardized way to display toast notifications across the application
 * when called from server-side Google Apps Script.
 */

/**
 * Displays a toast notification.
 * @param {string} message - The text to display in the toast
 * @param {string} type - The type of toast ('info', 'success', 'warning', 'error')
 * @param {number|null} duration - The duration to show the toast in ms (null for persistent)
 * @param {string|null} toastId - Optional ID for the toast for later reference
 * @param {Array} actions - Optional array of action objects with text and onClick properties
 * @return {Object} Response object containing the toast ID
 */
function showToast(
  message,
  type = "info",
  duration = 5000,
  toastId = null,
  actions = []
) {
  // This function executes on the server side, but we'll return parameters
  // that will be used by the client-side toast service
  return {
    toastId: toastId || `toast-${Date.now()}`,
    message: message,
    type: type,
    duration: duration,
    actions: actions,
  };
}

/**
 * Removes a toast notification.
 * @param {string} toastId - The ID of the toast to remove
 * @return {Object} Response indicating success
 */
function removeToast(toastId) {
  return {
    success: true,
    toastId: toastId,
  };
}

/**
 * Updates an existing toast notification.
 * @param {string} toastId - The ID of the toast to update
 * @param {Object} options - Properties to update (message, type, duration, actions)
 * @return {Object} Response indicating success
 */
function updateToast(toastId, options = {}) {
  return {
    success: true,
    toastId: toastId,
    options: options,
  };
}

/**
 * Starts an elapsed time updater toast.
 * @param {string} processId - A unique ID for the process
 * @param {string} baseMessage - The base message to display
 * @param {string} type - The type of toast to display
 * @return {Object} Response containing the toast ID
 */
function startElapsedTimeUpdater(
  processId,
  baseMessage = "AI is working...",
  type = "info"
) {
  return {
    toastId: processId,
    baseMessage: baseMessage,
    type: type,
  };
}

/**
 * Stops an elapsed time updater toast.
 * @param {boolean} removeToast - Whether to remove the toast when stopping
 * @param {Object} finalToastOptions - Options for the final toast to display
 * @return {Object} Response indicating success
 */
function stopElapsedTimeUpdater(removeToast = true, finalToastOptions = null) {
  return {
    success: true,
    removeToast: removeToast,
    finalToastOptions: finalToastOptions,
  };
}

// --- Global Variables and Setup ---
// Ensure you have your Gemini API Key stored in Script Properties
// Go to Project Settings (Gear Icon) > Script Properties > Add Property
// Key: GEMINI_API_KEY, Value: YOUR_GEMINI_API_KEY
const GEMINI_API_KEY =
  PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
const GEMINI_FLASH_INPUT_COST_PER_MILLION_TOKENS = 0.35; // USD
const GEMINI_FLASH_OUTPUT_COST_PER_MILLION_TOKENS = 1.05; // USD

const PLATFORM_COMPONENT_IDS = [
  "1753515",
  "1593202",
  "1593148",
  "1593203",
  "1593255",
  "1593429",
  "1593253",
  "1593252",
  "1593403",
  "1593250",
  "1593251",
  "1593401",
  "1593273",
  "1593120",
  "1593254",
  "1593428",
  "1593200",
  "1593272",
  "1593201",
  "1593402",
  "1593121",
  "1593430",
  "1593220",
  "1616566",
  "1593256",
  "1593171",
  "1593257",
  "1593172",
  "1624452",
  "153255",
];
const PLATFORM_COMPONENT_PATHS = [
  "ChromeOS,Software,ARC++",
  "ChromeOS,Aluminium,Frameworks",
];
const TRIAGE_TEAM_LDAPS = [
  "adamac@google.com",
  "candaya@google.com",
  "ecox@google.com",
  "stevetu@google.com",
];

const HOTLIST_MAP = [
  /** ChromeOS Hotlists */
  { id: "355247", name: "dps_arc_proactive", type: "ChromeOS" },
  { id: "292879", name: "arc++", type: "ChromeOS" },
  { id: "357242", name: "ARC++ 3rdParty AppIssues", type: "ChromeOS" },
  /** AL Hotlists */
  {
    id: "6124440",
    name: "Appcompat-AL-1Papps",
    type: "AL",
    componentIds: ["1624352"],
  },
  {
    id: "6124438",
    name: "Appcompat-AL-3Papps",
    type: "AL",
    componentIds: ["1624252"],
  },
  {
    id: "6154106",
    name: "Appcompat-Clank-AL",
    type: "AL",
    appTypes: ["Web(Clank)"],
  },
  { id: "6375526", name: "Appcompat-AL-Platform", type: "AL" },
  { id: "6200091", name: "AL_appcompat_reviewed", type: "AL" },
];

const TC_NO_COLUMN = "TC No";
const RESULT_COLUMN = "Result";
const BUG_ID_COLUMN = "Bug Id";

const GOOGLE_SHEETS_SYSTEM_PROMPT = `
You are an expert Quality Assurance (QA) engineer specializing in software testing for games and applications. Your task is to analyze a given bug report and a set of test cases. Based on the bug's reproducibility, you need to identify which of the provided test cases are most likely to fail when attempting to verify this bug.

**Context:**
A bug has been marked as "Reproducible." This means the reported issue can be consistently observed.

**Input:**

1.  **Bug Description:**
    \`\`\`
    [Insert the detailed bug description and reproduction steps here from the BugVerificationUI]
    \`\`\`

2.  **Relevant Test Cases:**
    \`\`\`
    {{TEST_CASE_DATA}}
    \`\`\`
    * **Example Format for TEST_CASE_DATA content:**
        \`\`\`
        TC No    Tescase(go/cros-app-checklist)    Category    Description    Success Case
        TC-2     Clamshell : Find app in Play Store    Find/Install/Launch app from Play Store    Game App should be findable/installable/and launchable    App exists in Play Store, accessed from a Chromebook (no issue if working as intended)
        TC-73    Touchview : Splitscreen    Multi-window and multi-resume    App fully supports multi-resume mode...    App should supports split screen(Applicable). App content scales...
        \`\`\`

**Instructions:**

1.  Carefully read the **Bug Description** and understand the reported issue and its reproduction steps.
2.  Review each **Relevant Test Case** provided within the \`TEST_CASE_DATA\`.
3.  For each test case, determine if its "Success Case" would be violated or if the "Description" would be negatively impacted given the nature of the "Reproducible Bug Description."
4.  Focus only on test cases that are **highly likely** to fail directly because of this bug. Do not include any test cases that are unrelated or only tangentially affected.
5.  If a test case's success criteria clearly cannot be met due to the bug, it should be marked as failing.

**Output Format:**

List only the "TC No" (Test Case Number) of the test cases that are identified as failing, each on a new line. Do not include any additional text, explanations, or formatting. If no test cases are identified as failing, output "NONE".

Example Output:
TC-2
TC-73
NONE
`;

/**
 * Handles GET requests, serves the HTML UI.
 * @param {Object} e The event parameter for a GET request.
 * @return {HtmlOutput} The HTML page to render.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("BugReportUI")
    .evaluate()
    .setTitle("AI Bug Tool")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Use ALLOWALL for broader embedding if needed
}

/**
 * Includes a HTML file as content into another HTML file.
 * @param {string} filename The name of the HTML file to include.
 * @return {string} The content of the included HTML file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns the OAuth 2.0 access token for the current user.
 * This token is used by the client-side Google Picker API to authenticate Drive requests.
 * @return {string} The OAuth 2.0 access token.
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}

/**
 * Gets the email address of the active user running the script.
 * @return {string} The user's email address.
 * @return {{email: string, thumbnail: string}} An object with the user's email address and thumbnail URL.
 */
function getUser() {
  const user = Session.getActiveUser();
  const email = user.getEmail();

  let thumbnail = "https://placehold.co/40x40/cccccc/ffffff?text=User"; // Default fallback image UR
  try {
    const userInfo = AdminDirectory.Users.get(email, {
      viewType: "domain_public",
    });
    if (userInfo && userInfo.thumbnailPhotoUrl) {
      thumbnail = userInfo.thumbnailPhotoUrl;
    }
  } catch (e) {
    Logger.log(`Could not fetch user thumbnail for ${email}: ${e.message}`);
  }
  Logger.log(`Reporter Email: ${email}`);
  Logger.log(`Thumbnail: ${thumbnail}`);
  return { email: email, thumbnail: thumbnail };
}

/**
 * Helper function to make a call to the Gemini API.
 * @param {string} prompt The text prompt for the Gemini model.
 * @param {Object} generationConfig Configuration for the Gemini model (e.g., temperature, maxOutputTokens).
 * @return {Object} An object with status and either { data } or { error, errorDetails }.
 */
function callGeminiApi(prompt, generationConfig) {
  if (!GEMINI_API_KEY) {
    Logger.log("Error: GEMINI_API_KEY not found in Script Properties.");
    return {
      status: "Error: API Key not configured.",
      error: "Gemini API Key is missing in Script Properties.",
    };
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: generationConfig,
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  let response;
  let responseCode;
  let responseText;
  let data;

  try {
    Logger.log(
      `Calling Gemini API with prompt (truncated): ${prompt.substring(
        0,
        200
      )}...`
    );
    response = UrlFetchApp.fetch(url, options);
    responseCode = response.getResponseCode();
    responseText = response.getContentText("UTF-8");

    if (responseCode !== 200) {
      const error = `Error calling Gemini API: HTTP ${responseCode}. Response: ${responseText}`;
      Logger.log(error);
      let geminiErrorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error && errorJson.error.message) {
          geminiErrorDetails = errorJson.error.message;
        }
      } catch (parseError) {
        /* Ignore if error response isn't JSON */
      }
      return {
        status: `Error calling Gemini API: ${responseCode}`,
        error: `API Error ${responseCode}`,
        errorDetails: geminiErrorDetails,
      };
    }

    Logger.log(
      `Gemini API Response Raw Text (truncated): ${responseText.substring(
        0,
        500
      )}...`
    );
    data = JSON.parse(responseText);

    // Extract token usage
    if (data.usageMetadata) {
      const promptTokens = data.usageMetadata.promptTokenCount || 0;
      const completionTokens = data.usageMetadata.candidatesTokenCount || 0;
      tokensUsed = promptTokens + completionTokens;

      // Calculate cost
      const inputCost =
        (promptTokens / 1000000) * GEMINI_FLASH_INPUT_COST_PER_MILLION_TOKENS;
      const outputCost =
        (completionTokens / 1000000) *
        GEMINI_FLASH_OUTPUT_COST_PER_MILLION_TOKENS;
      costInUSD = inputCost + outputCost;
    }

    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0 &&
      data.candidates[0].content.parts[0].text
    ) {
      return {
        status: "Success",
        data: data.candidates[0].content.parts[0].text,
        tokensUsed: tokensUsed,
        costInUSD: costInUSD,
      };
    } else if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].finishReason &&
      data.candidates[0].finishReason !== "STOP"
    ) {
      const reason = data.candidates[0].finishReason;
      const safetyRatings = data.candidates[0].safetyRatings || "N/A";
      const error = `Gemini response generation stopped due to ${reason}. Safety Ratings: ${JSON.stringify(
        safetyRatings
      )}`;
      Logger.log(error);
      let partialText = "N/A";
      if (
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0 &&
        data.candidates[0].content.parts[0].text
      ) {
        partialText = data.candidates[0].content.parts[0].text;
      }
      Logger.log(`Partial text (if any): ${partialText}`);
      return {
        status: `Error generating content (${reason}).`,
        error: error,
        errorDetails: data,
        tokensUsed: tokensUsed,
        costInUSD: costInUSD,
      };
    } else if (data.promptFeedback && data.promptFeedback.blockReason) {
      const reason = data.promptFeedback.blockReason;
      const safetyRatings = data.promptFeedback.safetyRatings || "N/A";
      const error = `Gemini prompt blocked due to ${reason}. Safety Ratings: ${JSON.stringify(
        safetyRatings
      )}`;
      Logger.log(error);
      return {
        status: `Error: Prompt blocked (${reason}).`,
        error: error,
        errorDetails: data,
        tokensUsed: tokensUsed,
        costInUSD: costInUSD,
      };
    } else {
      const error = `Error from Gemini API. Unexpected response structure or empty candidates: ${JSON.stringify(
        data
      )}`;
      Logger.log(error);
      return {
        status: "Error: Unexpected API response.",
        error: error,
        errorDetails: data,
        tokensUsed: tokensUsed,
        costInUSD: costInUSD,
      };
    }
  } catch (error) {
    Logger.log(`Critical error in callGeminiApi function: ${error}`);
    Logger.log(`Stack trace: ${error.stack}`);
    return {
      status: "Script error.",
      error: `Script error: ${error.toString()}`,
      errorDetails: error,
      tokensUsed: 0,
      costInUSD: 0,
    };
  }
}

/**
 * Generates a bug report title and body using the Gemini API.
 * Incorporates user-provided device details into the body.
 * This function was previously named `generateBugReportForEdit`.
 * @param {Object} formData An object containing form data: { component, priority, command, deviceType, bugType, deviceDetails, applicationType }.
 * @return {Object} An object with status and either { title, body } or { error, errorDetails }.
 */
function generateBugDescription(formData) {
  // Destructure including the new fields
  const {
    component,
    priority,
    command,
    deviceType,
    deviceMode,
    bugType,
    deviceDetails,
    applicationType,
  } = formData;
  Logger.log(
    `Form Data received for description generation: ${JSON.stringify(formData)}`
  );

  // --- Input Validation ---
  if (
    !component ||
    !priority ||
    !command ||
    !deviceType ||
    !deviceMode ||
    !deviceDetails ||
    !bugType ||
    !applicationType
  ) {
    Logger.log("Error: Missing required form data for Gemini prompt.");
    return {
      status: "Error: Missing required data.",
      error:
        "Missing required form data fields (Description, Component, Device Details, Device Type, Bug Type, Application Type).",
    };
  }

  const generationConfig = {
    temperature: 1,
    maxOutputTokens: 1000,
  };

  const BUG_GENERATION_PROMPT = `
**Goal:** Generate a structured bug report description in JSON format based on a user command and other provided details, INCLUDING specific device information provided by the user.

**Inputs:**
* \`deviceType\`: The type of device (e.g., "AL", "ChromeOS", "Android"). Provided value: ${deviceType}
* \`applicationType\`: The type of application (e.g., "Web(Clank)", "Application"). Provided value: ${applicationType}
* \'deviceMode\': The mode of the device (e.g., "Clamshell", "Tablet", "Clamshell & Tablet"). Provided value: ${deviceMode}
* \`command\`: The user's raw description of the bug or issue. Provided value: ${command}
* \`component\`: The software component or application related to the bug. Provided value: ${component}
* \`priority\`: The priority level of the bug. Provided value: ${priority}
* \`deviceDetails\`: User-provided block of device information. Provided value:\n${deviceDetails}

**Output Requirements:**
1.  **Strict JSON Format:** MUST return ONLY a valid JSON object starting with \`{\` and ending with \`}\`. No markdown, no explanations outside the JSON. Ensure NO newline/whitespace immediately after the opening \`{\`.
2.  **JSON Structure:** Exactly two keys: \`title\` (string) and \`body\` (string).
3.  **Escaping:** Ensure all special characters within the final \`body\` string value (newlines, quotes) are correctly JSON escaped (e.g., \`\\n\`, \`\\"\`).

**Content Generation Guidelines:**

* **\`title\` Key Generation:** Format: [AL or Chromebook] > [Device Mode] > [App Name] - [Device Name Customization ID] - Concise summary of the bug from user command [AppCompat]\`
* **\`body\` Key Generation:** The \`body\` string MUST follow this structure PRECISELY:
    1.  Line 1: The generated title (matching the \`title\` key). The title should always try to include the device mode, device type, app name along with generated title.
    2.  Line 2: A single blank line (\`\\n\\n\` in JSON string).
    3.  **Lines 3 onwards:** INSERT the user-provided \`deviceDetails\` block EXACTLY AS PROVIDED in the input.
    4.  After the deviceDetails block: A single blank line (\`\\n\\n\` in JSON string).
    5.  Following Sections: Include literal text "Steps to Reproduce:", "Expected Behavior:", "Observed Behavior:".
    6.  Steps/Expected/Observed Content: Generate professional, detailed, clear content for these sections based on the user \`command\`, formatted with newlines escaped as \`\\n\`. Keep it concise if the command is vague.

**Example of REQUIRED JSON structure (Content varies based on inputs):**
\`\`\`json
{
  "title": "[AL or Chromebook] > [Device Mode] > [App Name] - [Device Name Customization ID] - Sample Bug Title [AppCompat].",
  "body": "Google TV: Inconsistent Keyboard Navigation during Video Playback

- Google Chrome: 137.0.7104.0 (Official Build) (64-bit)
- OS: Android 16; Build/ZL1A.250407.001; 36; Baklava
- App name: Google TV (PWA)
- Package Name/URL: com.google.android.videos
- App Version: 4.39.3031.737984647.2-release
- App Configuration: resizable

Steps to Reproduce:

1. Launch the application on Google TV.
2. Start playing a video.
3. While the video is playing, press the spacebar key on the keyboard.
4. Observe the behavior of the focus and playback controls.
5. Note the behavior of arrow keys.

Expected Behavior:

1. Pressing the spacebar key should toggle the play/pause state of the video, regardless of the currently focused UI element.
2. The focus should remain on the currently active control (play/pause or rewind/forward) after the spacebar is pressed.
3. Arrow keys should consistently control rewind and forward functionality

Observed Behavior:

1. When the video is playing, and the focus is on the \"rewind 10secs\" button, pressing the spacebar does not toggle play/pause.
2. The user must manually press the tab key to shift focus to the play/pause icon and then press spacebar to toggle playback.
3. Arrow keys correctly rewind and forward."
}
\`\`\`

Examples of Title [STRICT FORMAT RULE]:
- [AL] > [Clamshell] > [Crota360] - Free Fire - Content stretched on resize [AppCompat]
- [AL] > > [Tablet] >[Crota360] - Free Fire - Trackpad/mouse click does not work in game play [AppCompat]
- [ChromeOS] > [Clamshell & Tablet] >[Crota360] - Free Fire - Hover states not observed in MONOPOLY GO! UI [AppCompat]

**TITLE** - Always keep the title descriptive. Always mention the core issue due to which the bug is occured. If the bug is occured because of Back key, always mention it. Include App/Game name, device name or Customization ID in the title.
**REMINDER:** Generate ONLY the JSON. Insert the provided \`deviceDetails\` directly into the body structure as specified. Ensure correct JSON escaping for the final \`body\` string.
`;

  const geminiResponse = callGeminiApi(BUG_GENERATION_PROMPT, generationConfig);

  if (geminiResponse.status !== "Success") {
    return {
      status: geminiResponse.status,
      error: geminiResponse.error,
      errorDetails: geminiResponse.errorDetails,
      tokens: geminiResponse.tokensUsed,
      cost: geminiResponse.costInUSD,
    };
  }

  let rawJsonResponseText = geminiResponse.data;
  Logger.log(
    `Extracted text part (length ${rawJsonResponseText.length}): ${rawJsonResponseText}`
  );

  // Existing parsing logic for markdown fence and trimming
  if (rawJsonResponseText.startsWith("```json")) {
    rawJsonResponseText = rawJsonResponseText.substring("```json".length);
  }
  if (rawJsonResponseText.endsWith("```")) {
    rawJsonResponseText = rawJsonResponseText.substring(
      0,
      rawJsonResponseText.length - "```".length
    );
  }
  rawJsonResponseText = rawJsonResponseText.trim();

  Logger.log(
    `Cleaned and trimmed text for JSON.parse (length ${rawJsonResponseText.length}): ${rawJsonResponseText}`
  );

  if (
    !rawJsonResponseText.startsWith("{") ||
    !rawJsonResponseText.endsWith("}")
  ) {
    const error = `Error preparing JSON: Final string does not start with '{' or end with '}'. Got: ${rawJsonResponseText}`;
    Logger.log(error);
    return {
      status: "Error processing generated description.",
      error: error,
      errorDetails: `Raw response part: ${geminiResponse.data}`,
      tokens: geminiResponse.tokensUsed,
      cost: geminiResponse.costInUSD,
    };
  }

  try {
    const jsonResponse = JSON.parse(rawJsonResponseText);
    Logger.log("Successfully parsed the inner JSON.");

    if (
      typeof jsonResponse.title === "string" &&
      typeof jsonResponse.body === "string"
    ) {
      return {
        status: "Description generated.",
        title: jsonResponse.title,
        body: jsonResponse.body,
        tokens: geminiResponse.tokensUsed,
        cost: geminiResponse.costInUSD,
      };
    } else {
      const error = `Error: Parsed JSON object is missing 'title' or 'body' string properties. Parsed: ${JSON.stringify(
        jsonResponse
      )}`;
      Logger.log(error);
      return {
        status: "Error: Invalid JSON content.",
        error: error,
        errorDetails: `Parsed: ${JSON.stringify(jsonResponse)}`,
        tokens: geminiResponse.tokensUsed,
        cost: geminiResponse.costInUSD,
      };
    }
  } catch (e) {
    const error = `Error parsing cleaned JSON text: ${e.message}. Attempted to parse: "${rawJsonResponseText}"`;
    Logger.log(error);
    Logger.log(`Stack trace: ${e.stack}`);
    return {
      status: "Error parsing generated description.",
      error: error,
      errorDetails:
        e.toString() + `\nAttempted parse: "${rawJsonResponseText}"`,
      tokens: 0,
      cost: 0,
    };
  }
}

/**
 * Generates an AI-powered summary of bug report content using the Gemini API.
 * @param {string|string[]} bugContents The detailed content of the bug report, can be a string or an array of strings.
 * @return {Object} An object with status and either { summary } or { error, errorDetails }.
 */
function generateAISummary(bugContents) {
  Logger.log(`Bug Contents received for summary generation: ${bugContents}`);

  // --- Input Validation ---
  if (
    !bugContents ||
    (Array.isArray(bugContents) && bugContents.length === 0)
  ) {
    Logger.log("Error: Missing bug contents for Gemini prompt.");
    return {
      status: "Error: Missing bug content.",
      error: "Bug content is empty.",
    };
  }

  let contentToSummarize = Array.isArray(bugContents)
    ? bugContents.join("\n")
    : bugContents; // Changed to '\n' for prompt readability

  // --- Gemini Prompt ---
  const prompt = `
**Goal:** Provide a concise, clear, and professional summary of the following bug report content. The summary should highlight the core issue, observed behavior, and overall impact. Additionally, identify and extract the "Steps to Reproduce", "Expected result", "Observed result" if they are present in the provided content.

**Bug Report Content:**
${contentToSummarize}

**Output Requirements:**
* **Format:** The output MUST start with the overall summary.
* **Separation:** After the summary, include a single blank line.
* **Steps to Reproduce Section:** If "Steps to Reproduce:" are clearly identifiable in the content, create a new section starting with "Steps to Reproduce:", "Expected results", "Observed results".
* **Steps Formatting:** Each step within "Steps to Reproduce:" MUST be presented as a numbered list (e.g., "1. First step\\n2. Second step").
* **Content:**
    * **Summary:** Focus on the core issue, observed behavior, and overall impact.
    * **Steps to Reproduce:** Extract these accurately and concisely from the provided bug content. If no "Steps to Reproduce" are found, omit that section entirely. Also provide the expected results and observed results as well.
* Provide only the summary text and formatted steps. Do NOT include any conversational filler, greetings, or markdown formatting like JSON blocks.
* The entire output (summary and steps) should be a plain string, concise and to the point.
`;

  const generationConfig = {
    temperature: 0.5, // Lower temperature for more focused summary
    maxOutputTokens: 200, // Adjust max tokens for concise summary
  };

  const geminiResponse = callGeminiApi(prompt, generationConfig);

  if (geminiResponse.status !== "Success") {
    return {
      status: geminiResponse.status,
      error: geminiResponse.error,
      errorDetails: geminiResponse.errorDetails,
      tokens: geminiResponse.tokensUsed,
      cost: geminiResponse.costInUSD,
    };
  }

  const summaryText = geminiResponse.data.trim();
  Logger.log(`Generated Summary Text: ${summaryText}`);
  return {
    status: "Summary generated.",
    summary: summaryText,
    tokens: geminiResponse.tokensUsed,
    cost: geminiResponse.costInUSD,
  };
}

/**
 * Orchestrates the process of identifying failing test cases using AI
 * and updating the Google Sheet with the results.
 * This function would be called from the client-side (javascript.html)
 * when the "Reproducible" button is pressed.
 *
 * @param {string} bugDescription The detailed description of the bug.
 * @param {string} googleSheetUrl The URL of the Google Sheet containing the test plan.
 * @param {string} currentBugId The ID of the bug being verified.
 * @return {Object} An object indicating the status of the operation.
 */
function updateSheetForReproducibleBug(
  bugDescription,
  googleSheetUrl,
  currentBugId
) {
  Logger.log("Starting updateSheetForReproducibleBug function...");
  Logger.log(`Bug ID: ${currentBugId}, Sheet URL: ${googleSheetUrl}`);

  // --- Step 0: Access the Google Sheet and Get Test Case Data ---
  let sheet;
  let testCaseData = "";
  try {
    const spreadsheet = SpreadsheetApp.openByUrl(googleSheetUrl);
    // IMPORTANT: Replace "Games Test Plan" with the actual name of your sheet tab
    sheet = spreadsheet.getSheetByName("Games Test Plan");

    if (!sheet) {
      Logger.log(
        "Error: Sheet tab 'Games Test Plan' not found in the provided URL."
      );
      return {
        status: "Error",
        message:
          "Google Sheet tab 'Games Test Plan' not found. Please check the name or the link.",
      };
    }

    const range = sheet.getDataRange();
    const values = range.getValues(); // Get all data as a 2D array

    // Convert the 2D array of test case data into a plain text string
    // suitable for the AI prompt. Join rows by newline and columns by tab.
    testCaseData = values.map((row) => row.join("\t")).join("\n");
    Logger.log(`Fetched ${values.length} rows from Google Sheet.`);
  } catch (e) {
    Logger.log(`Error accessing or reading Google Sheet: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return {
      status: "Error",
      message: `Failed to access Google Sheet: ${e.message}. Ensure you have edit access.`,
    };
  }

  const generationConfig = {
    temperature: 0.5,
    maxOutputTokens: 200,
  };

  const GOOGLE_SHEETS_SYSTEM_PROMPT = `
You are an expert Quality Assurance (QA) engineer specializing in software testing for games and applications. Your task is to analyze a given bug report and a set of test cases. Based on the bug's reproducibility, you need to identify which of the provided test cases are most likely to fail when attempting to verify this bug.

**Context:**
A bug has been marked as "Reproducible." This means the reported issue can be consistently observed.

**Input:**

1.  **Bug Description:**
    \`\`\`
    ${bugDescription}
    \`\`\`

2.  **Relevant Test Cases:**
    \`\`\`
    ${testCaseData}
    \`\`\`
    * **Example Format for TEST_CASE_DATA content:**
        \`\`\`
        TC No    Tescase(go/cros-app-checklist)    Category    Description    Success Case
        TC-2     Clamshell : Find app in Play Store    Find/Install/Launch app from Play Store    Game App should be findable/installable/and launchable    App exists in Play Store, accessed from a Chromebook (no issue if working as intended)
        TC-73    Touchview : Splitscreen    Multi-window and multi-resume    App fully supports multi-resume mode...    App should supports split screen(Applicable). App content scales...
        \`\`\`

**Instructions:**

1.  Carefully read the **Bug Description** and understand the reported issue and its reproduction steps.
2.  Review each **Relevant Test Case** provided within the \`TEST_CASE_DATA\`.
3.  For each test case, determine if its "Success Case" would be violated or if the "Description" would be negatively impacted given the nature of the "Reproducible Bug Description."
4.  Focus only on test cases that are **highly likely** to fail directly because of this bug. Do not include any test cases that are unrelated or only tangentially affected.
5.  If a test case's success criteria clearly cannot be met due to the bug, it should be marked as failing.

**Output Format:**

List only the "TC No" (Test Case Number) of the test cases that are identified as failing, each on a new line. Do not include any additional text, explanations, or formatting. If no test cases are identified as failing, output "NONE".

Example Output:
TC-2
TC-73
NONE
`;
  // --- 2. Call the Modularized Gemini API ---
  Logger.log("Calling Gemini API to identify failing test cases...");
  const aiResponse = callGeminiApi(
    GOOGLE_SHEETS_SYSTEM_PROMPT,
    generationConfig
  );

  if (aiResponse.status !== "Success") {
    Logger.log(`AI call failed: ${JSON.stringify(aiResponse)}`);
    return {
      status: "Error",
      message: `Failed to get AI analysis: ${aiResponse.error}`,
      tokens: aiResponse.tokensUsed,
      cost: aiResponse.costInUSD,
    };
  }

  const aiOutputText = aiResponse.data;
  Logger.log(`AI identified: \n${aiOutputText}`);

  // --- 3. Parse AI's Response ---
  let failingTCs = [];
  if (aiOutputText && aiOutputText.toUpperCase().trim() !== "NONE") {
    failingTCs = aiOutputText
      .split("\n")
      .map((tc) => tc.trim())
      .filter((tc) => tc.length > 0);
  }
  Logger.log(`Parsed failing TC numbers: ${JSON.stringify(failingTCs)}`);

  // --- 4. Update Google Sheet ---
  // The sheet object is already available from Step 0
  try {
    const range = sheet.getDataRange();
    const values = range.getValues(); // Re-fetch to ensure we have the latest state if other scripts modified it

    // Assuming the first row is the header row
    const header = values[0];
    const tcNoColumnIndex = header.indexOf(TC_NO_COLUMN);
    const resultColumnIndex = header.indexOf(RESULT_COLUMN);
    const bugIdColumnIndex = header.indexOf(BUG_ID_COLUMN);

    if (
      tcNoColumnIndex === -1 ||
      resultColumnIndex === -1 ||
      bugIdColumnIndex === -1
    ) {
      Logger.log(
        "Error: Required columns (TC No, Result, Bug Id) not found in sheet header."
      );
      return {
        status: "Error",
        message:
          "Required columns (TC No, Result, Bug Id) not found in your test plan sheet.",
        tokens: aiResponse.tokensUsed,
        cost: aiResponse.costInUSD,
      };
    }

    let updatesMade = 0;
    for (let i = 1; i < values.length; i++) {
      // Start from 1 to skip header row
      const rowTcNo = values[i][tcNoColumnIndex];

      if (failingTCs.includes(rowTcNo)) {
        // Update 'Result' to 'Fail' and 'Bug Id' for identified failing test cases
        values[i][resultColumnIndex] = "Fail";
        let existingBugIds = values[i][bugIdColumnIndex]
          ? String(values[i][bugIdColumnIndex]).trim()
          : "";
        let updatedBugIds = [];

        // Add existing bug IDs (if any) to the array, filtering out empty strings
        if (existingBugIds) {
          updatedBugIds = existingBugIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        }

        // Add the new currentBugId if it's not already present
        if (!updatedBugIds.includes(`b/${currentBugId}`)) {
          updatedBugIds.push(`b/${currentBugId}`);
        }

        // Join unique bug IDs back into a comma-separated string
        values[i][bugIdColumnIndex] = updatedBugIds.join(", ");
        updatesMade++;
      }
    }

    if (updatesMade > 0) {
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values); // Write all modified data back
      Logger.log(
        `Successfully updated Google Sheet. ${updatesMade} test cases marked as Fail for Bug ID: ${currentBugId}`
      );
      return {
        status: "Success",
        message: `Updated ${updatesMade} test cases to 'Fail' for Bug ID ${currentBugId}.`,
        tokens: aiResponse.tokensUsed,
        cost: aiResponse.costInUSD,
      };
    } else {
      Logger.log(
        "No test cases identified as failing by AI, or no updates required."
      );
      return {
        status: "Success",
        message: "No test cases were updated as 'Fail'.",
        tokens: aiResponse.tokensUsed,
        cost: aiResponse.costInUSD,
      };
    }
  } catch (e) {
    Logger.log(`Error updating Google Sheet: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return {
      status: "Error",
      message: `Failed to update Google Sheet: ${e.message}`,
      tokens: 0,
      cost: 0,
    };
  }
}

/**
 * Files a bug. This function was previously named `fileBug`.
 * Assumes the BuganizerApp library service is enabled and configured.
 * @param {Object} bugData An object containing bug details: { title, body, deviceType, applicationType, componentId, priority, bugType, masterBugs, hotlistIds }.
 * @return {Object} An object with status and either { buganizerId } or { error }.
 */
function reportBug(bugData) {
  const {
    title,
    body,
    deviceType,
    applicationType,
    componentId,
    priority,
    bugType,
    masterBugs,
    hotlistNames,
  } = bugData;
  Logger.log(
    `Attempting to file bug. Component: ${componentId}, Prio: ${priority}, Type: ${bugType}, Device: ${deviceType}, AppType: ${applicationType}, Masters: ${masterBugs}, Hotlist Names (array): ${JSON.stringify(
      hotlistNames
    )}`
  );

  // Basic validation
  if (
    !title ||
    !body ||
    !componentId ||
    !priority ||
    !bugType ||
    !deviceType ||
    !applicationType
  ) {
    Logger.log("Error: Missing required data for filing bug.");
    return {
      success: false,
      message: "Missing required fields for Buganizer.",
    };
  }

  // Process Blocking Bugs string
  let blockingIds = [];
  if (
    masterBugs &&
    typeof masterBugs === "string" &&
    masterBugs.trim() !== ""
  ) {
    blockingIds = masterBugs
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "");
    Logger.log(`Parsed blocking IDs: ${JSON.stringify(blockingIds)}`);
  }

  let hotlistIdsToSet = [];
  if (Array.isArray(hotlistNames) && hotlistNames.length > 0) {
    hotlistNames.forEach((name) => {
      // Ensure the name is a non-empty string before looking it up
      if (typeof name === "string" && name.trim() !== "") {
        const hotlist = HOTLIST_MAP.find((h) => h.name === name.trim());
        if (hotlist) {
          hotlistIdsToSet.push(hotlist.id);
        } else {
          Logger.log(
            `Warning: Hotlist name '${name}' not found in HOTLIST_MAP. It will not be added.`
          );
        }
      }
    });
  }

  try {
    const { email } = getUser();
    const fullSummary = `${title}`;
    Logger.log(`Calculated Full Summary: ${fullSummary}`);

    // This part assumes you have a `BuganizerApp` library set up in your Google Apps Script project.
    // If not, this call will fail. You would need to add and configure this library.
    // E.g., go to your Apps Script project, navigate to "Libraries" (on the left panel),
    // and add the appropriate Buganizer API library.
    let bug = BuganizerApp.createBug(componentId, fullSummary, email, body);
    Logger.log(`Bug object created (initial).`);

    bug.setPriority(priority);
    bug.setType(bugType);

    if (hotlistIdsToSet.length > 0) {
      bug.setHotlistIds(hotlistIdsToSet);
      Logger.log(`Set hotlist IDs: ${hotlistIdsToSet.join(", ")}`);
    } else {
      Logger.log("No hotlist IDs to set.");
    }

    bug.setAssignee("");

    if (blockingIds.length > 0) {
      bug.setBlocking(blockingIds);
      Logger.log(`Set blocking IDs: ${blockingIds.join(", ")}`);
    }
    bug.setCC([]);
    bug.save();

    const bugId = bug.getId();
    if (bugId) {
      Logger.log(`Bug filed successfully with ID: ${bugId}`);
      // Client-side expects { success: true, message: ..., bugId, bugUrl }
      // Let's construct a placeholder URL as BuganizerApp doesn't directly provide it
      const bugUrl = `https://b.corp.google.com/issues/${bugId}`;
      return {
        success: true,
        message: `Bug successfully reported! Bug ID: <a href="${bugUrl}" target="_blank">${bugId}</a>`,
        bugId: bugId,
        bugUrl: bugUrl,
      };
    } else {
      Logger.log(`Error: Bug saved but ID could not be retrieved.`);
      return {
        success: false,
        message: "Bug may have been created but ID was not returned.",
      };
    }
  } catch (e) {
    Logger.log(`Error filing bug in Buganizer: ${e}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return {
      success: false,
      message: `Error filing bug: ${e.toString()}`,
      errorDetails: e.toString(),
    };
  }
}

/**
 * Fetches only the count of child bugs for a given master bug ID.
 * @param {string} masterBugId The ID of the master bug.
 * @returns {number} The number of child bugs.
 */
function fetchChildBugCount(masterBugId) {
  Logger.log(
    `Attempting to fetch child bug count for master bug: ${masterBugId}`
  );
  if (!masterBugId) {
    Logger.log(
      "Error: No master bug ID provided for fetching child bug count."
    );
    return 0;
  }

  try {
    const masterBug = BuganizerApp.getBug(masterBugId);
    if (masterBug) {
      const childBugIds = masterBug.getDependsOn();
      Logger.log(`Found ${childBugIds.length} child bug IDs for count.`);
      return childBugIds.length;
    } else {
      Logger.log(`Master bug ${masterBugId} not found for count.`);
      return 0;
    }
  } catch (e) {
    Logger.log(
      `Error fetching child bug count for ${masterBugId}: ${e.toString()}`
    );
    Logger.log(`Stack trace: ${e.stack}`);
    return 0;
  }
}

/**
 * Fetches child bugs for a given master bug ID from Buganizer.
 * This function is similar to the original fetchChildBugs but named differently
 * to be called after the count is determined.
 * @param {string} masterBugId The ID of the master bug.
 * @returns {Array<Object>} An array of child bug objects, each with id, title, contents, status,
 * componentId, componentPath, history, bugType, and isPlatform.
 */
function fetchChildBugDetailsWithCount(masterBugId) {
  // Renamed for clarity in workflow
  Logger.log(
    `Attempting to fetch child bug details for master bug: ${masterBugId}`
  );
  if (!masterBugId) {
    Logger.log(
      "Error: No master bug ID provided for fetching child bug details."
    );
    return [];
  }

  try {
    const masterBug = BuganizerApp.getBug(masterBugId);
    if (masterBug) {
      const childBugIds = masterBug.getDependsOn();
      Logger.log(`Found child bug IDs: ${childBugIds}`);
      const formattedChildBugs = childBugIds
        .map((bugId) => {
          const childBugDetails = fetchBugDetails(bugId);
          if (childBugDetails) {
            return childBugDetails;
          } else {
            Logger.log(`Child bug ${bugId} details not found, skipping.`);
            return null;
          }
        })
        .filter((bug) => bug !== null); // Filter out any null entries

      Logger.log(
        `Found ${
          formattedChildBugs.length
        } valid child bugs for ${masterBugId}: ${JSON.stringify(
          formattedChildBugs
        )}`
      );
      return formattedChildBugs;
    } else {
      Logger.log(`Master bug ${masterBugId} not found.`);
      return [];
    }
  } catch (e) {
    Logger.log(
      `Error fetching child bug details for ${masterBugId}: ${e.toString()}`
    );
    Logger.log(`Stack trace: ${e.stack}`);
    return [];
  }
}

/**
 * Checks if a given component path starts with any of the defined platform paths.
 * @param {string} componentPath The full path of the component (e.g., "ChromeOS > Software > ARC++ > UI").
 * @param {string[]} platformPaths An array of platform path prefixes (e.g., ["ChromeOS > Software > ARC++"]).
 * @returns {boolean} True if the componentPath starts with any platform path, false otherwise.
 */
function isPathStartingWithAny(componentPath) {
  if (!componentPath) {
    return false;
  }
  for (const platformPrefix of PLATFORM_COMPONENT_PATHS) {
    if (
      componentPath === platformPrefix ||
      componentPath.startsWith(platformPrefix)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Fetches the details of a single bug from Buganizer.
 * @param {string} bugId The ID of the bug to fetch.
 * @returns {Object|null} An object containing bug details (id, title, contents, componentId, componentPath, history, bugType, isPlatform), or null if not found/error.
 */
function fetchBugDetails(bugId) {
  Logger.log(`Attempting to fetch details for bug: ${bugId}`);
  if (!bugId) {
    Logger.log("Error: No bug ID provided for fetching details.");
    return null;
  }

  try {
    const bug = BuganizerApp.getBug(bugId);
    if (bug) {
      const componentId = bug.getComponentId();
      const componentPath = bug.getComponentPath();
      Logger.log(`Found bug: ${bug.getType()}`);
      return {
        id: bug.getId(),
        title: bug.getSummary(),
        contents: bug.getContents(),
        componentId: componentId,
        componentPath: componentPath,
        history: bug.getHistory(),
        bugType: bug.getType(),
        status: bug.getIssueStatus(),
        isPlatform:
          (typeof PLATFORM_COMPONENT_IDS !== "undefined" &&
            PLATFORM_COMPONENT_IDS.includes(componentId)) ||
          isPathStartingWithAny(componentPath.join(",")),
      };
    } else {
      Logger.log(`Bug ${bugId} not found.`);
      return null;
    }
  } catch (e) {
    Logger.log(`Error fetching bug details for ${bugId}: ${e.toString()}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return null; // Return null on error
  }
}

/**
 * Adds a comment to an existing bug in Buganizer.
 * @param {string} bugId The ID of the bug to comment on.
 * @param {string} commentText The text of the comment to add.
 * @returns {Object} An object indicating success or failure.
 */
function addBugComment(
  bugId,
  commentText,
  bugDescription,
  googleSheetUrl,
  masterBugId,
  isReproducible
) {
  Logger.log(`Attempting to add comment to bug: ${bugId}`);
  if (!bugId || !commentText) {
    Logger.log("Error: Bug ID or comment text missing for adding comment.");
    return { success: false, error: "Bug ID or comment text missing." };
  }

  try {
    const bug = BuganizerApp.getBug(bugId);
    if (bug) {
      bug.setNote(commentText);
      bug.save(); // Save changes after adding comment
      Logger.log(`Comment added to bug ${bugId} successfully.`);
      let sheetResponse = null;
      if (googleSheetUrl && isReproducible)
        sheetResponse = updateSheetForReproducibleBug(
          bugDescription,
          googleSheetUrl,
          bugId
        );
      return {
        success: true,
        message: `Comment added to bug ${bugId}.`,
        tokens: sheetResponse ? sheetResponse.tokens : 0,
        cost: sheetResponse ? sheetResponse.cost : 0,
      };
    } else {
      Logger.log(`Bug ${bugId} not found for adding comment.`);
      return {
        success: false,
        error: `Bug ${bugId} not found.`,
        tokens: 0,
        cost: 0,
      };
    }
  } catch (e) {
    Logger.log(`Error adding comment to bug ${bugId}: ${e.toString()}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return {
      success: false,
      error: `Error adding comment: ${e.toString()}`,
      tokens: 0,
      cost: 0,
    };
  }
}

/**
 * Stores the user's dark mode preference.
 * @param {boolean} isDarkMode True if dark mode is enabled, false otherwise.
 */
function setDarkModePreference(isDarkMode) {
  PropertiesService.getUserProperties().setProperty(
    "DARK_MODE_ENABLED",
    isDarkMode.toString()
  );
  Logger.log(`Dark mode preference set to: ${isDarkMode}`);
}

/**
 * Retrieves the user's dark mode preference.
 * @returns {boolean} True if dark mode is enabled, false otherwise.
 */
function getDarkModePreference() {
  const preference =
    PropertiesService.getUserProperties().getProperty("DARK_MODE_ENABLED");
  const isDarkMode = preference === "true";
  Logger.log(`Dark mode preference retrieved: ${isDarkMode}`);
  return isDarkMode;
}

/**
 * Fetches hotlists based on component/app type.
 * @param {string} componentId The ID of the selected component.
 * @param {string} deviceType The selected device type.
 * @param {string} applicationType The selected application type.
 * @returns {Array<string>} An array of hotlist names that match the criteria.
 */
function fetchHotlistSuggestions(componentId, deviceType, applicationType) {
  Logger.log(`fetchHotlistSuggestions called with:`);
  Logger.log(`  componentId: ${componentId}`);
  Logger.log(`  deviceType: ${deviceType}`);
  Logger.log(`  applicationType: ${applicationType}`);

  const relevantHotlists = HOTLIST_MAP.filter((hotlist) => {
    let matches = true;
    // Filter by device type
    if (hotlist.type && deviceType && hotlist.type !== deviceType) {
      matches = false;
    }
    // Filter by component ID
    // Note: componentIds in HOTLIST_MAP are strings, ensure client sends string
    if (
      hotlist.componentIds &&
      componentId &&
      !hotlist.componentIds.includes(componentId)
    ) {
      matches = false;
    }
    // Filter by application type
    if (
      hotlist.appTypes &&
      applicationType &&
      !hotlist.appTypes.includes(applicationType)
    ) {
      matches = false;
    }
    return matches;
  });
  const result = relevantHotlists.map((h) => h.name);
  Logger.log(`  Returning hotlists: ${JSON.stringify(result)}`);
  return result;
}

function fetchBugIdsFromSheet(sheetUrl) {
  try {
    // Call the generateOnePagerDoc function from your library.
    // 'OnePagerLib' should match the identifier you set for your library.
    const result = OnePagerLib.processSheetDataAndCallAI(sheetUrl);
    return result;
  } catch (e) {
    Logger.log(`Error in fetchBugIdsFromSheet: ${e.message}`);
    // Return a structured error response to the client
    return {
      status: "error",
      message: `Server error: ${e.message}. Please check Apps Script logs for more details.`,
    };
  }
}

/**
 * Calls the generateOnePagerDoc function from the external library.
 * This function acts as a wrapper for the client-side calls.
 *
 * IMPORTANT: Ensure 'Generate1pagerLibrary' is the actual Identifier
 * you used when adding your library project (the one with the generateOnePagerDoc function)
 * under Project Settings > Libraries in THIS UI project.
 *
 * @param {string} bugIdsString A comma-separated string of Bug IDs.
 * @param {string} targetDocUrl The full URL of the Google Document.
 * @returns {{status: string, message: string}} An object indicating the outcome.
 */
function generateOnePagerDocWrapper(formInput) {
  // const {bugIdsString,
  //             appNameString,
  //             appVersionString,
  //             deviceNameString,
  //             deviceOsVersionString,
  //             summaryOfTestingString,
  //             priorityChromeOSAppBugsString,
  //             pixelTabletAppBugsString,
  //             chromeOSFeatureRequestsString,
  //             targetDocUrl} = formInput;
  try {
    // Call the generateOnePagerDoc function from your library.
    // 'OnePagerLib' should match the identifier you set for your library.
    const result = OnePagerLib.generateOnePagerDoc(formInput);
    return result;
  } catch (e) {
    Logger.log(`Error in generateOnePagerDocWrapper: ${e.message}`);
    // Return a structured error response to the client
    return {
      status: "error",
      message: `Server error: ${e.message}. Please check Apps Script logs for more details.`,
    };
  }
}

/**
 * Uploads a Base64 encoded GIF file to a specific Google Drive folder.
 * The file will be named after the bug ID.
 * @param {string} base64Data The Base64 encoded content of the GIF file.
 * @param {string} fileName The desired name for the file (e.g., bug ID).
 * @returns {object} An object indicating success or failure.
 */
function uploadGifToDrive(base64Data, fileName) {
  const FOLDER_ID = "1-7MUdPbUGjm8um_hPkLhyNt5wqa92AVu"; // Specific Drive folder ID from your request
  try {
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(
      decodedData,
      MimeType.GIF,
      fileName + ".gif"
    ); // Name with .gif extension

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const uploadedFile = folder.createFile(blob);

    Logger.log(
      `GIF uploaded: ${uploadedFile.getName()} (${uploadedFile.getId()}) to folder ${folder.getName()}`
    );
    return {
      status: "success",
      message: "GIF uploaded successfully!",
      fileId: uploadedFile.getId(),
      fileName: uploadedFile.getName(),
    };
  } catch (e) {
    Logger.log(`Error uploading GIF: ${e.message}`);
    return { status: "error", message: `Failed to upload GIF: ${e.message}` };
  }
}

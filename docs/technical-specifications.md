# HandyAI Report - Technical Specifications

## 1. Project Overview

HandyAI Report is a client-side web application designed to help handymen and field technicians create professional work reports. The user captures photos of their work, dictates notes, and leverages the Google Gemini API to generate, refine, and finalize a client-facing report. The entire experience is designed to be fast, intuitive, and mobile-friendly.

The application operates entirely in the browser, with no backend for state persistence at this stage. This makes it a powerful, self-contained tool that can be used offline after the initial load.

## 2. Core Technologies

- **UI Framework:** React 19 (using `react` and `react-dom`)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (loaded via CDN)
- **AI Integration:** `@google/genai` for interacting with the Gemini family of models.
- **Markdown Rendering:** `react-markdown` with `remark-gfm` for tables.
- **Client-Side PDF Generation:** `html2canvas` and `jspdf`.

## 3. Application Flow & State Management

The application is architected as a single-page application (SPA) with a linear, multi-stage workflow. State is managed entirely on the client within the main `App.tsx` component using React's `useState` hooks. This centralized state management makes the flow predictable and easy to debug.

### 3.1. Simulating a Backend: "Mechanized Experiences"

The app provides a seamless, multi-step user experience that feels like a stateful, backend-driven application. This is achieved by:

1.  **Centralized State:** The top-level `App.tsx` component holds all critical state variables, including `stage`, `images`, `dictatedText`, `report`, and `chatHistory`.
2.  **Prop Drilling:** State and state-setting functions are passed down to child components as props. This is a deliberate choice for this application's scale, avoiding the complexity of a state management library like Redux or Zustand.
3.  **Stateful Transitions:** The `AppStage` enum (`CAPTURE`, `GENERATING`, `REFINE`, `PREVIEW`) is the primary driver of the UI. Changing the `stage` variable re-renders the entire UI to show the correct components and information for that step in the process. All data (like captured images and notes) is preserved in state as the user moves between stages.

This approach creates a cohesive "session" for the user. Although the data is lost on a hard refresh (as there's no backend), the in-app experience is fluid and mimics a persistent process. This is ideal for rapid prototyping and user testing before committing to a backend architecture.

### 3.2. The Stages of the Application:

1.  **`AppStage.CAPTURE`**:
    - **State:** `images`, `dictatedText`, `error`.
    - **Components:** `CameraCapture`, `PhotoGallery`, `Dictation`.
    - **Logic:** The user takes or uploads photos and can optionally dictate notes. The `images` array in state is updated with Base64-encoded strings. The user selects which photos to include.
    - **Transition:** Clicking "Generate Report" triggers the `handleGenerateReport` function.

2.  **`AppStage.GENERATING`**:
    - **State:** `isLoading`.
    - **Components:** `ReportGenerator` (showing a loader).
    - **Logic:** This is a transitional stage. The `generateInitialReport` service is called with the selected images and notes.
    - **Transition:** On a successful API response, the `report` and `chatHistory` state is populated, and the stage moves to `REFINE`. On failure, it reverts to `CAPTURE` and displays an error.

3.  **`AppStage.REFINE`**:
    - **State:** `report`, `chatHistory`, `images`.
    - **Components:** `ReportGenerator`.
    - **Logic:** The core interactive stage. The `ReportGenerator` initializes a Gemini chat session (`chatSessionRef`) using the initial report and context (images, notes). The user can then send text prompts to refine the report. Each refinement updates the `chatHistory`, with the latest AI message always representing the current version of the report. This stage also handles image annotation and adding more photos.

4.  **`AppStage.PREVIEW`**:
    - **State:** `report` (via `latestReport` derived from `chatHistory`), `images`.
    - **Components:** `ReportPreview`.
    - **Logic:** The final, read-only view of the report. It uses `html2canvas` and `jspdf` to capture the rendered HTML and generate a PDF.

## 4. Component Architecture

- **`App.tsx`**: The root component. Manages all application state and renders child components based on the current `AppStage`.
- **`CameraCapture.tsx`**: Handles camera access via `mediaDevices.getUserMedia` and file input for uploading images.
- **`PhotoGallery.tsx`**: Displays captured/uploaded images. Allows for selection, deletion, and reordering (via drag-and-drop).
- **`Dictation.tsx`**: Uses the browser's `SpeechRecognition` API for voice-to-text.
- **`ReportGenerator.tsx`**: The most complex component. It displays the AI-generated report, manages the chat-based refinement loop, handles the "Evidence Tray" (including initiating annotations and adding more photos), and displays dynamic AI prompt suggestions.
- **`ReportPreview.tsx`**: Renders the final, client-facing report layout and includes the "Save as PDF" functionality.
- **`ImageAnnotationModal.tsx`**: A modal for the image annotation workflow. It orchestrates the AI analysis and image editing process.
- **`/components/icons`**: A collection of simple, reusable SVG icon components.
- **`/services/geminiService.ts`**: A dedicated module for all interactions with the Google Gemini API.

## 5. Gemini API Integration (`services/geminiService.ts`)

This service is the AI brain of the application. It abstracts all API calls.

- **`generateInitialReport`**:
  - **Model:** `gemini-2.5-flash`
  - **Logic:** A multi-modal prompt that sends both the user's selected images and dictated notes. The prompt instructs the AI to generate a structured, professional report in Markdown.

- **`initializeChat` & `refineReport`**:
  - **Model:** `gemini-2.5-flash`
  - **Logic:** Uses the Gemini Chat API. `initializeChat` starts a session with a powerful system instruction, telling the AI its role is to rewrite the *entire report* based on user commands. The initial images, notes, and the first draft are injected as the first turn of the chat history. `refineReport` simply sends the user's new message to this ongoing chat session.

- **`analyzeImageForAnnotation`**:
  - **Model:** `gemini-2.5-flash`
  - **Logic:** A vision prompt that asks the model to identify the single most important detail in an image and return a short descriptive phrase (e.g., "The newly installed faucet"). This phrase is then used as a suggested prompt for the user in the annotation modal.

- **`annotateImage`**:
  - **Model:** `gemini-2.5-flash-image-preview`
  - **Logic:** An image-editing prompt. It takes the original image and a text prompt (e.g., "Highlight the repaired crack") and returns a new image with the requested annotation (typically a circle or arrow) drawn on it.

- **`getReportSuggestionAfterAnnotation`**:
  - **Model:** `gemini-2.5-flash`
  - **Logic:** After an annotation is created, this function asks the AI to suggest a follow-up command for the user, like "Add a sentence explaining that the spare tire is installed, as circled in the photo." This creates a seamless, guided workflow.

- **`getPromptSuggestions`**:
  - **Model:** `gemini-2.5-flash` with a JSON schema response.
  - **Logic:** Analyzes the current report text and suggests 3 actionable commands (e.g., "Add a table with itemized costs"). It has a critical rule to check for a cost table and suggest adding one if it's missing, making the suggestions highly relevant.

## 6. Future Considerations

- **Backend & Persistence:** The next logical step is to add a backend (e.g., Firebase, Supabase, or a custom Node.js server) to handle user authentication and save reports to a database. This would allow users to view their report history and share reports via a link.
- **PDF Generation Improvement:** The current client-side PDF generation can sometimes result in awkward page breaks (e.g., through the middle of an image). A future improvement could be to use a server-side PDF generation library (like Puppeteer) for more precise layout control or to implement more sophisticated client-side logic to manually calculate element positions and page breaks.
- **Enhanced State Management:** If the application grows significantly more complex, introducing a state management library like Zustand could help decouple components and make state more manageable.
- **Testing Strategy:** Implementing a formal testing suite, including unit tests for services and helper functions, component tests for UI elements, and end-to-end tests (e.g., using Playwright) to validate the entire user workflow from photo capture to PDF download.
- **Advanced Offline Capabilities:** While the app can be used after loading, implementing a Service Worker would provide true offline functionality. This would allow the app to be launched without a connection and could queue API-dependent actions (like report generation) to be executed once connectivity is restored.
- **Accessibility (A11y) Audit:** A thorough review to ensure the application is fully accessible, including comprehensive keyboard navigation, ARIA attribute usage for dynamic content (like loading states and AI suggestions), and screen reader compatibility.

## 7. Error Handling and Resilience

The application is designed with user-facing error handling to guide the user when things go wrong.

- **Component-Level State:** Components that can fail independently (e.g., `CameraCapture`, `Dictation`) manage their own error states. This prevents a localized error, like the camera failing to start, from crashing the entire application.
- **API Service Errors:** The `geminiService.ts` file wraps all API calls in `try...catch` blocks. When a call to the Gemini API fails, it logs the technical error to the console and throws a new, user-friendly `Error`. This allows the calling component to catch the error and display a clear message to the user (e.g., "The AI failed to generate a report. Please try again.").
- **Visual Feedback:** Errors are communicated to the user through dedicated UI elements, such as the red error banner in the initial capture stage or specific error messages within the Image Annotation modal. This ensures the user is never left wondering why an action failed.

## 8. Performance and Optimization

Performance is a key consideration, especially for a mobile-first, in-browser application.

- **Image Handling:** Images are handled as Base64 data URLs. This simplifies state management as the image data is self-contained and can be easily passed between components and to the API. The trade-off is that Base64 strings are larger than their binary counterparts.
- **Client-Side Processing:** All logic, including AI interactions and PDF generation, is handled on the client. This makes the application highly responsive as it doesn't rely on a backend for business logic processing.
- **Future Optimizations:**
    - **Image Compression:** Before being sent to the Gemini API, images could be compressed on the client side using a library like `browser-image-compression`. This would significantly reduce payload size, leading to faster API responses, lower costs, and better performance on slow networks.
    - **Memoization:** For more complex UI sections, `React.memo` or the `useMemo` hook could be used to prevent unnecessary re-renders, particularly during the refinement stage where the report text is updated frequently.

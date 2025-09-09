# HandyAI Report Generator

An AI-powered tool for handymen and field technicians to instantly create professional, client-facing work reports. Snap photos, dictate notes, and let AI do the writing.

![HandyAI Report Application Screenshot](https://storage.googleapis.com/project-screenshots/handy-ai/handy-ai-screenshot.png)

## The Problem

Field technicians do great work, but creating professional documentation is often a tedious, time-consuming afterthought. Reports are written late at night, details are forgotten, and the final result often doesn't reflect the quality of the work performed. This leads to client disputes, delayed payments, and a less-than-professional brand image.

## The Solution

**HandyAI Report** streamlines this entire process into a simple, mobile-friendly web app. It empowers users to:

1.  **Capture Evidence:** Quickly take photos or upload them from their gallery.
2.  **Add Context:** Use voice dictation to add notes and details while they are still fresh.
3.  **Generate Instantly:** Let the Google Gemini API analyze the photos and notes to generate a structured, well-written first draft in seconds.
4.  **Refine with Ease:** Use a conversational chat interface to make edits, add details, and perfect the report.
5.  **Visualize Clearly:** Annotate photos with circles and arrows to highlight key details.
6.  **Export Professionally:** Save the final report, complete with photos, as a polished PDF ready to send to the client.

## Features

-   **📸 Multi-Modal Input:** Combines images and text (from voice dictation) for comprehensive context.
-   **🤖 AI-Powered Generation:** Uses the `gemini-2.5-flash` model for fast, high-quality report creation.
-   **💬 Conversational Editing:** A chat-based interface allows for intuitive, natural language-based refinement of the report.
-   **✨ AI Image Annotation:** Leverages the `gemini-2.5-flash-image-preview` model to visually mark up photos based on text prompts.
-   **💡 Proactive Suggestions:** The AI suggests follow-up prompts and report improvements, guiding the user to a better final product.
-   **📄 PDF Export:** Client-side generation of professional PDF reports using `html2canvas` and `jspdf`.
-   **📱 Fully Responsive:** Designed for a seamless experience on both mobile and desktop browsers.

## Tech Stack

-   **Framework:** [React 19](https://react.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **AI Model:** [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Markdown Rendering:** [React Markdown](https://github.com/remarkjs/react-markdown)
-   **Client-Side PDF:** `html2canvas` & `jspdf`

## Project Structure

The application is a client-side only single-page app. Here's a look at the key files:

-   [`index.html`](./index.html): The main entry point that loads React, Tailwind, and the application script.
-   [`App.tsx`](./App.tsx): The root component that manages application state and the primary user workflow (the "stages" of the app).
-   `/components`: Contains all the React components, broken down by feature.
    -   [`ReportGenerator.tsx`](./components/ReportGenerator.tsx): The core component for the AI chat and report refinement experience.
    -   [`ImageAnnotationModal.tsx`](./components/ImageAnnotationModal.tsx): The UI for the image annotation workflow.
    -   [`ReportPreview.tsx`](./components/ReportPreview.tsx): The final preview screen with PDF export functionality.
-   [`/services/geminiService.ts`](./services/geminiService.ts): This file is the heart of the AI integration. It contains all the logic for communicating with the Google Gemini API for report generation, refinement, image analysis, and more.

## In-Depth Documentation

For a deeper dive into the project's architecture, user experience design, and future vision, please see the detailed specification documents:

-   **[Technical Specifications](./docs/technical-specifications.md):** A detailed look at the application's architecture, state management, component breakdown, and Gemini API integration.
-   **[User Experience (UX) Specifications](./docs/ux-specifications.md):** A journey through the app from the user's perspective, including user stories, wireframes, and interaction flows.
-   **[Future UX Ideas](./docs/future-ux-ideas.md):** A vision document exploring potential new features and directions for the product.

## How It Works

This is a self-contained client-side application. There is no build step required. To run it, you can serve the root directory with a simple static file server.

**Important:** The application requires a Google Gemini API key to function. This key must be available as an environment variable named `API_KEY`. The execution environment where this app is hosted must provide this variable.

```javascript
// From services/geminiService.ts
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

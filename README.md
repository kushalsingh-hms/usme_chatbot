# PHQ-9 Assessment Web Application

This is a web-based PHQ-9 depression assessment tool that uses voice interaction through Vapi's web SDK.

## Features

- Interactive PHQ-9 questionnaire
- Voice-based responses using Vapi
- Real-time scoring and severity assessment
- Modern, responsive UI with Tailwind CSS
- Progress tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Vapi:
   - Replace `YOUR_PUBLIC_API_KEY` in `src/App.tsx` with your Vapi public API key
   - Replace `YOUR_ASSISTANT_ID` in `src/App.tsx` with your Vapi assistant ID

3. Start the development server:
```bash
npm start
```

## Usage

1. Click "Start Assessment" to begin
2. Answer each question either by:
   - Clicking on the response options
   - Speaking your response (e.g., "Not at all", "Several days", etc.)
3. View your results and severity level at the end of the assessment

## Development

- Built with React and TypeScript
- Styled with Tailwind CSS
- Voice integration using Vapi's web SDK

## Note

This assessment is not a diagnosis. If you're experiencing symptoms of depression, please consult with a healthcare professional. 
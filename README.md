# ClearBill Project

ClearBill is a patient-facing web app that helps users understand and question medical bills. It identifies dispute-worthy patterns and explains them, providing recommendations for review, not determinations of correctness.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Storage)
- Gemini (text + vision)
- Deployed on Vercel

## Core Product Principles
- No chargemaster data
- No CMS fee schedule validation
- No insurance contract logic
- No claims of “correct” or “incorrect” pricing
- Outputs are recommendations for review, not determinations

## Validation Logic (Allowed Signals Only)
- Duplicate or overlapping charges
- Vague or unclear descriptions
- Temporal inconsistencies (dates outside visit)
- Place-of-service inconsistencies
- LLM-based identification of illogical procedure combinations
- OCR confidence checks

## Scoring
- Provide a Fairness Score that summarizes dispute-worthy patterns
- Score must be transparent and explainable
- Scoring reflects “worth reviewing”, not correctness

## Dispute Letter
- Professional, neutral tone
- Requests clarification or itemization
- No legal threats
- Include user guidance on who typically receives the letter

## Privacy
- Bills stored securely
- No third-party sharing

## Project Phases

### Phase 1: Upload Medical Bill & Extract Data
**Goal:** Enable users to upload medical bills (PDF, images) and extract key data using OCR.
**Scope:**
- **UI:** Simple upload interface.
- **Backend:** API route to receive uploaded files.
- **Service:** OCR processing to extract text from the bill.
- **Data Model (Initial):** Basic structure to store raw uploaded file and extracted text.
**TODOs:**
- Implement secure file storage (Supabase Storage).
- Integrate Gemini Vision for OCR.
- Design a more robust data model for extracted bill details.

### Phase 2: Detect Dispute-Worthy Patterns & Explain Clearly
**Goal:** Analyze extracted data for dispute-worthy patterns and provide clear explanations.
**Scope:**
- **Backend:** Service to apply validation logic.
- **Service:** Logic for Fairness Score calculation.
- **UI:** Display identified patterns, explanations, and Fairness Score.
**TODOs:**
- Implement all allowed validation logic (duplicate charges, vague descriptions, temporal inconsistencies, etc.).
- Refine Fairness Score calculation and explanation.

### Phase 3: Generate Dispute Letter & Guide Next Steps
**Goal:** Generate a professional dispute letter and guide the user on next actions.
**Scope:**
- **Backend:** Service to generate dispute letter.
- **UI:** Display generated letter, options to edit, and instructions for sending.
**TODOs:**
- Implement dispute letter generation using LLM.
- Develop comprehensive user guidance for next steps.


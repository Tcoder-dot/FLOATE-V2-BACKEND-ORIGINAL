# Implementation Plan: Buyer Lead Qualification Flow

This plan outlines the integration of a mandatory lead qualification workflow for buyers before revealing a vendor's direct WhatsApp contact number.

## 1. Overview & Core Concept
- **Goal**: Qualify buyers by collecting "Budget" and "Specific Needs" before releasing a vendor's contact information.
- **Workflow**: 
    1. Buyer initiates contact.
    2. AI identifies an "unqualified" session.
    3. AI triggers `QUALIFYING` state and asks for budget/needs.
    4. Buyer provides input.
    5. AI records info in `RelaySession`.
    6. AI reveals vendor WhatsApp number directly in chat.
    7. Vendor is notified of the lead *only after* the buyer contacts them.

## 2. Technical Architecture & Data Strategy
- **State Management**:
    - Update `WhatsAppUserSessionState` in `src/bot/services/whatsappStateManager.ts` to include `qualifyingDraft` (for capturing Budget/Needs).
- **Backend Routing (`whatsappService.ts`)**:
    - Intercept `startFloateSecureLine` to initiate the qualification flow.
    - Add a new state handler in `handleInboundMessage` for `QUALIFYING` to process user responses.
- **Persistence**:
    - Store captured lead data (budget/needs) in the `RelaySession` document within Firestore.

## 3. UX Flow
- **Initiation**: Buyer asks for a vendor contact.
- **Qualification**: AI requests: "Before I connect you, could you please tell me your budget and specific needs for this item?"
- **Reveal**: Once info is provided, AI replies: "Thanks! Here is the vendor's direct line: [Number]. You can contact them now."
- **Notification**: Upon first contact message, the vendor receives a lead summary: "New lead from [Buyer] (Budget: [Budget], Needs: [Needs])."

## 4. User Review & Decisions
- **Decision**: Qualification is mandatory for all direct number reveals.
- **Decision**: Vendor notification is triggered by the first buyer-to-vendor message after reveal.

[!IMPORTANT]
Please review this plan. Upon approval, I will implement the state management changes and the updated WhatsApp message routing.

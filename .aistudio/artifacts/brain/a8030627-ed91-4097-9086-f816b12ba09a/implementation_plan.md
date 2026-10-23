# Implementation Plan: Pre-Launch Readiness & Beta Testing

## Overview
This implementation plan outlines the steps leading up to our pre-launch beta test. It addresses search visibility for image-less merchants, sets up the private beta testing framework for real users, and reserves business model configuration for tomorrow's discussion.

---

## Phase 1: Search & Recommendation Engine (Image-less Merchant Robustness)
- **Objective:** Ensure merchants without uploaded images still appear prominently in frontend search results (`www.floate.xyz/search` & API) with clean text cards and direct "Chat on WhatsApp" buttons.
- **Tasks:**
  1. Audit backend search ranking (`searchService.ts`) to verify that stores matching keyword queries are fully surfaced even when `imageUrl` or `productImages` arrays are empty.
  2. Implement sleek fallback rendering on frontend search cards (`WebSearchDemo.tsx` & `VendorStorefront.tsx`) displaying business name, verified badge, market hub, product name, and direct WhatsApp connect actions without layout shifting.

---

## Phase 2: Beta Testing Setup (Real / Selected Users)
- **Objective:** Prepare the platform for a controlled beta test with selected merchants and buyers.
- **Tasks:**
  1. Configure beta test telemetry and error logging (`handleFirestoreError`) to track any permission or handshake issues during live user testing.
  2. Prepare the beta onboarding guide and WhatsApp outreach link (`wa.me`) for test merchants to drop their first product images and test the `/verify` portal.

---

## Phase 3: Business Model & Pricing Integration (Scheduled for Tomorrow)
- **Objective:** Finalize and integrate the merchant credit/payment model after tomorrow's discussion.
- **Tasks:**
  1. Keep current fallback (25 free introductory leads) active.
  2. Implement updated pricing logic in backend and admin wallet views once confirmed.

---

## Verification Plan
- Run `compile_applet` and `lint_applet` to confirm zero compilation or TypeScript errors.
- Test-run simulated search queries for image-less merchants to guarantee 100% display reliability.

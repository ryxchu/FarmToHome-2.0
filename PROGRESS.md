# FarmToHome Project Documentation & Progress

This document tracks the features, progress, and architectural decisions made since the start of the FarmToHome project.

## 1. Project Overview
**FarmToHome** is a marketplace application connecting Farmers directly with Buyers. It features a robust authentication system, profile management, and a secure transactional backbone.

## 2. Core Features Implemented

### 2.1 Authentication & Onboarding
- **Google Login Integration**: Seamless authentication using Firebase Auth.
- **Role-Based Access Control (RBAC)**: Supports three roles: **Farmer**, **Buyer**, and **Admin**.
- **Secure Registration**: Custom registration flow collecting names, phone numbers, and roles.
- **Multimodal OTP Verification (Real-time)**:
  - Integration with **Nodemailer** using custom SMTP (Gmail App Passwords).
  - Choice between **Email** and **Phone** (Simulated) verification.
  - 6-digit security code with cooldown timers and resend logic.

### 2.2 Security Architecture
- **Firestore Security Rules**: Implemented "Fortress" rules with:
  - **Schema Validation**: Strict key and type checking.
  - **Identity Verification**: Ensuring owners can only modify their own data.
  - **Transactional Integrity**: Atomic writes and state-locking for terminal statuses.
- **Server-side Security**: API keys are kept server-side in `server.ts` to prevent exposure.

### 2.3 User Interface
- **Swiss-Modern Aesthetic**: A polished, "Farm-to-Table" design using:
  - **Typography**: Inter (UI) and Playfair Display (Serif accents).
  - **Color Palette**: Deep slate, emerald greens, and warm slate-50 backgrounds.
  - **Animations**: Fluid transitions using `motion`.
- **Responsive Auth Modal**: A single modal handling Login, Registration, OTP, and Forgot Password.

## 3. Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Framer Motion.
- **Backend**: Express (Custom Server), Node.js.
- **Database/Auth**: Firebase Firestore & Firebase Authentication.
- **Messaging**: Nodemailer (via custom Gmail SMTP).

## 4. Current Progress Status
- [x] Initial UI Mockups & Design System
- [x] Firebase Connection & Data Modeling
- [x] Secure Registration Flow
- [x] OTP Verification via custom SMTP
- [x] RBAC Foundation
- [x] Forgot Password Backend (In Progress)
- [ ] Product Marketplace Module
- [ ] Dashboard for Farmers/Buyers
- [ ] Order & Payment Integration

---
*Last updated: May 16, 2026*

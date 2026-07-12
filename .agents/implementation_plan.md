# Implementation Plan - Splash Screen, Support, Leave History, and Call Recording Enhancements

This plan details the implementation of a 3D animated welcome splash screen, contact support page, in-app leave history list, simulated call recording/playback, predictive auto-dialer mode, and in-app calling simulation.

---

## User Review Required

> [!NOTE]
> **SIM Call vs. In-App Calling Technical constraint:**
> Modern mobile OS (Android 10+ / iOS) security standards do not allow third-party apps to place native cell SIM calls silently in the background. Placing a SIM call will *always* launch the phone's native system dialer.
> To address your request for calling strictly inside the CRM screen without redirection, we will:
> 1. Keep the standard SIM flow (where the agent manually toggles back to the CRM app while talking).
> 2. Add a **Simulated In-App VoIP Call Mode** toggle. When enabled, call audio is simulated directly inside the CRM dialer screen using an active connection display, without ever redirecting to the native phone dialer!

---

## Proposed Changes

### 1. 3D Animated Splash Screen (Welcome Screen)
*   **Mobile App ([App.js](file:///C:/Users/siami/.gemini/antigravity/scratch/dial-flow-crm/agent-mobile/App.js)) & Web Simulator ([AgentSimulator.jsx](file:///C:/Users/siami/.gemini/antigravity/scratch/dial-flow-crm/frontend/src/pages/AgentSimulator.jsx)):**
    *   Add a 4-second loading timer (`showSplash` state).
    *   Render a high-end full-screen loading screen with a deep slate/dark gradient.
    *   Display a large 3D-styled typography title: **"DIAL FLOW CRM"**.
    *   Underneath, display high-contrast glowing text: **"by VIPIN TIWARI"** with scaling and fade-in micro-animations.

### 2. Contact Support Section
*   **Mobile App & Web Simulator:**
    *   Add a dedicated **"Contact Support"** section or modal.
    *   Display support contact: Phone `9702564894` and Email `vipintiwari0279@gmail.com`.
    *   Wire direct action triggers: `Linking.openURL('tel:9702564894')` and `Linking.openURL('mailto:vipintiwari0279@gmail.com')`.

### 3. HRMS Leave History rendering
*   **Mobile App ([App.js](file:///C:/Users/siami/.gemini/antigravity/scratch/dial-flow-crm/agent-mobile/App.js)):**
    *   Add a list component at the bottom of the HRMS Portal layout to map and display `leaveHistory` items (Leave Type, Dates, Reason, Status badge).
    *   Include a client-side day calculator helper to print leave durations.

### 4. Call Recording & Playback simulation
*   **Mobile Call Dialer UI:**
    *   Add a **"Record Call"** toggle button. When active, show an animated wave indicator.
    *   Add a **"Call Log / Recordings"** section in the mobile client to let agents play back simulated call audio files.

### 5. Auto-dialer / Predictive Mode
*   **Mobile App & Simulator Dashboard:**
    *   Add an **"Auto-Dialer Mode"** switch on the calling dashboard.
    *   When switched ON: Once a call disposition is saved, the app will automatically prompt and trigger dialing of the next lead in the pool after a 3-second countdown.

---

## Verification Plan

### Manual Verification
1.  Launch the app or simulator, confirm the 4-second animated **"Dial Flow CRM by VIPIN TIWARI"** splash screen renders.
2.  Click the "HRMS Portal" tab on the mobile app, verify the "Leave History" log prints past leave submissions with approval status.
3.  Open the "Contact Support" section, verify dialing and mailing options trigger correct links.
4.  Activate "Auto-Dialer Mode", log a call outcome, and verify that the next lead is automatically queued for dialing.

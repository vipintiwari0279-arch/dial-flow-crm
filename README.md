# Dial Flow CRM By Vipin

Dial Flow CRM is a high-performance outbound call center CRM designed to manage leads, distribute them equally (via Round Robin), log agent dials, and monitor campaign performance in real-time.

## Features

- **Admin Dashboard**: Live metrics, weekly overview charts, and disposition summaries.
- **Live Agent Monitoring**: Watch agent status changes (online/paused/offline) and active dial states (dialing/talking/idle) update in real-time.
- **Lead Upload (Excel/CSV)**: Upload lead sheets, filters out duplicate phone numbers and compliance numbers (DNC).
- **Equal Lead Distribution**: Automated round-robin routing of pending leads to active agents.
- **Callback Reminders**: Track scheduled callback times logged by agents.
- **DNC Compliance**: Blacklist numbers from dialing sheets.
- **Agent App Simulator**: An interactive mobile mock phone in the browser to login as agents, make calls, update status, and log dispositions.
- **React Native Mobile App**: Ready-to-run Expo codebase for Android and iOS compilation.

---

## Folder Structure

```text
dial-flow-crm/
├── backend/            # Node.js + Express API Server with WebSockets (Socket.io)
├── frontend/           # Vite + React Web App (Admin Panel & Agent Simulator)
└── agent-mobile/       # Expo React Native mobile code base
```

---

## Quick Start (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org) (v16+)
- npm

---

### Step 1: Start the Backend Server

1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Create a `.env` file (one has been pre-configured for you). By default, it will fall back to **SQLite** (creating `database.sqlite` in the root) so you can run it immediately without setting up PostgreSQL.
4. Start the server:
   ```bash
   npm run dev
   ```
   *The server starts on `http://localhost:5000`.*

---

### Step 2: Start the Web Admin Panel (Vite + React)

1. Open a new terminal and navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   *The client starts on `http://localhost:3000`.*

---

### Step 3: Run the Agent Mobile App (Expo)

If you wish to run the mobile app codebase:
1. Navigate to the `agent-mobile` directory.
2. Install Expo CLI and dependencies:
   ```bash
   cd agent-mobile
   npm install
   ```
3. Run the development server:
   ```bash
   npx expo start
   ```
4. Update the `API_URL` variable in `App.js` to point to your computer's local IP address (e.g., `http://192.168.1.XX:5000`) instead of `http://localhost:5000` to connect from physical devices.

---

## How to Test the Full Campaign Flow

We have built a **Web Agent Simulator** directly inside the React frontend so you can test the end-to-end calling workflow in your browser immediately.

1. **Login as Admin**:
   - Open `http://localhost:3000` in your browser.
   - Click the **System Admin** quick fill button on the login screen.
   
2. **Upload Leads**:
   - Go to the **Upload Leads** tab in the sidebar.
   - Click **Download CSV Template** to get the sample layout.
   - Upload a test CSV containing names and phone numbers.

3. **Launch the Agent Simulator**:
   - Click the **Agent Simulator** button at the bottom of the admin sidebar (this opens the simulator page).
   - In the controls panel, select **Vipin Kumar** and click **Start Simulation**.
   - The mock phone screen turns on, marking Vipin as **ONLINE**.

4. **Distribute Leads**:
   - Go back to the Admin Panel tab in your browser.
   - Select **Distribute Leads** in the sidebar.
   - You will see the pending leads count and "1 Active Agent" (Vipin).
   - Click **Distribute Leads**. The leads will be assigned.

5. **Simulate a Call**:
   - In the **Agent Simulator** window, you will now see the first lead allocated (e.g. *Rajesh Kumar*).
   - Click the green **Call Now** button.
   - The simulator runs through a dialing sequence, connects, starts a timer, and plays waveform animations.
   - Click **End Call**, select **Interested**, type comments (e.g. "Needs brochure"), and click **Save & Next Lead**.
   - A 20-second countdown runs before pulling the next lead.

6. **Monitor Live Dashboard Updates**:
   - Watch the Admin Dashboard counters update instantly!
   - Navigate to the **Live Monitoring** tab or **Call Reports** to verify logs and status updates are happening in real-time.

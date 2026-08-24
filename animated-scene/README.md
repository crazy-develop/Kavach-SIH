# KAVACH: National Examination Security System (SIH)

KAVACH is an advanced, highly secure digital vault and authentication system designed to prevent paper leaks and unauthorized access to highly sensitive examination documents. It leverages **Shamir's Secret Sharing (SSS)** cryptography, **Time-based One-Time Passwords (TOTP) 2FA**, and a **Real-time Cyber Command Center** for auditing.

## 🚀 Features & Workflow

1. **Threshold Authentication (SSS):** The system relies on 5 unique Custodians (e.g., Exam Controller, Center Head, Police Observer, etc.). To unlock the vault, at least 3 out of 5 custodians must authenticate successfully. No single person has the full key.
2. **Double-Gate Unlock (2FA):** Custodians authenticate first via Email/Password, and then through a TOTP Authenticator app (like Google Authenticator).
3. **Global Command Center (Admin HUD):** A dedicated, full-screen cyberpunk-themed Admin Dashboard that provides:
   - Live network traffic monitoring (CSS-animated digital graphs).
   - Real-time Socket.io access logs (Success/Fail login attempts).
   - Document upload/encryption and decryption vault.
4. **Cinematic Presentation Layer:** The landing page features an immersive, scroll-triggered cinematic presentation using HTML Canvas and 3D CSS typography.

---

## 🛠️ Tech Stack Used

### **Frontend:**
- **React.js + Vite:** Fast, modern UI development.
- **CSS3 & Animations:** Cyberpunk grid layouts, radar sweeps, floating cyber-orbs, glowing neon effects.
- **Socket.io-client:** For real-time updates (live login streams, share submissions).

### **Backend:**
- **Node.js + Express:** API routing and business logic.
- **MongoDB (Mongoose):** Database for storing custodians, encrypted shares, and login audit logs.
- **secrets.js-grempe:** Implementation of Shamir's Secret Sharing algorithm.
- **speakeasy & qrcode:** For generating and verifying 2FA TOTP secrets.
- **jsonwebtoken (JWT) & bcrypt:** Secure session management and password hashing.
- **Socket.io:** Emitting live events to the admin dashboard.

---

## 📂 Project Structure

The project is divided into two distinct parts:

```text
E:\Jarvis\
 ├── animated-scene\
 │    └── frontend\          <-- The main React UI (Landing Page + Admin Dashboard)
 │
 └── authentication SIH\
      └── backend\           <-- The Node.js/MongoDB Server
```

---

## 💻 How to Run the Project

### 1. Start the Backend Server
Open a new terminal window and run:
```bash
cd "E:\Jarvis\authentication SIH\backend"
npm install    # (If running for the first time)
npm start
```
*The backend will connect to MongoDB and run on `http://localhost:3000`.*

### 2. Start the Frontend Server
Open a second terminal window and run:
```bash
cd "E:\Jarvis\animated-scene\frontend"
npm install    # (If running for the first time)
npm run dev
```
*The frontend will run on `http://localhost:5174` (or similar). It is configured to proxy API requests directly to the backend.*

---

## 🧠 How the Core Logic Works

### **1. Setup Phase (Admin Panel -> Deploy 5 Custodians)**
- Admin clicks "Deploy". The backend deletes old keys and generates a new random **32-byte Master Key**.
- This key is split into **5 cryptographic shares** using `secrets.js`.
- The backend generates 5 Custodian accounts. Each account is assigned one share.
- For maximum security, the share is *encrypted* with the custodian's temporary password before being saved to MongoDB.

### **2. Custodian Login Phase**
- Custodians log in via the `#/custodian` route.
- They enter their Email, Password, and TOTP code.
- Upon successful login, the backend decrypts their stored share using their password, and holds it in the active session's RAM.
- A live Socket event (`share_submitted`) is fired to update the Admin Dashboard.

### **3. Reconstruction Phase**
- As custodians log in, their shares accumulate in the backend RAM.
- Once the **Threshold (3 shares)** is met, the backend automatically triggers reconstruction.
- The `secrets.combine()` function merges the 3 shares back into the original Master Key.
- The Vault is unlocked, and a `threshold_met` socket event is broadcasted.

### **4. Document Encryption/Decryption**
- When the Admin uploads an exam paper, it is AES-encrypted using the newly reconstructed Master Key.
- When downloading, it is decrypted using the same key. If the system is rebooted, the Master Key is lost from RAM, and 3 custodians must log in again to recover it.

---

## 🚨 Troubleshooting

- **`EADDRINUSE: address already in use :::3000`** 
  - *Cause:* The backend is already running in another terminal window.
  - *Fix:* Close the old terminal or kill the Node process, then run `npm start` again.

- **"No History" in Access Logs or Dashboard not connecting**
  - *Cause:* The Vite Proxy is missing or the backend isn't running. 
  - *Fix:* Ensure the backend is running on port 3000. Ensure `vite.config.js` has the proxy set for `/api`.

- **Invalid Admin Token Error**
  - *Cause:* The backend server was restarted, flushing RAM and old JWT sessions.
  - *Fix:* Click the "Logout" button on the Admin Dashboard and log in again.

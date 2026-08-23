# KAVACH - Secure National Examination Protocol 🛡️

**KAVACH** is a highly secure, cryptographic backend protocol designed for national-level examination boards. It ensures that confidential question papers never exist in plaintext until a strict mathematical **"Double-Gate" Lock** is verified right before the examination starts.

## Core Features 🔐

- **Time-Gate Enforcement:** The system strictly checks the synchronized server UTC time against the examination's official start window.
- **Quorum-Gate (M-of-N Cryptography):** Adopts **Shamir's Secret Sharing (SSS)** over a 256-bit prime modulus mathematically, distributing tokenized decryption keys across multiple trusted authorities. The exam unlocks *only* if `M` distinct valid tokens are collected out of `N` distributed shareholders.
- **Database Encryption Hooks:** Seamlessly integrates generic encryption hooks. Any sensitive question data passed successfully will be deeply encrypted in `AES-256-GCM` before resting in the database. 
- **Immutable Audit Pipeline:** Records unalterable REST transaction logs, cryptographic fingerprints (`SHA-256`), device signatures, and JIT (Just-In-Time) watermark tracing.

## Project Structure 🏗️

This backend uses a **Service-Repository** pattern with clean decoupled architecture:

```
├── app/
│   ├── api/            # Controller Routes & Endpoints
│   ├── core/           # Configuration & Cryptographic Service Engine
│   ├── db/             # Encryption Model Hooks & Middlewares
│   ├── middleware/     # Immutable Audit Trailing 
│   ├── models/         # Pydantic DTOs & Validation Schemas
│   ├── repositories/   # Extensible interfaces mapping (Mock/Postgres)
│   └── services/       # Top-level Business logic & Double-Gate engines
├── .env                # Runtime environment tokens 
├── main.py             # Uvicorn & FastAPI Bootstrap
└── requirements.txt    # Python runtime requirements
```

## Quick Start 🚀

1. **Install Dependencies:**
The system is built organically so there are no massive external C-extensions acting as dependencies for the cryptographic services (it uses pure python mathematical polynomial interpolations for SSS and PyCA standard definitions).

```bash
pip install -r requirements.txt
```

2. **Boot the Backend Protocol Server:**
```bash
python main.py
```
> Or run via uvicorn directly: `uvicorn main:app --reload`

3. **Explore Open API Documentation:**
Upon successful startup, browse to `http://localhost:8000/docs` to execute and explore interactive encrypted endpoints smoothly.

## Main Endpoints 🌐
* `POST /api/questions/submit`: Stores individual encrypted question text payloads into the AES databank.
* `POST /api/exam/generate-paper`: Invokes threshold cryptographic splits. 
* `POST /api/exam/request-unlock`: Processes combined multi-party shares and resolves Token generation if time-lock constraint permits.
* `POST /api/print/job-log`: Registers a cryptographically mapped audit log for JIT endpoints.

---
*Maintained under protocol standards for KAVACH System Architecture.*

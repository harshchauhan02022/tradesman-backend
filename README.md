# Tradesman Travel API - quick start

1. copy files into your project.
2. run `npm install`.
3. create `./config/config.env` with your DB, JWT, SMTP and Google OAuth values.
4. start mysql and create DB (DB_NAME).
5. run `npm run dev` (or `npm start`).

Testing:
- Register: POST /api/users/register
- Login: POST /api/users/login
- Forgot Password: POST /api/users/forgot-password { email }
- Reset Password: POST /api/users/reset-password/:token { newPassword }
- Google Auth: Open /api/users/google in browser (or use frontend to start OAuth)

Notes:
- Ensure Gmail account has 2-step verification enabled and you generated an App Password used for SMTP_PASS.
- If transporter verify fails, check your SMTP credentials and that the network/hosting doesn't block port 465/587.

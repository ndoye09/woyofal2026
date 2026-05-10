@echo off
REM Deploy script for Woyofal Platform
REM Frontend: Vercel
REM Backend: Railway

echo.
echo ═══════════════════════════════════════════════════════════════
echo 🚀 WOYOFAL PLATFORM - DEPLOYMENT SCRIPT
echo ═══════════════════════════════════════════════════════════════
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js not found. Install it from https://nodejs.org
  exit /b 1
)
echo ✅ Node.js found

REM Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Git not found. Install it from https://git-scm.com
  exit /b 1
)
echo ✅ Git found

echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │ STEP 1: Prepare Frontend                                    │
echo └─────────────────────────────────────────────────────────────┘
echo.

cd frontend-react

REM Install dependencies if not already
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

REM Build frontend
echo Building frontend...
call npm run build

if %errorlevel% neq 0 (
  echo ❌ Build failed
  exit /b 1
)

echo ✅ Frontend built successfully

cd ..

echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │ STEP 2: Prepare Backend                                     │
echo └─────────────────────────────────────────────────────────────┘
echo.

REM Create Procfile for Railway (already done by Python, but verifying)
if not exist Procfile (
  echo web: node api-mock-server.js > Procfile
  echo ✅ Procfile created
)

echo ✅ Backend configuration ready

echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │ STEP 3: Git Deployment                                      │
echo └─────────────────────────────────────────────────────────────┘
echo.

REM Stage and commit
git add .
git commit -m "🚀 Ready for production deployment"
git push origin main

if %errorlevel% neq 0 (
  echo ⚠️ Could not push to GitHub. Make sure your repo is configured.
) else (
  echo ✅ Pushed to GitHub
)

echo.
echo ╔═════════════════════════════════════════════════════════════╗
echo ║ 🎉 DEPLOYMENT PREPARATION COMPLETE!                         ║
echo ╚═════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo.
echo 1️⃣  DEPLOY FRONTEND (Vercel)
echo    → Go to https://vercel.com/dashboard
echo    → Click "New Project"
echo    → Import this GitHub repo
echo    → Select: frontend-react/ as root directory
echo    → Click "Deploy"
echo.
echo 2️⃣  DEPLOY BACKEND (Railway)
echo    → Go to https://railway.app
echo    → Click "New Project"
echo    → Select this GitHub repo
echo    → Click "Deploy"
echo.
echo 3️⃣  CONFIGURE VERCEL ENV VARS
echo    → Vercel Dashboard → Settings → Environment Variables
echo    → Add: VITE_API_URL = https://your-railway-url/api
echo.
echo 4️⃣  REDEPLOY VERCEL
echo    → After setting env vars, redeploy from Vercel dashboard
echo.
echo Documentation: Read DEPLOYMENT_GUIDE.md
echo.
pause

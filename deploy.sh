#!/bin/bash

# Deploy script for Woyofal Platform
# Frontend: Vercel | Backend: Railway

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀 WOYOFAL PLATFORM - DEPLOYMENT SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check Git
if ! command -v git &> /dev/null; then
  echo "❌ Git not found. Install from https://git-scm.com"
  exit 1
fi
echo "✅ Git found: $(git --version)"

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│ STEP 1: Prepare Frontend                                    │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

cd frontend-react

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build
echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Frontend built successfully"

cd ..

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│ STEP 2: Prepare Backend                                     │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Create Procfile
if [ ! -f "Procfile" ]; then
  echo "web: node api-mock-server.js" > Procfile
  echo "✅ Procfile created"
fi

echo "✅ Backend configuration ready"

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│ STEP 3: Git Deployment                                      │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

git add .
git commit -m "🚀 Ready for production deployment"
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Pushed to GitHub"
else
  echo "⚠️ Could not push to GitHub. Check your repo configuration."
fi

echo ""
echo "╔═════════════════════════════════════════════════════════════╗"
echo "║ 🎉 DEPLOYMENT PREPARATION COMPLETE!                         ║"
echo "╚═════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  DEPLOY FRONTEND (Vercel)"
echo "    → https://vercel.com/dashboard"
echo "    → New Project → Import GitHub"
echo "    → Root: frontend-react/"
echo "    → Deploy"
echo ""
echo "2️⃣  DEPLOY BACKEND (Railway)"
echo "    → https://railway.app"
echo "    → New Project → Connect GitHub"
echo "    → Deploy"
echo ""
echo "3️⃣  CONFIGURE VERCEL ENV VARS"
echo "    → Vercel Dashboard → Settings"
echo "    → VITE_API_URL = https://railway-url/api"
echo ""
echo "4️⃣  REDEPLOY VERCEL"
echo "    → After env vars, redeploy"
echo ""
echo "Need help? Read DEPLOYMENT_GUIDE.md"
echo ""

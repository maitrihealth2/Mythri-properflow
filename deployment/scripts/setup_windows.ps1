#!/usr/bin/env pwsh
# MindBridge Phase 1 — Windows Setup Script
# Run this from the project root in PowerShell:
#   .\scripts\setup_windows.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MindBridge — Phase 1 Setup (Windows)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check Python
try {
    $pyver = python --version 2>&1
    Write-Host "✅ Python found: $pyver" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# Check Node
try {
    $nodever = node --version 2>&1
    Write-Host "✅ Node.js found: $nodever" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "--- Setting up backend ---" -ForegroundColor Cyan

Set-Location backend

# Create venv
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
}

# Activate and install
.\venv\Scripts\activate
pip install -r requirements.txt --quiet
Write-Host "✅ Python packages installed" -ForegroundColor Green

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    @"
SARVAM_API_KEY=your_sarvam_api_key_here
DATABASE_URL=sqlite:///./mindbridge.db
SECRET_KEY=change_this_to_a_random_string_in_production
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✅ .env file created — add your SARVAM_API_KEY!" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  .env already exists" -ForegroundColor Yellow
}

# Init database
python -c "from db.models import init_db; init_db()"
Write-Host "✅ Database initialized" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "--- Setting up frontend ---" -ForegroundColor Cyan

Set-Location frontend
npm install --silent
Write-Host "✅ Node packages installed" -ForegroundColor Green

# Create frontend .env.local
if (-not (Test-Path ".env.local")) {
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host "✅ Frontend .env.local created" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Get your Sarvam AI key: https://dashboard.sarvam.ai/" -ForegroundColor White
Write-Host "2. Add it to backend\.env → SARVAM_API_KEY=your_key" -ForegroundColor White
Write-Host "3. Open TWO terminals:" -ForegroundColor White
Write-Host ""
Write-Host "   Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   .\venv\Scripts\activate" -ForegroundColor White
Write-Host "   uvicorn app:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "   Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Open http://localhost:3000" -ForegroundColor Green
Write-Host ""
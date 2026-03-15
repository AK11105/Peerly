@echo off
setlocal enabledelayedexpansion
title Peerly Dev Server

:: ============================================================
::  Peerly — Dev Startup Script
::  Starts: Ollama, FastAPI backend, Next.js frontend
:: ============================================================

echo.
echo  ██████╗ ███████╗███████╗██████╗ ██╗  ██╗   ██╗
echo  ██╔══██╗██╔════╝██╔════╝██╔══██╗██║  ╚██╗ ██╔╝
echo  ██████╔╝█████╗  █████╗  ██████╔╝██║   ╚████╔╝
echo  ██╔═══╝ ██╔══╝  ██╔══╝  ██╔══██╗██║    ╚██╔╝
echo  ██║     ███████╗███████╗██║  ██║███████╗██║
echo  ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝
echo.
echo  Starting dev environment...
echo  ============================================================
echo.

:: ── 0. Check working directory ───────────────────────────────
if not exist "backend" (
    echo [ERROR] Run this script from the peerly-integrated root folder.
    echo         Expected to find: backend\  and  app\
    pause
    exit /b 1
)

:: ── 1. Ollama ─────────────────────────────────────────────────
echo [1/3] Checking Ollama...

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Ollama not found in PATH.
    echo        Download from https://ollama.com and install, then re-run.
    echo        Skipping — AI features will not work without it.
    echo.
    goto BACKEND
)

:: Check if already running
curl -s http://localhost:11434 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Ollama already running on port 11434.
) else (
    echo [..] Starting Ollama...
    start "Ollama" /min cmd /c "ollama serve"
    timeout /t 3 /nobreak >nul
    echo [OK] Ollama started.
)

:: Pull llama3 if not present
echo [..] Checking llama3 model...
ollama list 2>nul | findstr /i "llama3" >nul
if %errorlevel% neq 0 (
    echo [..] llama3 not found — pulling now (this may take a few minutes)...
    ollama pull llama3
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to pull llama3. Check your internet connection.
        pause
        exit /b 1
    )
    echo [OK] llama3 ready.
) else (
    echo [OK] llama3 already installed.
)
echo.

:: ── 2. Backend ────────────────────────────────────────────────
:BACKEND
echo [2/3] Starting FastAPI backend...

cd backend

:: Check .env
if not exist ".env" (
    echo [WARN] backend\.env not found.
    echo        Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [WARN] Edit backend\.env and add your ANTHROPIC_API_KEY if needed.
    ) else (
        echo        ANTHROPIC_API_KEY= > .env
        echo [WARN] Created empty backend\.env
    )
)

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python not found. Install from https://python.org
        pause
        exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)

:: Create venv if missing
if not exist "venv" (
    echo [..] Creating Python virtual environment...
    %PYTHON% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create venv.
        pause
        exit /b 1
    )
    echo [OK] venv created.
)

:: Install dependencies
echo [..] Installing Python dependencies...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Check requirements.txt.
    pause
    exit /b 1
)
echo [OK] Dependencies ready.

:: Start backend in new window
echo [..] Launching backend on http://localhost:8000
start "Peerly Backend" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
echo [OK] Backend starting...
echo.

cd ..

:: ── 3. Frontend ───────────────────────────────────────────────
echo [3/3] Starting Next.js frontend...

:: Check Node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Check pnpm, fall back to npm
where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    set PKG=pnpm
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        set PKG=npm
        echo [WARN] pnpm not found, using npm. Install pnpm with: npm i -g pnpm
    ) else (
        echo [ERROR] No package manager found (tried pnpm, npm^).
        pause
        exit /b 1
    )
)

:: Install node_modules if missing
if not exist "node_modules" (
    echo [..] Installing Node dependencies (this may take a minute^)...
    %PKG% install
    if %errorlevel% neq 0 (
        echo [ERROR] %PKG% install failed.
        pause
        exit /b 1
    )
    echo [OK] Node dependencies installed.
)

:: Start frontend in new window
echo [..] Launching frontend on http://localhost:3000
start "Peerly Frontend" cmd /k "%PKG% dev"
timeout /t 3 /nobreak >nul
echo [OK] Frontend starting...
echo.

:: ── Done ──────────────────────────────────────────────────────
echo  ============================================================
echo  [READY] Peerly is starting up!
echo.
echo    Frontend  →  http://localhost:3000
echo    Backend   →  http://localhost:8000
echo    API Docs  →  http://localhost:8000/docs
echo    Ollama    →  http://localhost:11434
echo.
echo  Close the Peerly Backend and Peerly Frontend windows to stop.
echo  ============================================================
echo.

:: Open browser after a short wait
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

endlocal
pause
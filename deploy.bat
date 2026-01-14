@echo off
REM TechNexus Deployment Script for Netlify and Render
REM This script helps deploy the application to both platforms

setlocal enabledelayedexpansion

echo.
echo ====================================
echo TechNexus Deployment Setup
echo ====================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if errorlevel 1 (
    echo Error: Git is not installed or not in PATH
    exit /b 1
)

REM Check if Node is installed
where node >nul 2>nul
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

echo [✓] Git and Node.js found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies
    exit /b 1
)

cd frontend
call npm install
if errorlevel 1 (
    echo Error: Failed to install frontend dependencies
    exit /b 1
)
cd ..

cd backend
call npm install
if errorlevel 1 (
    echo Error: Failed to install backend dependencies
    exit /b 1
)
cd ..

echo [✓] Dependencies installed
echo.

REM Build frontend
echo Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo Error: Frontend build failed
    exit /b 1
)
cd ..
echo [✓] Frontend built successfully
echo.

REM Build backend
echo Building backend...
cd backend
call npm run build
if errorlevel 1 (
    echo Error: Backend build failed
    exit /b 1
)
cd ..
echo [✓] Backend built successfully
echo.

echo ====================================
echo Build Complete!
echo ====================================
echo.
echo Next steps:
echo.
echo 1. RENDER DEPLOYMENT (Backend):
echo    - Go to https://render.com
echo    - Create new Web Service from your GitHub repo
echo    - Set Root directory to: backend
echo    - Build command: npm install && npm run build
echo    - Start command: npm start
echo    - Add environment variables:
echo      * NODE_ENV = production
echo      * SUPABASE_URL = (from Supabase dashboard)
echo      * SUPABASE_KEY = (from Supabase dashboard)
echo.
echo 2. NETLIFY DEPLOYMENT (Frontend):
echo    - Go to https://netlify.com
echo    - Connect your GitHub repository
echo    - Build command: cd frontend && npm run build
echo    - Publish directory: frontend/dist
echo    - Add environment variable:
echo      * VITE_API_URL = https://technexus-backend.onrender.com
echo.
echo 3. After getting Render URL:
echo    - Update VITE_API_URL in Netlify
echo    - Trigger rebuild in Netlify
echo.
echo For detailed instructions, see: DEPLOYMENT_GUIDE.md
echo.
pause

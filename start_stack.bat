@echo off
title main-link Full Stack Orchestrator
echo ========================================================
echo   Starting main-link Multi-Modal Civic AI Architecture
echo ========================================================
echo.

echo [1/3] Launching Python FastAPI + Playwright Pipeline (:8000)...
start "main-link: FastAPI :8000" cmd /k "cd detection-pipeline && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Launching Node.js Express Backend (:5000)...
start "main-link: Express :5000" cmd /k "cd server && npm start"

echo [3/3] Launching React Vite Frontend Client (:5173)...
start "main-link: Vite :5173" cmd /k "cd client && npm run dev"

echo.
echo ========================================================
echo   All 3 services launched in separate windows:
echo   - Frontend UI:        http://localhost:5173
echo   - Express Backend:    http://localhost:5000
echo   - Detection Pipeline: http://localhost:8000
echo   - FastAPI Docs:       http://localhost:8000/docs
echo ========================================================
echo Press any key to close this launcher (services will keep running).
pause >nul

#!/bin/bash
echo "========================================================"
echo "  Starting main-link Multi-Modal Civic AI Architecture"
echo "========================================================"

echo "[1/3] Starting Python FastAPI + Playwright Pipeline (:8000)..."
(cd detection-pipeline && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
PID_FASTAPI=$!

echo "[2/3] Starting Node.js Express Backend (:5000)..."
(cd server && npm start) &
PID_EXPRESS=$!

echo "[3/3] Starting React Vite Frontend Client (:5173)..."
(cd client && npm run dev) &
PID_VITE=$!

trap "kill $PID_FASTAPI $PID_EXPRESS $PID_VITE; exit" INT TERM EXIT

echo ""
echo "All 3 services running:"
echo "- Frontend UI:        http://localhost:5173"
echo "- Express Backend:    http://localhost:5000"
echo "- Detection Pipeline: http://localhost:8000"
echo "- FastAPI Docs:       http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."
wait

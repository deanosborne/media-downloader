@echo off
echo ========================================
echo Building Media Downloader...
echo ========================================
cd frontend
call npm run build
cd ..

echo.
echo ========================================
echo Starting Server...
echo ========================================
cd backend
call npm start

#!/bin/bash

echo "========================================"
echo "Building Media Downloader..."
echo "========================================"
cd frontend
npm run build
cd ..

echo ""
echo "========================================"
echo "Starting Server..."
echo "========================================"
cd backend
npm start

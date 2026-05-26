@echo off
title Mentra Manager Local Server
echo Starting Mentra Manager Local Server...
echo ---------------------------------------
echo Opening browser to http://localhost:8000/index.html
start http://localhost:8000/index.html
echo Running HTTP server on port 8000...
python -m http.server 8000
pause

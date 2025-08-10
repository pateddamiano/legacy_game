@echo off
echo ========================================
echo   FIRST OFF - Brooklyn Street Mini Game
echo ========================================
echo.
echo Starting local game server...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Node.js detected! Starting Node.js server...
    echo.
    
    :: Check if node_modules exists
    if not exist "node_modules" (
        echo Installing dependencies...
        npm install
        echo.
    )
    
    echo Starting game server on http://localhost:8080
    echo Press Ctrl+C to stop the server
    echo.
    npm start
    goto :end
)

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python detected! Starting Python server...
    echo.
    echo Starting game server on http://localhost:8080
    echo Press Ctrl+C to stop the server
    echo.
    python python_server.py
    goto :end
)

:: Check if Python 3 is installed
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python 3 detected! Starting Python server...
    echo.
    echo Starting game server on http://localhost:8080
    echo Press Ctrl+C to stop the server
    echo.
    python3 python_server.py
    goto :end
)

:: No server available
echo ========================================
echo   ERROR: No compatible server found
echo ========================================
echo.
echo Please install one of the following:
echo.
echo 1. Node.js (Recommended)
echo    Download from: https://nodejs.org
echo    Then run: npm install
echo.
echo 2. Python 3.6+
echo    Download from: https://python.org
echo.
echo Alternatively, you can:
echo - Open game-launcher.html directly in your browser
echo - Use any other local web server
echo.
echo Press any key to exit...
pause >nul

:end
echo.
echo Thanks for playing First Off!
pause
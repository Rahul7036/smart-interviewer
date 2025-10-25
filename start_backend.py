#!/usr/bin/env python3
"""
Smart Interviewer Backend Startup Script
This script starts the Python Flask backend server for the Smart Interviewer extension.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import flask_cors
        import requests
        print("✅ Required dependencies found")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r backend/requirements-windows.txt")
        return False

def check_env_file():
    """Check if environment file exists and create example if not"""
    env_file = Path("backend/.env")
    env_example = Path("backend/env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("⚠️  .env file not found, creating from example...")
            with open(env_example, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            print("✅ Created .env file from example")
            print("📝 Please edit backend/.env and add your API keys")
        else:
            print("❌ No environment configuration found")
            return False
    else:
        print("✅ Environment file found")
    
    return True

def load_env_vars():
    """Load environment variables from .env file"""
    try:
        from dotenv import load_dotenv
        load_dotenv("backend/.env")
        print("✅ Environment variables loaded")
        return True
    except ImportError:
        print("❌ python-dotenv not installed")
        return False

def check_api_key():
    """Check if API key is configured"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("⚠️  GEMINI_API_KEY not configured in .env file")
        print("📝 Please add your Gemini API key to backend/.env")
        return False
    print("✅ API key configured")
    return True

def start_server():
    """Start the Flask server"""
    print("\n🚀 Starting Smart Interviewer Backend Server...")
    print("📍 Server will be available at: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop the server\n")
    
    try:
        # Change to backend directory
        os.chdir("backend")
        
        # Start the Flask app
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print("🎤 Smart Interviewer Backend Startup")
    print("=" * 40)
    
    # Check requirements
    if not check_python_version():
        sys.exit(1)
    
    if not check_dependencies():
        print("\n💡 To install dependencies, run:")
        print("   pip install -r backend/requirements.txt")
        sys.exit(1)
    
    if not check_env_file():
        sys.exit(1)
    
    if not load_env_vars():
        print("\n💡 To install python-dotenv, run:")
        print("   pip install python-dotenv")
        sys.exit(1)
    
    # Check API key (warning only, don't exit)
    check_api_key()
    
    print("\n" + "=" * 40)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()

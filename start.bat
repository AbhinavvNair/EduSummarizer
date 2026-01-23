@echo off
echo 🚀 Starting EduSummarizer...
call .venv\Scripts\activate
start http://127.0.0.1:8000
uvicorn main:app --reload
pause
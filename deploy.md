✅ Step 1 — Go to Backend Folder
cd C:\Projects\langchain\sda\backend

✅ Step 2 — Check If .venv Exists
dir


You should see:

.venv


If you don’t see .venv, create it first:

python -m venv .venv

✅ Step 3 — Activate Virtual Environment (Windows CMD)
.venv\Scripts\activate


After activation, you should see:

(.venv) C:\Projects\langchain\sda\backend>


That means it's active ✅

🟦 If Using PowerShell Instead

Use:

.venv\Scripts\Activate.ps1


If execution policy blocks it, run once:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


Then try again.

✅ Step 4 — Verify It’s Active

Run:

where python


It should point to:

C:\Projects\langchain\sda\backend\.venv\Scripts\python.exe

🚀 After Activation

Install requirements:

pip install -r requirements.txt


Then run backend:

python -m uvicorn app.main:app --reload --port 8000
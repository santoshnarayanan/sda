# Backend deployment fastapi code

## Step 1 — Go to Backend Folder

```bash
cd C:\Projects\langchain\sda\backend
```

## Step 2 — Check If .venv Exists

```bash
dir
```

- You should see:

```bash
.venv
```

- If you don’t see .venv, create it first:

```bash
python -m venv .venv
```

## Step 3 — Activate Virtual Environment (Windows CMD)

```bash
.venv\Scripts\activate
```

- After activation, you should see:

```bash
(.venv) C:\Projects\langchain\sda\backend>
```

- That means it's active ✅

- 🟦 If Using PowerShell Instead

- Use:

```bash
.venv\Scripts\Activate.ps1
```

- If execution policy blocks it, run once:

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

- Then try again.

## Step 4 — Verify It’s Active

Run:

- where python executable path is

- It should point to:

```bash
C:\Projects\langchain\sda\backend\.venv\Scripts\python.exe
```

- 🚀 After Activation

- Install requirements:

```bash
pip install -r requirements.txt
```

- Then run backend:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

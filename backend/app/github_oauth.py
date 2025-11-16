# app/github_oauth.py
import os
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET")
# Redirect back to SPA root by default (React)
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://localhost:5173/")
GITHUB_OAUTH_SCOPE = os.environ.get("GITHUB_OAUTH_SCOPE", "repo")

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_BASE = "https://api.github.com"


class GithubOAuthError(Exception):
    pass


def build_github_login_url(state: str) -> str:
    """
    Build the GitHub OAuth authorize URL.
    'state' is provided by the caller (frontend) for CSRF protection.
    """
    if not GITHUB_CLIENT_ID:
        raise GithubOAuthError("GITHUB_CLIENT_ID is not configured")

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": GITHUB_OAUTH_SCOPE,
        "state": state,
        "allow_signup": "true",
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchange OAuth 'code' for an access token.
    Returns JSON like { access_token, token_type, scope, ... }.
    """
    if not (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET):
        raise GithubOAuthError("GitHub OAuth client is not configured")

    async with httpx.AsyncClient() as client:
        headers = {"Accept": "application/json"}
        data = {
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_REDIRECT_URI,
        }
        resp = await client.post(GITHUB_TOKEN_URL, headers=headers, data=data, timeout=20.0)
        resp.raise_for_status()
        payload = resp.json()
        if "error" in payload:
            raise GithubOAuthError(str(payload))
        if "access_token" not in payload:
            raise GithubOAuthError("No access_token field in GitHub response")
        return payload


async def get_github_user(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        resp = await client.get(f"{GITHUB_API_BASE}/user", headers=headers, timeout=20.0)
        resp.raise_for_status()
        return resp.json()


async def list_repos(access_token: str) -> List[Dict[str, Any]]:
    """
    List repos accessible by the authenticated user.
    We keep this simple (single page), which is fine for a demo.
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        # You can tune per_page as needed
        resp = await client.get(f"{GITHUB_API_BASE}/user/repos?per_page=100", headers=headers, timeout=30.0)
        resp.raise_for_status()
        return resp.json()


async def download_repo_zip(access_token: str, full_name: str, ref: Optional[str] = None) -> Tuple[bytes, str]:
    """
    Download repo ZIP via GitHub codeload host.
    Must allow redirect following.
    """
    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        if ref:
            url = f"https://api.github.com/repos/{full_name}/zipball/{ref}"
        else:
            url = f"https://api.github.com/repos/{full_name}/zipball"

        resp = await client.get(url, headers=headers)
        resp.raise_for_status()

        resolved_ref = resp.headers.get("Content-Disposition", ref or "unknown")
        return resp.content, resolved_ref

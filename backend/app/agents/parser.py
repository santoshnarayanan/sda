# backend/app/agents/parser.py

import re
from typing import List
from ..models import DeploymentFile

# Match fenced code blocks:
# ```yaml
# ...content...
# ```
BLOCK_PATTERN = re.compile(
    r"```(?P<lang>[a-zA-Z0-9]*)\s*(?P<content>.*?)```",
    re.DOTALL
)

# More robust filename detection:
# Supports:
#   # filename: Dockerfile
#   // filename: app.yaml
#   filename = docker-compose.yml
#   File: ci.yml
FILENAME_PATTERN = re.compile(
    r"(?:#|//)?\s*(?:filename|file)\s*[:=]\s*(?P<filename>[^\s]+)",
    re.IGNORECASE
)


def infer_filename_from_lang(lang: str, index: int) -> str:
    """
    Fallback filename inference if no explicit filename is found.
    """
    lang = (lang or "").lower()

    if lang == "dockerfile":
        return "Dockerfile"
    elif lang in ["yaml", "yml"]:
        return f"deployment_{index}.yaml"
    elif lang in ["json"]:
        return f"config_{index}.json"
    elif lang in ["bash", "sh"]:
        return f"script_{index}.sh"
    else:
        return f"artifact_{index}.txt"


def parse_deployment_artifacts(markdown: str) -> List[DeploymentFile]:
    """
    Extract deployment artifacts from DevOps agent markdown output.

    - Extracts fenced code blocks.
    - Detects filename via comment patterns.
    - Falls back to inferred filename if missing.
    - Returns structured DeploymentFile list.
    """

    files: List[DeploymentFile] = []

    for idx, match in enumerate(BLOCK_PATTERN.finditer(markdown), start=1):
        lang = match.group("lang")
        full_block = match.group("content").strip()

        # Try to detect filename
        file_match = FILENAME_PATTERN.search(full_block)

        if file_match:
            filename = file_match.group("filename").strip()

            # Remove filename declaration from content
            cleaned_content = FILENAME_PATTERN.sub("", full_block).strip()
        else:
            # Fallback inference
            filename = infer_filename_from_lang(lang, idx)
            cleaned_content = full_block.strip()

        # Avoid adding empty files
        if cleaned_content:
            files.append(
                DeploymentFile(
                    filename=filename,
                    content=cleaned_content
                )
            )

    return files
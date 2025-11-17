# backend/app/agents/parser.py
import re
from typing import List
from ..models import DeploymentFile

# Matches fenced code blocks like:
# ```yaml
# # filename: deployment.yaml
# apiVersion: ...
# ```
BLOCK_PATTERN = re.compile(
    r"```(?P<lang>[a-zA-Z0-9]*)\s*(?P<content>.*?)```",
    re.DOTALL
)

# Extract embedded filename from comment:
# # filename: Dockerfile
FILENAME_PATTERN = re.compile(
    r"filename\s*:\s*(?P<filename>[^\s]+)",
    re.IGNORECASE
)


def parse_deployment_artifacts(markdown: str) -> List[DeploymentFile]:
    """
    Given the markdown output of the DevOps agent, extract all deployment
    artifacts as structured DeploymentFile objects.
    """
    files: List[DeploymentFile] = []

    for match in BLOCK_PATTERN.finditer(markdown):
        full_block = match.group("content").strip()

        # Try to detect a filename from "# filename: ..."
        file_match = FILENAME_PATTERN.search(full_block)
        if not file_match:
            # Skip blocks without filenames
            continue

        filename = file_match.group("filename").strip()

        # Remove the filename comment from the content
        cleaned = FILENAME_PATTERN.sub("", full_block).strip()

        files.append(DeploymentFile(
            filename=filename,
            content=cleaned
        ))

    return files

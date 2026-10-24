import os
import shutil
import zipfile
import hashlib
from pathlib import Path
from typing import Optional
from app.config import settings
from app.security.path_security import sanitize_filename, safe_resolve_path, PathTraversalError
from app.crawler.url_normalizer import url_to_relative_filepath

class FileStorageManager:
    def __init__(self, base_crawls_dir: Optional[Path] = None):
        self.crawls_dir = (base_crawls_dir or settings.CRAWLS_DIR).resolve()
        self.crawls_dir.mkdir(parents=True, exist_ok=True)

    def get_job_dir(self, job_id: str) -> Path:
        """Returns the isolated directory for a job, creating it if needed."""
        job_dir = safe_resolve_path(self.crawls_dir, job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    def get_pages_dir(self, job_id: str) -> Path:
        """Returns the pages/ directory for a job."""
        pages_dir = self.get_job_dir(job_id) / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)
        return pages_dir

    def save_website_page(
        self,
        job_id: str,
        url: str,
        markdown_content: str
    ) -> tuple[Path, str]:
        """
        Saves a website page under the job's pages directory.
        Preserves URL path hierarchy and avoids collisions.
        Returns (absolute_file_path, relative_file_path).
        """
        pages_dir = self.get_pages_dir(job_id)
        rel_path = url_to_relative_filepath(url)
        dest_path = safe_resolve_path(pages_dir, rel_path)

        # Check collision: if file exists and has different content or source URL,
        # prevent collision by adding short hash
        if dest_path.exists():
            # Read existing frontmatter to see if it's the same URL
            try:
                with open(dest_path, "r", encoding="utf-8") as f:
                    first_lines = "".join([f.readline() for _ in range(15)])
                if url not in first_lines:
                    url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:6]
                    base, ext = os.path.splitext(rel_path)
                    rel_path = f"{base}--{url_hash}{ext}"
                    dest_path = safe_resolve_path(pages_dir, rel_path)
            except Exception:
                pass

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        # Return relative to job directory
        rel_to_job = str(dest_path.relative_to(self.get_job_dir(job_id))).replace("\\", "/")
        return dest_path, rel_to_job

    def save_wikipedia_page(
        self,
        job_id: str,
        title: str,
        page_id: int,
        language: str,
        markdown_content: str
    ) -> tuple[Path, str]:
        """
        Saves a Wikipedia page under:
        pages/wikipedia/<lang>/<sanitized_title>--<page_id>.md
        Returns (absolute_file_path, relative_file_path).
        """
        pages_dir = self.get_pages_dir(job_id)
        safe_title = sanitize_filename(title.lower().replace(" ", "_"))
        filename = f"{safe_title}--{page_id}.md"
        rel_path = f"wikipedia/{sanitize_filename(language)}/{filename}"
        
        dest_path = safe_resolve_path(pages_dir, rel_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        rel_to_job = str(dest_path.relative_to(self.get_job_dir(job_id))).replace("\\", "/")
        return dest_path, rel_to_job

    def read_page_content(self, job_id: str, relative_path: str) -> str:
        """Safely reads a markdown document from a job directory."""
        job_dir = self.get_job_dir(job_id)
        target_path = safe_resolve_path(job_dir, relative_path)
        if not target_path.exists() or not target_path.is_file():
            raise FileNotFoundError(f"File '{relative_path}' not found in job '{job_id}'.")
        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()

    def create_job_zip(self, job_id: str) -> Path:
        """
        Packages the entire job directory (pages + manifest.json) into a ZIP archive.
        Returns the path to the created ZIP file.
        """
        job_dir = self.get_job_dir(job_id)
        zip_path = self.crawls_dir / f"{job_id}.zip"

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(job_dir):
                for file in files:
                    file_path = Path(root) / file
                    # Skip the zip itself if it was somehow in the folder
                    if file_path == zip_path:
                        continue
                    arcname = file_path.relative_to(job_dir)
                    zip_file.write(file_path, arcname)

        return zip_path

file_storage = FileStorageManager()

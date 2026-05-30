import React from "react";
import { Github, Globe } from "lucide-react";

export const GITHUB_REPO_URL = "https://github.com/chayprabs/drive-md-editor";
export const TWITTER_URL = "https://x.com/chayprabs";
export const WEBSITE_URL = "https://www.chaitanyaprabuddha.com";

function XIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

export function SiteTopbar(): React.ReactElement {
  return (
    <header className="site-topbar">
      <div className="site-topbar-brand">
        <img src="/icon.svg" alt="" width={24} height={24} />
        <span>MarkDrive</span>
      </div>
      <nav className="site-topbar-links" aria-label="External links">
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" title="GitHub repository">
          <Github size={18} aria-hidden="true" />
          <span className="sr-only">GitHub</span>
        </a>
        <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" title="X (Twitter)">
          <XIcon />
          <span className="sr-only">X</span>
        </a>
        <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" title="Personal website">
          <Globe size={18} aria-hidden="true" />
          <span className="sr-only">Website</span>
        </a>
      </nav>
    </header>
  );
}

export function SeoBar(): React.ReactElement {
  return (
    <section className="seo-bar" aria-label="Product summary">
      <p>
        <strong>MarkDrive</strong> edits, previews, and saves Markdown files directly in Google Drive—live preview,
        syntax highlighting, Mermaid diagrams, and KaTeX math, with saves back to the same Drive file.
      </p>
    </section>
  );
}

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="site-footer">
      <nav aria-label="Legal">
        <a href="/privacy.html">Privacy Policy</a>
        <span className="site-footer-sep" aria-hidden="true">
          ·
        </span>
        <a href="/terms.html">Terms &amp; Conditions</a>
      </nav>
    </footer>
  );
}

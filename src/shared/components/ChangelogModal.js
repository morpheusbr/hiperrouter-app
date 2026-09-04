"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { marked } from "marked";
import { GITHUB_CONFIG } from "@/shared/constants/config";

marked.setOptions({ gfm: true, breaks: true });

const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
  "strong", "em", "b", "i", "s", "del", "span", "div", "a"
]);

function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().replace(/[\u0000-\u001f\u007f-\u009f\s]/g, "");
  return /^https?:\/\//i.test(trimmed) || /^#[a-zA-Z0-9_-]+$/.test(trimmed);
}

function cleanNode(node, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || "");
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      const frag = doc.createDocumentFragment();
      for (const child of Array.from(node.childNodes)) {
        const cleanedChild = cleanNode(child, doc);
        if (cleanedChild) frag.appendChild(cleanedChild);
      }
      return frag;
    }

    const cleanEl = doc.createElement(tagName);
    if (tagName === "a") {
      const rawHref = node.getAttribute("href");
      if (rawHref && isSafeUrl(rawHref)) {
        cleanEl.setAttribute("href", rawHref.trim());
        cleanEl.setAttribute("target", "_blank");
        cleanEl.setAttribute("rel", "noopener noreferrer");
      }
      const title = node.getAttribute("title");
      if (title) cleanEl.setAttribute("title", title.slice(0, 200));
    } else if (tagName === "code" || tagName === "span" || tagName === "pre") {
      const cls = node.getAttribute("class");
      if (cls && /^[a-zA-Z0-9_\s-]+$/.test(cls)) {
        cleanEl.setAttribute("class", cls);
      }
    }

    for (const child of Array.from(node.childNodes)) {
      const cleanedChild = cleanNode(child, doc);
      if (cleanedChild) cleanEl.appendChild(cleanedChild);
    }
    return cleanEl;
  }
  return null;
}

function sanitizeHtmlContent(rawHtml) {
  if (typeof window === "undefined" || !rawHtml) return "";
  try {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");
    const container = doc.createElement("div");
    for (const child of Array.from(doc.body.childNodes)) {
      const cleaned = cleanNode(child, doc);
      if (cleaned) container.appendChild(cleaned);
    }
    return container.innerHTML;
  } catch {
    return "";
  }
}

export default function ChangelogModal({ isOpen, onClose }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen || html) return;
    setLoading(true);
    setError("");
    fetch(GITHUB_CONFIG.changelogUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((md) => {
        const rawParsed = marked.parse(md);
        setHtml(sanitizeHtmlContent(rawParsed));
      })
      .catch((err) => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [isOpen, html]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-3xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold text-text-main">Change Log</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Loading...
            </div>
          )}
          {error && (
            <div className="text-red-500 py-4">Failed to load changelog: {error}</div>
          )}
          {!loading && !error && html && (
            <div
              className="changelog-body text-text-main"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

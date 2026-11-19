/**
 * Keeps canonical / description / robots / Open Graph in step with the current
 * route during client-side navigation.  Direct loads already get the right
 * <head> from the build-time prerender (scripts/prerender.ts); without this a
 * user who navigates / → /lunch would keep the homepage's canonical.
 *
 * Mounted before <Router /> so page-level effects (language-aware titles) run
 * after it and win.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { SITE_NAME, canonicalUrl, findPublicPage, pageDescription, pageTitle } from "@shared/seo";

const FALLBACK_DESCRIPTION = "KSYK Maps — campus map and navigation for Kulosaaren yhteiskoulu.";

function headTag<K extends "meta" | "link">(tag: K, selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

const removeTag = (selector: string) => document.head.querySelector(selector)?.remove();

const setMeta = (attr: "name" | "property", key: string, content: string) =>
  headTag("meta", `meta[${attr}="${key}"]`, { [attr]: key, content });

export function applyRouteMeta(path: string) {
  const page = findPublicPage(path);
  if (!page) {
    // Private screens, aliases and unknown URLs: never claim a canonical.
    removeTag('link[rel="canonical"]');
    removeTag('meta[property="og:url"]');
    setMeta("name", "robots", "noindex, nofollow");
    setMeta("name", "description", FALLBACK_DESCRIPTION);
    document.title = SITE_NAME;
    return;
  }
  const title = pageTitle(page.path);
  const description = pageDescription(page.path);
  const url = canonicalUrl(page.path);
  removeTag('meta[name="robots"]');
  headTag("link", 'link[rel="canonical"]', { rel: "canonical", href: url });
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  document.title = title;
}

export default function RouteMeta() {
  const [path] = useLocation();
  useEffect(() => applyRouteMeta(path), [path]);
  return null;
}

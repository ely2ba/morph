"use client";

import { Check, Copy, ExternalLink, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

type PromptLink = { href: string; label: string };

export function AssistantPromptPanel({
  prompts,
  links,
  className = "",
}: {
  prompts: string[];
  links: PromptLink[];
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const open = () => {
    setCopied(null);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const copy = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(index);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className={`assistant-prompt-shell ${className}`.trim()}>
      <button type="button" className="assistant-prompt-trigger" onClick={open}>
        <Sparkles size={14} aria-hidden="true" />
        Works with your browser assistant
      </button>
      <dialog
        ref={dialogRef}
        className="assistant-prompt-dialog"
        aria-labelledby="assistant-prompt-title"
      >
        <button
          type="button"
          className="assistant-prompt-close"
          onClick={close}
          aria-label="Close things you can ask"
        >
          <X aria-hidden="true" />
        </button>
        <p className="assistant-prompt-kicker">WebMCP on this page</p>
        <h2 id="assistant-prompt-title">
          Ask this page to become the interface you need.
        </h2>
        <section aria-labelledby="assistant-prompt-gallery-title">
          <h3 id="assistant-prompt-gallery-title">Things you can ask</h3>
          <div className="assistant-prompt-gallery">
            {prompts.map((prompt, index) => (
              <article key={prompt}>
                <p>“{prompt}”</p>
                <button type="button" onClick={() => void copy(prompt, index)}>
                  {copied === index ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <Copy size={15} aria-hidden="true" />
                  )}
                  {copied === index ? "Copied" : "Copy request"}
                </button>
              </article>
            ))}
          </div>
        </section>
        <nav aria-label="Explore Morph">
          <Link href="/showcase">
            Project showcase <ExternalLink size={14} aria-hidden="true" />
          </Link>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </dialog>
    </div>
  );
}

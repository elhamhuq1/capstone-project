'use client';

import { useEffect, useState } from 'react';

/**
 * Detects browser writing assistants (Grammarly, Google Gemini "Help me write")
 * and suppresses them via DOM attributes + shows a toast warning.
 */
export default function WritingAssistantBlocker() {
  const [warning, setWarning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ── Suppress Grammarly on all textareas and contenteditable elements ──
    function disableGrammarlyOnElement(el: HTMLElement) {
      el.setAttribute('data-gramm', 'false');
      el.setAttribute('data-gramm_editor', 'false');
      el.setAttribute('data-enable-grammarly', 'false');
    }

    // Apply to existing elements
    document.querySelectorAll('textarea, [contenteditable="true"]').forEach((el) => {
      disableGrammarlyOnElement(el as HTMLElement);
    });

    // Watch for new textareas/contenteditable elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.tagName === 'TEXTAREA' || node.getAttribute('contenteditable') === 'true') {
              disableGrammarlyOnElement(node);
            }
            node.querySelectorAll('textarea, [contenteditable="true"]').forEach((el) => {
              disableGrammarlyOnElement(el as HTMLElement);
            });
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ── Detect Grammarly ──
    const detected: string[] = [];

    const grammarlyPresent =
      document.querySelector('grammarly-desktop-integration') !== null ||
      document.querySelector('grammarly-extension') !== null ||
      document.querySelector('[data-grammarly-shadow-root]') !== null ||
      document.querySelector('.grammarly-desktop-integration') !== null;

    if (grammarlyPresent) {
      detected.push('Grammarly');
    }

    // ── Detect Google Gemini "Help me write" ──
    // Chrome's built-in writing assistance features
    const geminiPresent =
      document.querySelector('[data-help-me-write]') !== null ||
      document.querySelector('.gm-help-me-write') !== null ||
      document.querySelector('div[aria-label="Help me write"]') !== null;

    if (geminiPresent) {
      detected.push('Google Gemini');
    }

    // Delayed re-check (extensions sometimes inject late)
    const recheckTimer = setTimeout(() => {
      const lateGrammarly =
        document.querySelector('grammarly-desktop-integration') !== null ||
        document.querySelector('grammarly-extension') !== null ||
        document.querySelector('[data-grammarly-shadow-root]') !== null;

      if (lateGrammarly && !detected.includes('Grammarly')) {
        detected.push('Grammarly');
      }

      if (detected.length > 0) {
        setWarning(
          `Please disable ${detected.join(' and ')} for this study. Writing assistants may interfere with the research results.`
        );
      }
    }, 2000);

    // Show immediately if already detected
    if (detected.length > 0) {
      setWarning(
        `Please disable ${detected.join(' and ')} for this study. Writing assistants may interfere with the research results.`
      );
    }

    // ── Suppress right-click "Help me write" by overriding context menu briefly ──
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
        // Set a writing-tools=none attribute to tell the browser not to inject smart features
        target.setAttribute('writingsuggestions', 'false');
        // Apple's writing tools attribute
        target.setAttribute('writing-tools', 'none');
      }
    }

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      observer.disconnect();
      clearTimeout(recheckTimer);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  if (!warning || dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        maxWidth: '560px',
        width: 'calc(100% - 32px)',
        backgroundColor: '#111010',
        color: '#F4F2ED',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        animation: 'toastSlideIn 0.3s ease-out',
        fontFamily: 'var(--font-inter), sans-serif',
      }}
    >
      {/* Warning icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
        <path d="M10 2L18 17H2L10 2Z" stroke="#D4C17A" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 8V11" stroke="#D4C17A" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="14" r="0.75" fill="#D4C17A" />
      </svg>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          {warning}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9A9790', lineHeight: 1.4 }}>
          Check your browser extensions and Chrome Settings → AI → &quot;Help me write&quot;.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss warning"
        style={{
          background: 'none',
          border: 'none',
          color: '#9A9790',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

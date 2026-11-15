'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type ShortcutCategory = 'All' | 'Customer' | 'Branch Staff' | 'Master Admin' | 'Mobile (Android & iOS)';

interface ShortcutEntry {
  id: string;
  category: Exclude<ShortcutCategory, 'All'>;
  action: string;
  description: string;
  keys: string[];
  platform: 'PC' | 'Mobile' | 'Both';
}

const KEYMAP_ENTRIES: ShortcutEntry[] = [
  // Customer Shortcuts
  {
    id: 'cust-enter-name',
    category: 'Customer',
    action: 'Jump Name → Phone → Measurements',
    description: 'Press Enter inside Full Name to focus Phone Number, or inside Phone Number to continue to Measurements.',
    keys: ['Enter'],
    platform: 'Both',
  },
  {
    id: 'cust-alt-steps',
    category: 'Customer',
    action: 'Previous / Next Order Step',
    description: 'Move backward or forward between Step 1 (Design), Step 2 (Measurements), and Step 3 (Payment).',
    keys: ['Alt', '← / →'],
    platform: 'PC',
  },
  {
    id: 'cust-track-search',
    category: 'Customer',
    action: 'Focus Order Reference / Search Bar',
    description: 'Focus the tracking lookup or search input on the current page immediately.',
    keys: ['/'],
    platform: 'PC',
  },
  {
    id: 'cust-submit-chat',
    category: 'Customer',
    action: 'Send Negotiation or Support Message',
    description: 'Submit multi-line price counter-offers or Atelier Concierge messages without leaving the keyboard.',
    keys: ['Ctrl', 'Enter'],
    platform: 'PC',
  },

  // Branch Staff Shortcuts
  {
    id: 'staff-floor-nav',
    category: 'Branch Staff',
    action: 'Switch Floor Queue / School Projects',
    description: 'Jump directly between Active Floor Queue (Alt+1) and School Projects (Alt+2).',
    keys: ['Alt', '1 .. 2'],
    platform: 'PC',
  },
  {
    id: 'staff-quick-search',
    category: 'Branch Staff',
    action: 'Quick Search Assigned Orders',
    description: 'Jump straight to the order reference / customer filter input on the workshop floor.',
    keys: ['Ctrl', 'K'],
    platform: 'PC',
  },

  // Master Admin Shortcuts
  {
    id: 'admin-rail-nav',
    category: 'Master Admin',
    action: 'Switch Admin Workspace Modules',
    description: 'Alt+1 Dashboard, Alt+2 Orders, Alt+3 Support Inbox, Alt+4 School Projects, Alt+5 Child Shops, Alt+6 Catalog, Alt+7 Artisan Floor.',
    keys: ['Alt', '1 .. 7'],
    platform: 'PC',
  },
  {
    id: 'admin-save-form',
    category: 'Master Admin',
    action: 'Save Active Form / Pricing / Project',
    description: 'Triggers the primary Save / Update action on the active admin form instead of browser Save Page.',
    keys: ['Ctrl', 'S'],
    platform: 'PC',
  },
  {
    id: 'admin-keymap',
    category: 'Master Admin',
    action: 'Open Keymap & Shortcuts Cheatsheet',
    description: 'Opens this searchable PyCharm-style shortcut reference from any screen.',
    keys: ['?'],
    platform: 'PC',
  },
  {
    id: 'global-esc',
    category: 'Master Admin',
    action: 'Close Active Modal / Lightbox / Drawer',
    description: 'Dismisses open zoom previews, confirmation modals, or this keymap window.',
    keys: ['Esc'],
    platform: 'PC',
  },

  // Android & iPhone Touch / Virtual Keyboard Ergonomics
  {
    id: 'mobile-tel-pad',
    category: 'Mobile (Android & iOS)',
    action: 'Auto Numeric Dialpad on Phone Fields',
    description: 'Automatically opens the large 0–9 phone keypad on Android & iPhone with a Next key.',
    keys: ['Phone Dialpad', 'Next'],
    platform: 'Mobile',
  },
  {
    id: 'mobile-decimal-pad',
    category: 'Mobile (Android & iOS)',
    action: 'Auto Decimal Keypad on Prices & Quotes',
    description: 'Opens numeric keypad for Naira amounts, counter-offers, and garment counts.',
    keys: ['123 Keypad', 'Next'],
    platform: 'Mobile',
  },
  {
    id: 'mobile-search-key',
    category: 'Mobile (Android & iOS)',
    action: 'Native Search / Go Return Key',
    description: 'Converts the Android/iOS keyboard Return button into a blue Search/Go action on Order Tracking.',
    keys: ['Keyboard Search'],
    platform: 'Mobile',
  },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export default function KeyboardAndTouchManager() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ShortcutCategory>('All');

  // Enhance Android & iPhone virtual keyboards automatically across all inputs
  useEffect(() => {
    const enhanceInputs = () => {
      const inputs = document.querySelectorAll<HTMLInputElement>('input');
      inputs.forEach((inp) => {
        const type = (inp.getAttribute('type') || 'text').toLowerCase();
        const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
        const aria = (inp.getAttribute('aria-label') || '').toLowerCase();
        const combined = `${type} ${placeholder} ${aria}`;

        if (type === 'tel' || combined.includes('phone') || combined.includes('whatsapp') || combined.includes('080')) {
          if (!inp.hasAttribute('inputmode')) inp.setAttribute('inputmode', 'tel');
          if (!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint', 'next');
        } else if (type === 'number' || combined.includes('price') || combined.includes('amount') || combined.includes('₦')) {
          if (!inp.hasAttribute('inputmode')) inp.setAttribute('inputmode', 'decimal');
          if (!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint', 'next');
        } else if (
          type === 'search' ||
          combined.includes('search') ||
          combined.includes('ord-') ||
          combined.includes('reference') ||
          combined.includes('track')
        ) {
          if (!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint', 'search');
        } else if (type === 'text' || type === 'email') {
          if (!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint', 'next');
        }
      });
    };

    enhanceInputs();
    const observer = new MutationObserver(() => enhanceInputs());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  // Listen for custom open event from Admin Sidebar Rail
  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    window.addEventListener('mktf:open-keymap', openHandler);
    return () => window.removeEventListener('mktf:open-keymap', openHandler);
  }, []);

  // Global PC keyboard shortcuts (conflict-free)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);

      // 1. Esc closes Keymap dialog or any open modal/lightbox
      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
        const closeBtn = document.querySelector<HTMLElement>(
          '[data-modal-close], [aria-label="Close"], [aria-label="Close modal"], [aria-label="Close preview"]'
        );
        if (closeBtn) {
          closeBtn.click();
        }
        return;
      }

      // 2. '?' or Ctrl+/ / Cmd+/ opens PyCharm-style Keymap Cheatsheet
      if ((e.key === '?' && !typing) || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // 3. '/' or Ctrl+K / Cmd+K focuses primary search/lookup bar when not typing
      if ((!typing && e.key === '/') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="ORD-" i], input[placeholder*="Search" i], input[placeholder*="reference" i], input[placeholder*="Sani Musa" i]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // 4. Ctrl+S / Cmd+S triggers active form submit/save instead of browser Save Page
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const activeForm =
          (e.target instanceof HTMLElement ? e.target.closest('form') : null) ||
          document.querySelector<HTMLFormElement>('main form');
        const saveBtn =
          activeForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ||
          Array.from(document.querySelectorAll<HTMLButtonElement>('main button')).find((b) =>
            /save|submit|update|confirm|send quote/i.test(b.textContent || '')
          );
        if (saveBtn && !saveBtn.disabled) {
          e.preventDefault();
          saveBtn.click();
        }
        return;
      }

      // 5. Alt + 1..7 Workspace Navigation for Admin & Branch Staff
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-7]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (pathname.startsWith('/admin')) {
          const adminRoutes = [
            '/admin',
            '/admin/orders',
            '/admin/support',
            '/admin/school-projects',
            '/admin/shops',
            '/admin/catalog',
            '/staff/branch-floor',
          ];
          if (adminRoutes[idx]) {
            e.preventDefault();
            router.push(adminRoutes[idx]);
          }
        } else if (pathname.startsWith('/staff') || pathname.startsWith('/shop')) {
          const staffRoutes = ['/staff/branch-floor', '/staff/school-projects'];
          if (staffRoutes[idx]) {
            e.preventDefault();
            router.push(staffRoutes[idx]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pathname, router]);

  const filteredShortcuts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KEYMAP_ENTRIES.filter((item) => {
      const matchesTab = activeTab === 'All' || item.category === activeTab;
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        item.action.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [query, activeTab]);

  if (!isOpen) return null;

  const tabs: ShortcutCategory[] = [
    'All',
    'Customer',
    'Branch Staff',
    'Master Admin',
    'Mobile (Android & iOS)',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mktf-keymap-title"
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/90 text-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* PyCharm-Style Dialog Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg font-black">
              ⌨️
            </div>
            <div>
              <h2 id="mktf-keymap-title" className="text-base sm:text-lg font-extrabold text-white leading-tight">
                Keymap &amp; Quick Shortcuts Reference
              </h2>
              <p className="text-xs text-slate-400">
                PC keyboard accelerators &amp; Android / iPhone smart keypad rules across all 3 MKTF roles
              </p>
            </div>
          </div>

          <button
            type="button"
            data-modal-close
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            Esc ✕
          </button>
        </div>

        {/* Search & Role Filter Strip */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="relative">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter actions or keys (e.g. Alt, Enter, Save, Mobile, Track)..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcut Tree / Table */}
        <div className="overflow-y-auto divide-y divide-slate-800/80 px-5 py-2">
          {filteredShortcuts.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No shortcuts match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{item.action}</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.category === 'Master Admin'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : item.category === 'Branch Staff'
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : item.category === 'Customer'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.keys.map((k, i) => (
                    <React.Fragment key={k}>
                      {i > 0 && <span className="text-slate-500 text-xs font-bold">+</span>}
                      <kbd className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs font-bold shadow-inner">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Tip */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">?</kbd> anywhere on PC to open or close this Keymap.</span>
          <span className="text-amber-400 font-semibold">MKTF Ergonomic Engine</span>
        </div>
      </div>
    </div>
  );
}
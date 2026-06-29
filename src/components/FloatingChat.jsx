import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import ChatPanel from './ChatPanel';

export default function FloatingChat({ tasks, applyActions }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Panel */}
      {open && (
        <>
          {/* Click-outside-to-close scrim — dims on mobile (full-screen takeover),
              stays invisible but still click-catching on desktop so anything the
              panel happens to sit over remains reachable with one click to dismiss. */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Brink assistant"
            className="animate-slide-in-right fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:bottom-24 sm:right-4 lg:right-6 sm:w-[300px] xl:w-[380px] h-[min(640px,calc(100vh-2rem))] sm:h-[min(640px,calc(100vh-7rem))] rounded-2xl bg-(--color-surface) border border-(--color-border-strong) shadow-2xl flex flex-col overflow-hidden"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="absolute top-3 right-3 z-10 p-1 rounded-md text-(--color-text-faint) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) transition-all duration-150 hover:scale-105 active:scale-95"
            >
              <X size={15} />
            </button>
            <ChatPanel tasks={tasks} applyActions={applyActions} />
          </div>
        </>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className={`fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
          open
            ? 'bg-(--color-surface-raised) border border-(--color-border-strong) text-(--color-text-primary)'
            : 'bg-(--color-signal) text-(--color-void)'
        }`}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </>
  );
}

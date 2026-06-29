import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Mic, MicOff } from 'lucide-react';
import { api } from '../lib/api';

const SUGGESTIONS = [
  "I have an interview tomorrow at 10am",
  "What should I do right now?",
  "I'm behind on everything, replan my day",
];

export default function ChatPanel({ tasks, applyActions }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey!! I'm Brink. Tell me what's on your plate, or ask what to tackle first." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const send = async (text) => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;
    setInput('');
    const history = messages.slice(-8);
    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setLoading(true);
    try {
      const res = await api.chat(messageText, tasks, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.actions?.length) applyActions(res.actions);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Couldn't reach the assistant — mind trying again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-(--color-border-line) shrink-0">
        <Sparkles size={14} className="text-(--color-signal)" />
        <h2 className="text-sm font-semibold text-(--color-text-primary)">AI Assistant</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`animate-scale-in max-w-[88%] text-sm leading-relaxed px-3 py-2 rounded-xl ${
              m.role === 'user'
                ? 'self-end bg-(--color-signal) text-(--color-void)'
                : 'self-start bg-(--color-surface-raised) text-(--color-text-primary)'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start flex items-center gap-1 text-xs text-(--color-text-faint) px-3 py-2">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-text-faint) animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-text-faint) animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-text-faint) animate-bounce" />
            </span>
            Brink is thinking…
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex flex-col gap-1.5 mt-1">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-slide-up text-left text-xs text-(--color-text-muted) border border-(--color-border-line) rounded-lg px-3 py-2 transition-all duration-150 hover:border-(--color-signal)/40 hover:bg-(--color-signal-dim) hover:text-(--color-text-primary)"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 px-3 py-3 border-t border-(--color-border-line) shrink-0"
      >
        {recognitionRef.current && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={`shrink-0 p-2 rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
              listening
                ? 'border-(--color-danger) text-(--color-danger) bg-(--color-danger-dim)'
                : 'border-(--color-border-strong) text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover)'
            }`}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell Brink what's going on…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send"
          className="shrink-0 p-2 rounded-lg bg-(--color-signal) text-(--color-void) disabled:opacity-40 transition-all duration-150 hover:scale-105 active:scale-95 disabled:hover:scale-100"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

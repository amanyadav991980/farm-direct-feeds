import { SiteHeader } from "@/components/site-header";
import { Container } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  askAssistant,
  starterChips,
  type AssistantReply,
} from "@/lib/assistant";
import {
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
  SUPPORT_WHATSAPP_HREF,
} from "@/lib/support";
import { motion } from "framer-motion";
import {
  Bot,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  chips?: string[];
};

let nextId = 1;

const WELCOME: Message = {
  id: 0,
  role: "assistant",
  text:
    "Namaste! 🙏 I'm the Farm Direct assistant — here for farmers and buyers.\nAsk me anything about selling your harvest, buying fresh produce, orders, delivery, payments, coupons or offers. Hindi and English both work — just type your doubt below.",
};

/** Renders "**bold**" markers and "• " bullet lines from engine replies. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: number) => {
    if (bullets.length === 0) return null;
    const items = bullets;
    bullets = [];
    return (
      <ul key={key} className="my-1.5 space-y-1.5 pl-1">
        {items.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[9px] size-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{fmt(b)}</span>
          </li>
        ))}
      </ul>
    );
  };

  function fmt(s: string) {
    const parts = s.split("**");
    return parts.map((p, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold">
          {p}
        </strong>
      ) : (
        <Fragment key={i}>{p}</Fragment>
      ),
    );
  }

  let key = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("• ")) {
      bullets.push(t.slice(2));
    } else {
      const list = flush(key++);
      if (list) out.push(list);
      if (t) out.push(<p key={key++}>{fmt(t)}</p>);
    }
  }
  const tail = flush(key++);
  if (tail) out.push(tail);
  return <>{out}</>;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timers = useRef<number[]>([]);

  const send = (raw: string) => {
    const question = raw.trim();
    if (!question || typing) return;
    setMessages((m) => [...m, { id: nextId++, role: "user", text: question }]);
    setInput("");
    setTyping(true);

    // Simulate a short "thinking" beat so the conversation reads naturally.
    timers.current.push(
      window.setTimeout(() => {
        const reply: AssistantReply = askAssistant(question);
        setMessages((m) => [
          ...m,
          { id: nextId++, role: "assistant", text: reply.text, chips: reply.chips },
        ]);
        setTyping(false);
      }, 520 + Math.random() * 550),
    );
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setTyping(false);
    setMessages([WELCOME]);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const role = user?.role ?? null;
  const chips = starterChips(role);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        {/* Page heading */}
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Farm Direct assistant
          </p>
          <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
            Have a doubt? Ask away.
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Instant answers for farmers and buyers — listing and selling,
            buying, orders, delivery, payments and offers. And when you need a
            person, the team is one tap away.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          {/* ───────────────────────── Chat panel ───────────────────────── */}
          <section className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
            <header className="flex items-center gap-3 border-b border-border/70 bg-card/70 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Bot className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[15px] font-bold">
                  Farm Direct Assistant
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-600" /> Online
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Farmers &amp; buyers · हिन्दी और English
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={reset}
              >
                <RotateCcw className="size-3.5" /> New chat
              </Button>
            </header>

            {/* Conversation */}
            <div
              ref={scrollRef}
              className="flex h-[440px] flex-col gap-4 overflow-y-auto px-5 py-5 sm:h-[480px]"
            >
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={
                    m.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div className="max-w-[88%] sm:max-w-[80%]">
                    <div
                      className={
                        m.role === "user"
                          ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[14px] leading-6 text-primary-foreground shadow-sm"
                          : "rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-2.5 text-[14px] leading-6 text-foreground"
                      }
                    >
                      {m.role === "assistant" ? (
                        <Rich text={m.text} />
                      ) : (
                        <p>{m.text}</p>
                      )}
                    </div>
                    {m.role === "assistant" && m.chips && m.chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.chips.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => send(c)}
                            className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary/15"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {typing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-3.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <footer className="border-t border-border/70 bg-card/70 p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3 text-primary" /> Try asking
                </span>
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => send(c)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question… e.g. “How do I sell my tomatoes?”"
                  className="h-12 flex-1 rounded-2xl bg-background text-[14px]"
                  aria-label="Your question for the assistant"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-12 shrink-0 rounded-2xl"
                  disabled={!input.trim() || typing}
                  aria-label="Send question"
                >
                  <Send className="size-5" />
                </Button>
              </form>
              <p className="mt-2.5 text-center text-[11px] text-muted-foreground/80">
                Answers come from Farm Direct&apos;s built-in knowledge base —
                instant and private, no account needed.
              </p>
            </footer>
          </section>

          {/* ───────────────────── Human support card ───────────────────── */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold">Talk to a person</h2>
              <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                For anything beyond a quick answer — a damaged crate, help with
                your account, or a bulk supply arrangement — reach the Farm
                Direct team directly.
              </p>
              <div className="mt-5 space-y-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Mail className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      Email us anytime
                    </span>
                    <span className="block truncate text-[14px] font-semibold">
                      {SUPPORT_EMAIL}
                    </span>
                  </span>
                </a>
                <a
                  href={SUPPORT_PHONE_HREF}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Phone className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      Call us
                    </span>
                    <span className="block text-[14px] font-semibold">
                      {SUPPORT_PHONE_DISPLAY}
                    </span>
                  </span>
                </a>
              </div>
              <Button className="mt-4 w-full gap-2" asChild>
                <a href={SUPPORT_WHATSAPP_HREF} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> Chat on WhatsApp
                </a>
              </Button>
              <p className="mt-4 border-t border-border/70 pt-3.5 text-[12px] leading-5 text-muted-foreground">
                {SUPPORT_HOURS}
              </p>
            </section>

            <section className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-6">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                <Sparkles className="size-4 text-primary" /> What&apos;s covered
              </h2>
              <ul className="mt-3 space-y-2 text-[13px] leading-5 text-muted-foreground">
                <li>• Selling your harvest &amp; pricing</li>
                <li>• Buying, baskets &amp; checkout</li>
                <li>• Orders, delivery &amp; tracking</li>
                <li>• Coupons, payments &amp; refunds</li>
                <li>• Reviews, notifications &amp; accounts</li>
                <li>• Growing &amp; storage tips for 60 crops</li>
              </ul>
              <p className="mt-4 text-[11px] leading-4 text-muted-foreground/70">
                Hindi, Hinglish and English questions all work — the assistant
                was built with Indian growers in mind.
              </p>
            </section>
          </aside>
        </div>
      </Container>
    </div>
  );
}

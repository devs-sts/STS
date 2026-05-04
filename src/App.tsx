import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";

/* ─── Types ─── */
type Product = {
  id: string;
  name: string;
  category: string;
  specs: string;
  availability: boolean;
  price: number;
  company: string;
};

type CartItem = {
  product: Product;
  qty: number;
};

/* ─── Constants ─── */
const WHATSAPP_NUMBER = "919430591173";
const CART_STORAGE_KEY = "energalife_cart_v2"; // Bumped version for new fields
const SHEET_ID = "1hYueHnfOzw8yBpzXQ01qKkclaEus6QLm4OeUntCtnVc";
const SHEET_TAB = "STS CARD";
const SHEET_ENDPOINT = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_TAB)}`;

const FALLBACK_PRODUCTS: Product[] = [
  { id: "T 001", name: "High-Voltage Transformer", category: "Electric", specs: "500kVA, 11kV/433V, Oil-cooled", availability: true, price: 250, company: "Surya" },
  { id: "T 002", name: "Three-Phase Induction Motor", category: "Electric", specs: "50 HP, 460V, 1750 RPM", availability: true, price: 350, company: "Voltas" },
  { id: "T 003", name: "Industrial Backup Generator", category: "Electric", specs: "1MW, Diesel-Electric, 60Hz", availability: false, price: 40, company: "Syska" },
  { id: "T 004", name: "Enterprise Rackmount UPS", category: "Electric", specs: "10kVA, Double Conversion, 2U", availability: true, price: 50, company: "Bajaj" },
  { id: "T 005", name: "Smart Power Distribution Unit", category: "Electric", specs: "30A, 208V, 24 Outlets, Networked", availability: true, price: 40, company: "Syska" },
  { id: "T 006", name: "Heavy-Duty Circuit Breaker", category: "Electric", specs: "1000A, 3-Pole, 600VAC", availability: true, price: 45, company: "Voltas" },
];

/* ─── Utilities ─── */
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function readCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed)
      ? parsed.filter((i) => i?.product?.id !== undefined && Number.isFinite(i?.qty) && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

/* ─── Hooks ─── */
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setP(total > 0 ? (h.scrollTop / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

function useProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(SHEET_ENDPOINT, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Sheet error ${res.status}`);
        const rows = (await res.json()) as any[];
        const mapped: Product[] = rows
          .map((r) => ({
            id: r.id ?? r.ID ?? "",
            name: r.name ?? r.Name ?? "Unnamed product",
            category: (r.category ?? r.Category ?? "Electric") as string,
            specs: r.specs ?? r.Specs ?? "",
            availability: String(r.availability ?? r.Availability ?? "TRUE").toUpperCase() === "TRUE",
            price: Number(r.price ?? r.Price ?? 0),
            company: r.company ?? r.Company ?? "STS",
          }))
          .filter((p) => p.name && p.id);
        if (!cancelled) setData(mapped.length ? mapped : FALLBACK_PRODUCTS);
      } catch {
        if (!cancelled) {
          setError("Using local demo products");
          setData(FALLBACK_PRODUCTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { data, loading, error };
}

/* ─── Shared Components ─── */
const Glass = memo(function Glass({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative rounded-[28px] border border-white/50 bg-white/60 shadow-[0_10px_40px_-10px_rgba(2,6,23,0.15)] backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-white/50",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/40 to-transparent" />
      {children}
    </div>
  );
});

const Pill = ({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={cx(
      "group relative inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all",
      "border border-slate-200 bg-white/70 text-slate-700 backdrop-blur hover:border-slate-300 hover:bg-white/90 hover:shadow-sm",
      active && "border-transparent bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25"
    )}
  >
    <span className="relative z-10">{children}</span>
    <span
      className={cx(
        "absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100",
        !active && "bg-[radial-gradient(60%_60%_at_50%_50%,rgba(99,102,241,0.12),transparent)]"
      )}
    />
  </button>
);

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-600 shadow-lg shadow-emerald-500/25">
      <div className="absolute inset-[2px] rounded-[14px] bg-white/10 backdrop-blur-sm" />
      <svg viewBox="0 0 32 32" className="relative h-6 w-6 text-white">
        <path
          d="M6 16c0-5.523 4.477-10 10-10 1.9 0 3.678.53 5.195 1.452l-3.236 5.604A4.99 4.99 0 0 0 16 12c-2.761 0-5 2.239-5 5s2.239 5 5 5c1.1 0 2.117-.355 2.941-.956l3.236 5.604A9.954 9.954 0 0 1 16 28c-5.523 0-10-4.477-10-10Z"
          fill="currentColor"
          opacity="0.9"
        />
        <circle cx="20.5" cy="11.5" r="3.5" fill="white" />
      </svg>
    </div>
    <div className="leading-tight">
      <div className="text-lg font-semibold tracking-tight text-slate-900">STS Enterprises</div>
      <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Electric • Pharma</div>
    </div>
  </div>
);

/* ─── Category icon for cards ─── */
function CategoryIcon({ category }: { category: string }) {
  const isElectric = /electric/i.test(category);
  return (
    <div
      className={cx(
        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
        isElectric
          ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
          : "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/25"
      )}
    >
      {isElectric ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )}
    </div>
  );
}

/* ─── Product Card ─── */
const Card = memo(function Card({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  const [added, setAdded] = useState(false);
  const available = product.availability;

  const handleAdd = () => {
    if (!available) return;
    onAddToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
  };

  return (
    <div className="group relative">
      <div className="absolute -inset-[1px] rounded-[30px] bg-gradient-to-b from-slate-200 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <Glass className={cx("overflow-hidden rounded-[28px] transition-all", !available && "opacity-75")}>
        {/* Top colored strip */}
        <div
          className={cx(
            "h-1.5 w-full",
            available
              ? /electric/i.test(product.category)
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-emerald-400 to-teal-500"
              : "bg-gradient-to-r from-slate-300 to-slate-400"
          )}
        />

        <div className="space-y-4 p-5">
          {/* Header row: icon + category + availability */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <CategoryIcon category={product.category} />
              <div>
                <span
                  className={cx(
                    "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                    /electric/i.test(product.category)
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {product.category}
                </span>
                <div className="mt-0.5 font-mono text-[11px] text-slate-400">{product.id}</div>
              </div>
            </div>
            {/* Availability badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  available
                    ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                    : "bg-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                )}
              />
              <span className={cx("text-[11px] font-medium", available ? "text-emerald-700" : "text-red-500")}>
                {available ? "In Stock" : "Not Available"}
              </span>
            </div>
          </div>

          {/* Product name & Brand */}
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900">
              {product.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {product.company}
              </span>
            </div>
          </div>

          {/* Specs */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Specifications</div>
            <p className="text-sm leading-relaxed text-slate-600">{product.specs}</p>
          </div>

          {/* Add to cart & Price */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price per unit</span>
              <span className="text-lg font-extrabold text-slate-900">₹{product.price.toLocaleString()}</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={!available}
              className={cx(
                "group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background-color]",
                !available
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : added
                  ? "bg-emerald-600 text-white hover:shadow-emerald-600/20"
                  : "bg-slate-900 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/20 active:translate-y-0"
              )}
            >
              <span className="relative z-10">{!available ? "Unavailable" : added ? "Added ✓" : "Add to cart"}</span>
              {available && !added && (
                <svg
                  className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M3 4h2l2 11h11l2-8H7" />
                </svg>
              )}
              {available && !added && (
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 opacity-0 transition-opacity group-hover/btn:opacity-100" />
              )}
            </button>
          </div>
        </div>
      </Glass>
    </div>
  );
});

/* ─── Header ─── */
function Header({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);
  const progress = useScrollProgress();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const linkCls = (path: string) =>
    cx(
      "relative rounded-full px-4 py-2 text-sm font-medium transition",
      isActive(path) ? "text-slate-900 bg-slate-100" : "text-slate-600 hover:text-slate-900"
    );

  /* Scroll to section on homepage, or navigate then scroll */
  const handleSectionClick = (sectionId: string) => {
    if (location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Scroll progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px">
        <div
          className="h-px w-full origin-left bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <div className={cx("mx-auto max-w-7xl px-4 pt-4 transition-[padding]", scrolled && "pt-2")}>
        <div
          className={cx(
            "flex items-center justify-between rounded-[28px] border border-white/60 bg-white/70 px-4 py-3 shadow-[0_10px_30px_-10px_rgba(2,6,23,0.15)] backdrop-blur-xl transition-all",
            scrolled && "shadow-[0_8px_24px_-12px_rgba(2,6,23,0.25)]"
          )}
        >
          <Link to="/" className="text-left">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/" className={linkCls("/")}>Home</Link>
            <Link to="/products" className={linkCls("/products")}>Products</Link>
            <button onClick={() => handleSectionClick("about")} className="relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">About</button>
            <button onClick={() => handleSectionClick("contact")} className="relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">Contact</button>
            <Link
              to="/cart"
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M3 4h2l2 11h11l2-8H7" />
              </svg>
              <span>Cart ({cartCount})</span>
            </Link>
          </nav>

          {/* Mobile: cart button + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-md transition hover:shadow-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M3 4h2l2 11h11l2-8H7" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-[10px] font-bold text-white shadow">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white/80 backdrop-blur transition hover:bg-white"
              aria-label="Menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className={cx("transition-transform", open && "rotate-90")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div
          className={cx(
            "grid overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-xl transition-[grid-template-rows,opacity] md:hidden",
            open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="min-h-0">
            <div className="p-2">
              <Link to="/" onClick={() => setOpen(false)} className="block rounded-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Home</Link>
              <Link to="/products" onClick={() => setOpen(false)} className="block rounded-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Products</Link>
              <button onClick={() => handleSectionClick("about")} className="block w-full rounded-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">About</button>
              <button onClick={() => handleSectionClick("contact")} className="block w-full rounded-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Contact</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero Section ─── */
function Hero() {
  const slides = [
    {
      title: "Clean Energy, Clinical Precision",
      subtitle: "Powering industries with reliable electric systems and trusted pharmaceutical supplies.",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop",
    },
    {
      title: "Smart Electric for Modern Facilities",
      subtitle: "Panels, inverters, EV charging, and lighting engineered for efficiency and safety.",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1920&auto=format&fit=crop",
    },
    {
      title: "Pharma You Can Rely On",
      subtitle: "Quality-assured medicines, supplements, and topical care from certified manufacturers.",
      image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=1920&auto=format&fit=crop",
    },
  ];
  const [index, setIndex] = useState(0);
  const timer = useRef<number | null>(null);
  const navigate = useNavigate();

  const go = useCallback((i: number) => setIndex(() => (i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => go(index + 1), 5000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [index, go]);

  return (
    <section className="relative mx-auto mt-6 max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-[36px] border border-white/60 bg-white/60 shadow-[0_20px_60px_-20px_rgba(2,6,23,0.25)] backdrop-blur-xl">
        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <div
              key={i}
              className={cx("absolute inset-0 transition-opacity duration-1000 ease-out", i === index ? "opacity-100" : "opacity-0")}
              aria-hidden={i !== index}
            >
              <img src={s.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/50 to-transparent" />
            </div>
          ))}
        </div>
        <div className="relative grid min-h-[64vh] grid-cols-1 items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
          <div className="relative z-10 space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
              Enterprise • Electric & Pharma
            </div>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">{slides[index].title}</h1>
            <p className="max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{slides[index].subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/products")}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
              >
                <span className="relative z-10">View all products</span>
                <svg className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-300/60 to-cyan-300/60 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("about");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Learn more
              </button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={cx("h-1.5 w-8 rounded-full bg-white/40 transition-all", i === index && "w-12 bg-white")}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-[36px] ring-1 ring-inset ring-white/30" />
      </div>
    </section>
  );
}

/* ─── About Section ─── */
function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-16 md:py-24">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">About STS Enterprises</div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            A unified platform for electric infrastructure and pharmaceutical supply.
          </h2>
          <p className="max-w-prose text-slate-600">
            We partner with facility managers, clinics, and industrial buyers to deliver certified products, fast procurement, and dependable post-sales service. Our catalog spans EV charging, LT/HT panels, LED systems, and essential pharma SKUs.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[
              { k: "15+", v: "Years combined expertise" },
              { k: "120+", v: "SKU catalogue" },
              { k: "99.2%", v: "On-time fulfillment" },
              { k: "100%", v: "Quality Gaurentee" },
            ].map((s) => (
              <Glass key={s.k} className="p-4">
                <div className="text-2xl font-semibold text-slate-900">{s.k}</div>
                <div className="mt-1 text-sm text-slate-600">{s.v}</div>
              </Glass>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-emerald-100 via-cyan-100 to-indigo-100 opacity-60 blur-2xl" />
          <Glass className="overflow-hidden">
            <div className="grid grid-cols-2 gap-[1px] bg-slate-200/60">
              <img className="aspect-[4/3] w-full object-cover" src="https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?q=80&w=800&auto=format&fit=crop" alt="Facility" loading="lazy" />
              <img className="aspect-[4/3] w-full object-cover" src="https://images.unsplash.com/photo-1582719478427-2f3f8a1c6d3e?q=80&w=800&auto=format&fit=crop" alt="Electric" loading="lazy" />
              <img className="aspect-[4/3] w-full object-cover" src="https://images.https://unsplash.com/photos/a-pile-of-pills-sitting-next-to-each-other-on-top-of-a-table-RS0-h_pyByk&auto=format&fit=crop" alt="Pharma" loading="lazy" />
              <img className="aspect-[4/3] w-full object-cover" src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop" alt="Care" loading="lazy" />
            </div>
          </Glass>
        </div>
      </div>
    </section>
  );
}

/* ─── Category Preview ─── */
function CategoryPreview({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  const electricCount = products.filter((p) => /electric/i.test(p.category)).length;
  const pharmaCount = products.filter((p) => /pharma/i.test(p.category)).length;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">Our divisions</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Two industries. One partner.</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Glass className="group overflow-hidden p-6 transition hover:shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Electric</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Power systems & equipment</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-600">Transformers, motors, UPS, circuit breakers, inverters, and EV charging stations for commercial and industrial facilities.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {electricCount} products
            </span>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 transition hover:gap-3"
          >
            Browse Electric <span>→</span>
          </button>
        </Glass>

        <Glass className="group overflow-hidden p-6 transition hover:shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Pharma</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Medicines & wellness</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-600">Quality-assured medicines, supplements, and topical care from certified manufacturers.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {pharmaCount} products
            </span>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:gap-3"
          >
            Browse Pharma <span>→</span>
          </button>
        </Glass>
      </div>
    </section>
  );
}

/* ─── Contact Section ─── */
function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-16 md:py-24">
      <Glass className="relative overflow-hidden p-8 md:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/40 to-cyan-300/40 blur-3xl" />
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">Contact</div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Let's build your supply and energy roadmap.</h2>
            <p className="max-w-prose text-slate-600">
              Get in touch for quotations, compliance documentation, or site assessments. Our team responds within one business day.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <a href="tel:+919430531173" className="group rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-xs uppercase tracking-widest text-slate-500">Phone</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">+91 94305 91173</div>
                <div className="mt-2 text-xs text-emerald-700">Tap to call →</div>
              </a>
              <a href="mailto:hello@STSlife.example" className="group rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="text-xs uppercase tracking-widest text-slate-500">Email</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">COMMING SOON</div>
                <div className="mt-2 text-xs text-emerald-700">Write to us →</div>
              </a>
            </div>
          </div>
          <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = fd.get("name")?.toString() || "";
            const phone = fd.get("phone")?.toString() || "";
            const msg = `Hi, I'm ${name}. I want an enterprise quote. My phone number is ${phone}.`;
            
            window.open(
              `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
              "_blank"
             );
           }}
            className="rounded-[28px] border border-white/60 bg-white/60 p-6 backdrop-blur-xl"
          >

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">Full name</label>
                <input
                type="text"
                name="name"
                placeholder="Your name"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                />
              </div>
              {/* PHONE */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">
                  Phone number
                  </label>
                  <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="10-digit phone"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                  />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">Message</label>
                <textarea name="msg" rows={4} placeholder="Describe your requirement…" className="w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60" />
              </div>
              <button className="group relative mt-2 inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                <span className="relative z-10">Request quote on WhatsApp</span>
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              <p className="text-center text-xs text-slate-500">No payment gateway. Orders are confirmed via WhatsApp and proforma invoice.</p>
            </div>
          </form>
        </div>
      </Glass>
    </section>
  );
}

/* ─── Products Page ─── */
function useSmoothFilter(products: Product[]) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | "Electric" | "Pharma">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === "All" || new RegExp(category, "i").test(p.category);
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.specs.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, query, category]);

  return { query, setQuery, category, setCategory, filtered };
}

function ProductsPage({
  allProducts,
  loading,
  error,
  onAddToCart,
  cartCount,
}: {
  allProducts: Product[];
  loading: boolean;
  error: string | null;
  onAddToCart: (product: Product) => void;
  cartCount: number;
}) {
  const { query, setQuery, category, setCategory, filtered } = useSmoothFilter(allProducts);
  const [searchVisible, setSearchVisible] = useState(true);
  const lastScrollY = useRef(0);

  /* Hide search bar on scroll down, show on scroll up */
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 300) {
        if (currentY > lastScrollY.current + 5) {
          setSearchVisible(false);
        } else if (currentY < lastScrollY.current - 5) {
          setSearchVisible(true);
        }
      } else {
        setSearchVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_300px_at_20%_0%,rgba(6,182,212,0.12),transparent),radial-gradient(600px_300px_at_80%_0%,rgba(99,102,241,0.12),transparent)]" />

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">Products</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">Browse our catalogue</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Filter by category or search by name. All prices and stock are subject to enterprise contracts.
        </p>
      </div>

      {/* Sticky Controls */}
      <div
        className={cx(
          "sticky top-24 z-30 mb-8 rounded-[28px] border border-white/60 bg-white/80 shadow-xl backdrop-blur-xl transition-all duration-500",
          searchVisible ? "p-4" : "p-4"
        )}
      >
        {/* Search bar - hides on scroll */}
        <div
          className={cx(
            "overflow-hidden transition-all duration-500 ease-in-out",
            searchVisible ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
          )}
        >
          <div className="relative w-full">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, or specs…"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 pl-11 text-sm text-slate-800 shadow-sm backdrop-blur placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
            />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category pills + cart + count */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Pill active={category === "All"} onClick={() => setCategory("All")}>All</Pill>
            <Pill active={category === "Electric"} onClick={() => setCategory("Electric")}>⚡ Electric</Pill>
            <Pill active={category === "Pharma"} onClick={() => setCategory("Pharma")}>💊 Pharma</Pill>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-500 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Loading…
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                {error}
              </span>
            )}
            <span className="text-sm font-medium text-slate-700">{filtered.length} items</span>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Cart
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => (
          <div key={p.id} className="animate-[fadeUp_0.5s_ease_both]" style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}>
            <Card product={p} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-slate-100">
            <svg className="h-10 w-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
          <p className="mt-1 text-slate-600">Try adjusting your search or filter criteria.</p>
          <button onClick={() => { setQuery(""); setCategory("All"); }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg">
            Clear filters
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Cart Page ─── */
function CartPage({
  items,
  onUpdateQty,
  onRemove,
  onClear,
}: {
  items: CartItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const netPrice = useMemo(() => items.reduce((sum, item) => sum + (item.product.price * item.qty), 0), [items]);

  const whatsappUrl = useMemo(() => {
    if (!items.length || !date) return "#";
    const lines = items.map((item, idx) => `${idx + 1}. ${item.product.name} (${item.product.company}) - Qty: ${item.qty} - Value: ₹${(item.product.price * item.qty).toLocaleString()}`);
    const message = [
      `Hello STS Enterpries!, ${name ? `I am ${name}. ` : ""}I want to place an order:`,
      "",
      ...lines,
      "",
      `Net Evaluated Price: ₹${netPrice.toLocaleString()}`,
      `Desired date of order receiving: ${date}`,
      notes ? `Additional note: ${notes}` : "",
      "",
      "Please confirm availability and quotation.",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }, [items, date, notes, name, netPrice]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_300px_at_15%_0%,rgba(6,182,212,0.12),transparent),radial-gradient(600px_300px_at_85%_0%,rgba(16,185,129,0.12),transparent)]" />
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">Cart</div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Finalize order request</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Review products, net evaluated price, and send the full order to WhatsApp.</p>
        </div>
        {!!items.length && (
          <button
            onClick={onClear}
            className="hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white md:inline-flex"
          >
            Clear cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <Glass className="p-10 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-500">
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M3 4h2l2 11h11l2-8H7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Your cart is empty</h2>
          <p className="mt-2 text-slate-600">Add products from the catalogue to create one combined WhatsApp order.</p>
          <Link
            to="/products"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
          >
            Browse products
          </Link>
        </Glass>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Glass className="overflow-hidden">
            <div className="border-b border-slate-200/70 px-5 py-4 text-sm font-semibold text-slate-900 md:px-6">Selected products ({totalItems} units)</div>
            <div className="divide-y divide-slate-200/70">
              {items.map((item) => (
                <div key={item.product.id} className="grid gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto] md:items-center md:px-6">
                  <CategoryIcon category={item.product.category} />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.product.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{item.product.company}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <p className="text-sm text-slate-500">{item.product.id}</p>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">₹{(item.product.price * item.qty).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80">
                      <button
                        onClick={() => onUpdateQty(item.product.id, Math.max(1, item.qty - 1))}
                        className="grid h-9 w-9 place-items-center text-slate-700 transition hover:bg-slate-100"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-slate-900">{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                        className="grid h-9 w-9 place-items-center text-slate-700 transition hover:bg-slate-100"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200/70 bg-slate-50/50 p-6">
               <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                 <span>Net Evaluated Price</span>
                 <span className="text-2xl text-indigo-600">₹{netPrice.toLocaleString()}</span>
               </div>
               <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                 <span className="text-xl">✨</span>
                 <p>You may get extra discounts while receiving the order.</p>
               </div>
            </div>
          </Glass>

          <Glass className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Delivery details</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">Your name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company or contact name"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">Common receiving date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-slate-500">Additional note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Optional notes for delivery or invoice"
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200/60"
                />
              </div>
              <a
                href={date ? whatsappUrl : "#"}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (date) onClear();
                }}
                className={cx(
                  "group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl px-6 text-sm font-semibold text-white shadow-lg transition",
                  date
                    ? "bg-slate-900 shadow-slate-900/20 hover:-translate-y-0.5 hover:shadow-xl"
                    : "cursor-not-allowed bg-slate-400/80 shadow-none"
                )}
              >
                <span className="relative z-10">Place complete order on WhatsApp</span>
                {date && <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />}
              </a>
              {!date && <p className="text-xs text-amber-700">Select a common receiving date to place your order.</p>}
            </div>
          </Glass>
        </div>
      )}
    </section>
  );
}

/* ─── Developer Page ─── */
function DevPage() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16 md:py-28">
      {/* Decorative Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Digital Architect
          </div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 md:text-7xl">
             Innovate <br />
             <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Beyond Limits</span>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-slate-600">
            Crafting high-performance enterprise solutions with a focus on immersive UX, clean architecture, and modern aesthetics.
          </p>
          
          <div className="mt-10 flex flex-wrap gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all hover:border-indigo-200 hover:shadow-lg">
               <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                  <span className="text-xl font-bold">&lt;/&gt;</span>
               </div>
               <div>
                 <div className="text-sm font-bold text-slate-900">Clean Code</div>
                 <div className="text-xs text-slate-500">TypeScript & React</div>
               </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all hover:border-cyan-200 hover:shadow-lg">
               <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
               </div>
               <div>
                 <div className="text-sm font-bold text-slate-900">Modern UX</div>
                 <div className="text-xs text-slate-500">Glassmorphism UI</div>
               </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Glass className="relative z-10 overflow-hidden p-1 bg-white/20">
            <div className="rounded-[24px] bg-white p-8 md:p-12">
               <div className="flex flex-col items-center text-center">
                  <div className="group relative mb-8">
                     <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 blur-xl opacity-20 transition-opacity group-hover:opacity-40" />
                     <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-2xl">
                        {/* Profile Picture Placeholder */}
                        <div className="grid h-full w-full place-items-center bg-slate-50 text-slate-200">
                           <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                           </svg>
                        </div>
                     </div>
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-900">Lead Web Developer</h2>
                  <p className="mt-3 font-mono text-sm font-semibold tracking-widest text-indigo-600 uppercase">React Full Stack</p>
                  
                  <div className="mt-8 h-px w-full bg-slate-100" />
                  
                  <div className="mt-8 grid w-full grid-cols-2 gap-6 text-left md:grid-cols-3">
                     {[
                       { label: "React 18", icon: "⚛️" },
                       { label: "TypeScript", icon: "📘" },
                       { label: "Tailwind", icon: "🎨" },
                       { label: "Vite", icon: "⚡" },
                       { label: "Node.js", icon: "🟢" },
                       { label: "Next.js", icon: "🖤" },
                     ].map((item) => (
                       <div key={item.label} className="group/item flex items-center gap-2 rounded-xl border border-slate-50 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                          <span className="text-lg transition-transform group-hover/item:scale-125">{item.icon}</span>
                          <span className="text-xs font-bold text-slate-700">{item.label}</span>
                       </div>
                     ))}
                  </div>

                  <div className="mt-10 flex w-full flex-col gap-4">
                     <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Site Features</div>
                        <div className="flex flex-wrap gap-2">
                           {["Dynamic Sheets API", "WhatsApp Integration", "Cart Persistence", "Mobile First", "SEO Optimized"].map(f => (
                             <span key={f} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                <span className="h-1 w-1 rounded-full bg-indigo-500" />
                                {f}
                             </span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </Glass>
          
          {/* Background Symbol */}
          <div className="absolute -bottom-10 -right-10 pointer-events-none select-none text-[200px] font-black text-slate-900/5 leading-none">
             &lt;/&gt;
          </div>
        </div>
      </div>

      <div className="mt-20 text-center">
        <p className="text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} STS Enterprises • Built with ❤️ using modern technologies
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="relative mt-8 border-t border-slate-200/70 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <Logo />
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} STS Enterprises Pvt Ltd. All rights reserved.</div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">Home</Link>
            <span className="text-slate-300">•</span>
            <Link to="/products" className="text-slate-600 hover:text-slate-900">Products</Link>
            <span className="text-slate-300">•</span>
            <Link to="/cart" className="text-slate-600 hover:text-slate-900">Cart</Link>
            <span className="text-slate-300">•</span>
            <Link to="/dev" className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-indigo-600">
              Developer <span className="font-mono text-xs">&lt;/&gt;</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600" />
    </footer>
  );
}

/* ─── Home Page ─── */
function HomePage({ products }: { products: Product[] }) {
  const location = useLocation();

  /* Handle hash-based scroll on mount (e.g. navigating from another page) */
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [location.hash]);

  return (
    <>
      <Hero />
      <About />
      <CategoryPreview products={products} />
      <Contact />
    </>
  );
}

/* ─── Scroll to Top ─── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

/* ─── App Content ─── */
function AppContent() {
  const { data: products, loading, error } = useProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCartFromStorage());

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.qty, 0), [cartItems]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product: Product) => {
    if (!product.availability) return;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((id: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, qty: Math.max(1, qty) } : item))
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);
    document.body.className = "bg-[#f7f9fc] text-slate-900 antialiased";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div className="[font-family:Inter,Plus_Jakarta_Sans,system-ui,-apple-system,Segoe_UI,Roboto,Ubuntu,Cantarell,Noto_Sans,sans-serif]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(16,185,129,0.12),transparent),radial-gradient(900px_500px_at_90%_10%,rgba(59,130,246,0.10),transparent),radial-gradient(900px_500px_at_10%_10%,rgba(14,165,233,0.10),transparent)]" />
      <ScrollToTop />
      <Header cartCount={cartCount} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage products={products} />} />
          <Route
            path="/products"
            element={
              <ProductsPage
                allProducts={products}
                loading={loading}
                error={error}
                onAddToCart={addToCart}
                cartCount={cartCount}
              />
            }
          />
          <Route
            path="/cart"
            element={
              <CartPage
                items={cartItems}
                onUpdateQty={updateCartQty}
                onRemove={removeFromCart}
                onClear={clearCart}
              />
            }
          />
          <Route path="/dev" element={<DevPage />} />
        </Routes>
      </main>
      <Footer />
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-2xl border border-white/60 bg-white/70 text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
        aria-label="Back to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <style>{`
        :root { color-scheme: light; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ::selection { background: rgba(99,102,241,0.2); }
        img { image-rendering: auto; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}

/* ─── Root App ─── */
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

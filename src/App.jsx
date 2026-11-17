import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, BookPlus, BookMarked, Bookmark,
  Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Filter,
  GraduationCap, Heart, Home, LayoutDashboard, Library, LogOut, Mail,
  Menu, Plus, Search, Settings2, ShieldCheck, Sparkles, Users, X,
} from "lucide-react";
import {
  BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams, useLocation,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import { DEMO_BOOKS, CATEGORIES } from "./data/books";

const cn = (...parts) => parts.filter(Boolean).join(" ");
const shortDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";

function PageLoader() {
  return <div className="page-loader"><span className="loader-dot" /><span>Opening your library…</span></div>;
}

function Brand({ compact = false, light = false }) {
  return <Link className={cn("brand", light && "brand-light", compact && "brand-compact")} to="/">
    <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
    <span className="brand-name">stacks<span>.</span>{!compact && <small>school library</small>}</span>
  </Link>;
}

function SiteHeader({ session, profile, onSignOut }) {
  return <header className="site-header">
    <div className="header-inner">
      <Brand />
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/catalog">Explore books</NavLink>
      </nav>
      <div className="header-actions">
        {session ? <>
          {profile?.role === "admin" && <Link className="admin-shortcut" to="/admin"><ShieldCheck size={15} /> Admin</Link>}
          <Link className="account-link" to="/account"><span className="avatar">{(profile?.full_name || session.user.email || "S").slice(0, 1).toUpperCase()}</span><span className="account-link-name">My account</span></Link>
          <button className="icon-button signout-button" title="Sign out" onClick={onSignOut}><LogOut size={17} /></button>
        </> : <><Link className="login-link" to="/login">Log in</Link><Link className="button button-dark button-small" to="/register">Join the library <ArrowUpRight size={15} /></Link></>}
      </div>
    </div>
  </header>;
}

function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-inner">
      <Brand compact />
      <span>A little more curious, every day.</span>
      <span>Made for readers, at school.</span>
    </div>
  </footer>;
}

function BookCover({ book, className = "" }) {
  return <div className={cn("book-cover", className)}>
    {book.cover_url ? <img src={book.cover_url} alt={book.title + " cover"} loading="lazy" /> : <div className="cover-placeholder"><BookOpen size={30} /><span>{book.title}</span></div>}
    {book.is_featured && <span className="cover-ribbon">Staff pick</span>}
  </div>;
}

function BookCard({ book, index = 0 }) {
  return <article className="book-card" style={{ "--card-index": index }}>
    <Link className="book-card-cover-link" to={"/books/" + book.id} aria-label={"View " + book.title}>
      <BookCover book={book} />
      <span className="cover-open"><ArrowUpRight size={17} /></span>
    </Link>
    <div className="book-card-copy">
      <span className="eyebrow">{book.category || "General"}</span>
      <Link className="book-title" to={"/books/" + book.id}>{book.title}</Link>
      <p>{book.author || "Unknown author"}</p>
      <div className="book-card-meta"><span>{book.language || "English"}</span><span className={book.copies_available > 0 ? "availability available" : "availability unavailable"}><i />{book.copies_available > 0 ? "Available" : "On loan"}</span></div>
    </div>
  </article>;
}

function SectionHeading({ eyebrow, title, description, action, to = "/catalog" }) {
  return <div className="section-heading">
    <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {action && <Link className="text-link" to={to}>{action}<ArrowRight size={16} /></Link>}
  </div>;
}

function HomePage({ books }) {
  const featured = books.find((book) => book.is_featured) || books[0];
  const newArrivals = books.slice(0, 4);
  return <main>
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="sparkle-dot"><Sparkles size={13} /></span> YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>Find a book.<br /><em>Find your</em> world.</h1>
          <p>A welcoming corner for curious minds. Browse the school collection, discover something unexpected, and keep your next great read close.</p>
          <div className="hero-actions"><Link className="button button-lime" to="/catalog">Explore the collection <ArrowUpRight size={17} /></Link><Link className="hero-text-link" to="/register">Get your library account <ArrowRight size={15} /></Link></div>
          <div className="hero-footnote"><span className="avatar-stack"><i>R</i><i>A</i><i>M</i></span><span>For every reader, at every level.</span></div>
        </div>
        <div className="hero-art" aria-label="Featured book showcase">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-note note-top"><Sparkles size={14} /> A good day to read</div>
          {featured && <Link to={"/books/" + featured.id} className="hero-feature-book">
            <BookCover book={featured} />
            <div className="hero-feature-caption"><span>THIS WEEK'S SPOTLIGHT</span><strong>{featured.title}</strong><small>{featured.author}</small></div>
          </Link>}
          <div className="hero-sticker"><span>READ</span><strong>MORE.</strong><span>WONDER.</span></div>
          <div className="hero-note note-bottom"><BookOpen size={15} /> Turn the page</div>
        </div>
      </div>
      <div className="hero-bottom-line"><span>READ WIDELY. THINK DEEPLY.</span><span>01 / DISCOVER</span></div>
    </section>

    <section className="quick-stats content-width">
      <div><strong>{books.length.toString().padStart(2, "0")}<sup>+</sup></strong><span>Books to discover</span></div>
      <div><strong>01</strong><span>Library, endless worlds</span></div>
      <div><strong>∞</strong><span>Ideas to take with you</span></div>
      <div className="stats-note">A place to learn,<br />escape and grow.</div>
    </section>

    <section className="content-section content-width">
      <SectionHeading eyebrow="A LITTLE SOMETHING FOR EVERYONE" title="Find your kind of story" description="Start with a mood, a subject, or a new interest." action="Browse all genres" to="/catalog" />
      <div className="category-grid">
        {CATEGORIES.slice(0, 6).map((category, i) => <Link to={"/catalog?category=" + encodeURIComponent(category.name)} className={"category-tile category-tone-" + (i + 1)} key={category.name}>
          <span className="category-icon">{category.icon}</span><span><strong>{category.name}</strong><small>{category.note}</small></span><ArrowUpRight size={18} className="category-arrow" />
        </Link>)}
      </div>
    </section>

    <section className="content-section latest-section">
      <div className="content-width">
        <SectionHeading eyebrow="FRESH OFF THE SHELF" title="New to the stacks" description="A few good places to begin your next reading adventure." action="See the whole collection" />
        <div className="book-grid">{newArrivals.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}</div>
      </div>
    </section>

    <section className="quote-band content-width">
      <div className="quote-mark">“</div><blockquote>A book is a door you can open again and again.</blockquote><span>THE STACKS READING ROOM</span><BookOpen className="quote-book-icon" size={72} strokeWidth={1} />
    </section>

    <section className="join-section content-width">
      <div className="join-decoration"><span>YOUR<br />STORY<br />AWAITS.</span><BookMarked size={66} strokeWidth={1} /></div>
      <div><span className="eyebrow">MAKE IT YOURS</span><h2>One account.<br /><em>A whole library.</em></h2><p>Create your student account to keep track of your reading and send borrowing requests to the library team.</p><Link className="button button-dark" to="/register">Create a student account <ArrowUpRight size={17} /></Link></div>
    </section>
  </main>;
}

function CatalogPage({ books }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All books");
  const [availability, setAvailability] = useState("all");
  const filteredBooks = useMemo(() => books.filter((book) => {
    const haystack = [book.title, book.author, book.category, book.description].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (category === "All books" || book.category === category) &&
      (availability === "all" || (availability === "available" ? book.copies_available > 0 : book.copies_available <= 0));
  }), [books, query, category, availability]);
  return <main className="page-wrap content-width">
    <div className="page-intro"><span className="eyebrow">THE COLLECTION</span><h1>Explore the <em>stacks.</em></h1><p>Follow your curiosity. Your next favourite read might be one shelf away.</p></div>
    <div className="catalog-toolbar">
      <label className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, authors, subjects…" /><kbd>⌘ K</kbd></label>
      <label className="select-field"><Filter size={16} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All books</option>{CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</select><ChevronDown size={15} /></label>
      <label className="select-field"><select value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="all">Any availability</option><option value="available">Available now</option><option value="unavailable">Currently on loan</option></select><ChevronDown size={15} /></label>
    </div>
    <div className="catalog-results-line"><span><strong>{filteredBooks.length}</strong> {filteredBooks.length === 1 ? "book" : "books"} found</span><span>CURATED FOR CURIOUS MINDS</span></div>
    {filteredBooks.length ? <div className="book-grid catalog-grid">{filteredBooks.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}</div> : <div className="empty-state"><Search size={28} /><h3>No books found</h3><p>Try a different title or clear one of your filters.</p><button className="button button-outline" onClick={() => { setQuery(""); setCategory("All books"); setAvailability("all"); }}>Clear filters</button></div>}
  </main>;
}

function BookDetailPage({ books, session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState("");
  const book = books.find((item) => String(item.id) === id);
  if (!book) return <main className="content-width page-wrap"><div className="empty-state"><BookOpen size={32} /><h2>We couldn't find that book.</h2><Link className="text-link" to="/catalog">Back to the collection <ArrowRight size={16} /></Link></div></main>;
  const requestBook = async () => {
    if (!session) { navigate("/login"); return; }
    if (!supabase) { setNotice("Library accounts are not connected yet. Please contact the library team."); return; }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(book.id))) {
      setNotice("This is a preview title. The library team needs to add it to the live catalog before it can be requested.");
      return;
    }
    setRequesting(true); setNotice("");
    const { error } = await supabase.from("loan_requests").insert({ book_id: book.id, student_id: session.user.id });
    setRequesting(false);
    setNotice(error ? (error.code === "23505" ? "You already have an active request for this book." : error.message) : "Request sent. The library team will review it shortly.");
  };
  return <main className="content-width page-wrap detail-page">
    <Link className="back-link" to="/catalog"><ArrowRight size={15} /> Back to the collection</Link>
    <div className="book-detail-layout">
      <div className="detail-cover-wrap"><BookCover book={book} className="detail-cover" /><span className="detail-cover-caption">A STACKS DISCOVERY</span></div>
      <div className="detail-copy">
        <span className="eyebrow">{book.category || "From the collection"}</span>
        <h1>{book.title}</h1><p className="detail-author">by {book.author || "Unknown author"}</p>
        <div className="detail-tags"><span>{book.language || "English"}</span>{book.published_year && <span>{book.published_year}</span>}{book.isbn && <span>ISBN {book.isbn}</span>}</div>
        <p className="detail-description">{book.description || "A new discovery from the school library. Ask the library team for more information about this title."}</p>
        <div className="detail-availability"><span className={book.copies_available > 0 ? "availability available" : "availability unavailable"}><i />{book.copies_available > 0 ? book.copies_available + " copy/copies available" : "Currently on loan"}</span><span>{book.copies_total ?? "—"} total copies</span></div>
        <button className="button button-dark detail-request" disabled={requesting || book.copies_available <= 0} onClick={requestBook}>{requesting ? "Sending request…" : "Request to borrow"}<ArrowUpRight size={17} /></button>
        {notice && <p className="inline-notice"><Check size={15} />{notice}</p>}
        {!session && <p className="detail-hint">You'll need a student account to request a book.</p>}
      </div>
    </div>
  </main>;
}

function AuthPage({ mode, session }) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (session) return <Navigate to="/account" replace />;
  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!supabase) { setError("Student accounts are not connected yet. Ask the library administrator to finish the Supabase setup."); return; }
    setBusy(true);
    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim(), class_name: className.trim() } },
      });
      if (signUpError) setError(signUpError.message);
      else if (data.session) navigate("/account");
      else setMessage("Your account has been created. Check your email to confirm your address, then sign in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else navigate("/account");
    }
    setBusy(false);
  };
  return <main className="auth-page">
    <div className="auth-aside">
      <Brand light />
      <div className="auth-aside-copy"><span className="eyebrow">A PLACE FOR EVERY READER</span><h1>Open a book.<br /><em>Open a world.</em></h1><p>Your school library, wherever curiosity takes you.</p></div>
      <div className="auth-aside-bottom"><BookOpen size={19} /><span>READ WIDELY. THINK DEEPLY.</span><span>STACKS / SCHOOL LIBRARY</span></div>
      <div className="auth-aside-shape" />
    </div>
    <div className="auth-main">
      <Link className="auth-back" to="/"><ArrowRight size={15} /> Back to home</Link>
      <div className="auth-form-wrap">
        <span className="eyebrow">{isRegister ? "YOUR LIBRARY CARD, REIMAGINED" : "WELCOME BACK"}</span>
        <h2>{isRegister ? "Join the stacks." : "Good to see you."}</h2>
        <p className="auth-subtitle">{isRegister ? "Create a student account and make the library yours." : "Sign in to pick up where your reading journey left off."}</p>
        <div className="auth-switch"><Link className={!isRegister ? "active" : ""} to="/login">Log in</Link><Link className={isRegister ? "active" : ""} to="/register">Create account</Link></div>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Full name<div className="input-wrap"><Users size={17} /><input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first and last name" /></div></label>}
          {isRegister && <label>Class / year <span className="optional-label">OPTIONAL</span><div className="input-wrap"><GraduationCap size={17} /><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 9A" /></div></label>}
          <label>School email<div className="input-wrap"><Mail size={17} /><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" /></div></label>
          <label>Password<div className="input-wrap"><ShieldCheck size={17} /><input required minLength={6} type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? "At least 6 characters" : "Your password"} /></div></label>
          {error && <div className="form-message form-error"><X size={16} />{error}</div>}
          {message && <div className="form-message form-success"><Check size={16} />{message}</div>}
          <button type="submit" className="button button-dark auth-submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create student account" : "Log in to your account"}<ArrowUpRight size={17} /></button>
        </form>
        <p className="auth-legal">{isRegister ? "Student accounts are created with student access. Library staff can grant admin access separately." : "Having trouble signing in? Contact the school library team."}</p>
      </div>
      <span className="auth-copyright">© STACKS SCHOOL LIBRARY</span>
    </div>
  </main>;
}

function ProtectedRoute({ session, authLoading, profileLoading, children }) {
  if (authLoading || (session && profileLoading)) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ session, authLoading, profileLoading, profile, children }) {
  if (authLoading || (session && profileLoading)) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.role !== "admin") return <Navigate to="/account" replace />;
  return children;
}

function AccountPage({ session, profile, onSignOut }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    let active = true;
    if (!supabase || !session) { setLoading(false); return; }
    supabase.from("loan_requests").select("id,status,created_at,books(title,author)").eq("student_id", session.user.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (active) { setLoans(data || []); setLoading(false); } });
    return () => { active = false; };
  }, [session]);
  const fullName = profile?.full_name || session.user.user_metadata?.full_name || "Student reader";
  return <main className="content-width page-wrap account-page">
    <div className="account-heading"><div><span className="eyebrow">YOUR READING CORNER</span><h1>Hello, <em>{fullName.split(" ")[0]}.</em></h1><p>Here's your little corner of the library.</p></div><button className="button button-outline" onClick={onSignOut}><LogOut size={16} /> Sign out</button></div>
    <div className="account-grid">
      <section className="account-panel profile-panel"><div className="panel-topline"><span className="eyebrow">YOUR PROFILE</span><span className="profile-badge">{profile?.role === "admin" ? <ShieldCheck size={14} /> : <GraduationCap size={14} />}{profile?.role === "admin" ? "Administrator" : "Student"}</span></div><div className="profile-avatar">{fullName.slice(0, 1).toUpperCase()}</div><h2>{fullName}</h2><p>{session.user.email}</p><div className="profile-detail-list"><div><span>Class / year</span><strong>{profile?.class_name || session.user.user_metadata?.class_name || "Not added"}</strong></div><div><span>Member since</span><strong>{shortDate(session.user.created_at)}</strong></div><div><span>Account type</span><strong>{profile?.role === "admin" ? "Library administrator" : "Student reader"}</strong></div></div></section>
      <section className="account-panel loan-panel"><div className="panel-topline"><div><span className="eyebrow">YOUR LIBRARY ACTIVITY</span><h2>Borrowing requests</h2></div><Link className="text-link" to="/catalog">Find a book <ArrowRight size={15} /></Link></div>
        {!supabase && <div className="setup-notice"><CircleHelp size={19} /><span>Connect Supabase to view borrowing activity and send requests.</span></div>}
        {loading ? <PageLoader /> : loans.length ? <div className="loan-list">{loans.map((loan) => <div className="loan-row" key={loan.id}><span className="loan-book-icon"><BookMarked size={18} /></span><div><strong>{loan.books?.title || "Library book"}</strong><small>{loan.books?.author || "School collection"} · {shortDate(loan.created_at)}</small></div><span className={"status-pill status-" + loan.status}>{loan.status}</span></div>)}</div> : supabase ? <div className="account-empty"><BookOpen size={27} /><strong>No requests just yet.</strong><p>Your next read is waiting to be found.</p><Link className="text-link" to="/catalog">Explore books <ArrowRight size={15} /></Link></div> : null}
      </section>
    </div>
  </main>;
}

function AdminShell({ profile, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="admin-layout">
    <aside className={cn("admin-sidebar", mobileOpen && "sidebar-open")}>
      <div className="admin-brand-row"><Brand /><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="admin-sidebar-label">WORKSPACE</div>
      <nav className="admin-nav">
        <NavLink to="/admin" end onClick={() => setMobileOpen(false)}><LayoutDashboard size={17} /> Overview</NavLink>
        <NavLink to="/admin/books" onClick={() => setMobileOpen(false)}><Library size={17} /> Book collection</NavLink>
      </nav>
      <div className="admin-sidebar-label admin-sidebar-label-lower">LIBRARY</div>
      <div className="admin-sidebar-note"><BookOpen size={19} /><strong>Keep the shelves<br />full of possibility.</strong><span>Manage the collection and help students find their next read.</span></div>
      <div className="admin-sidebar-bottom"><span className="admin-mini-avatar">{(profile?.full_name || "A").slice(0, 1).toUpperCase()}</span><span><strong>{profile?.full_name || "Library admin"}</strong><small>Administrator</small></span><ShieldCheck size={16} /></div>
    </aside>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    <div className="admin-main">
      <header className="admin-topbar"><button className="icon-button admin-menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div><span className="eyebrow">STACKS / ADMINISTRATION</span><span className="admin-topbar-title">Library workspace</span></div><Link className="admin-view-site" to="/">View student site <ArrowUpRight size={15} /></Link></header>
      <div className="admin-content">{children}</div>
    </div>
  </div>;
}

function AdminOverview() {
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [bookResult, loanResult] = await Promise.all([
      supabase.from("books").select("id,title,author,is_published,copies_available,copies_total"),
      supabase.from("loan_requests").select("id,status,created_at,profiles(full_name,email),books(title,author)").order("created_at", { ascending: false }).limit(8),
    ]);
    if (bookResult.error || loanResult.error) setError(bookResult.error?.message || loanResult.error?.message || "Could not load library data.");
    setBooks(bookResult.data || []); setLoans(loanResult.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const pending = loans.filter((loan) => loan.status === "pending").length;
  const updateStatus = async (id, status) => {
    const { error: updateError } = await supabase.from("loan_requests").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message); else load();
  };
  return <>
    <div className="admin-page-heading"><div><span className="eyebrow">YOUR LIBRARY, AT A GLANCE</span><h1>Good day, <em>librarian.</em></h1><p>Here's what's happening across the stacks.</p></div><Link className="button button-dark" to="/admin/books"><BookPlus size={16} /> Manage books <ArrowUpRight size={16} /></Link></div>
    {!supabase && <div className="setup-notice"><CircleHelp size={19} /><span>Connect Supabase and run <code>supabase/schema.sql</code> to activate library management.</span></div>}
    {error && <div className="form-message form-error"><X size={16} />{error}</div>}
    <div className="admin-stat-grid">
      <div className="admin-stat-card"><span>BOOKS IN COLLECTION</span><strong>{loading ? "—" : books.length}</strong><BookOpen size={19} /></div>
      <div className="admin-stat-card"><span>PUBLISHED TITLES</span><strong>{loading ? "—" : books.filter((b) => b.is_published).length}</strong><Library size={19} /></div>
      <div className="admin-stat-card"><span>PENDING REQUESTS</span><strong>{loading ? "—" : pending}</strong><Clock3 size={19} /></div>
      <div className="admin-stat-card"><span>AVAILABLE COPIES</span><strong>{loading ? "—" : books.reduce((sum, b) => sum + (b.copies_available || 0), 0)}</strong><BookMarked size={19} /></div>
    </div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>Recent borrowing requests</h2></div><span className="admin-count">{loans.length} recent</span></div>
      {loading ? <PageLoader /> : loans.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>STUDENT</th><th>BOOK</th><th>REQUESTED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><strong>{loan.profiles?.full_name || "Student"}</strong><small>{loan.profiles?.email || ""}</small></td><td>{loan.books?.title || "Book"}</td><td>{shortDate(loan.created_at)}</td><td><span className={"status-pill status-" + loan.status}>{loan.status}</span></td><td>{loan.status === "pending" ? <div className="table-actions"><button title="Approve request" onClick={() => updateStatus(loan.id, "approved")}><Check size={15} /></button><button title="Reject request" onClick={() => updateStatus(loan.id, "rejected")}><X size={15} /></button></div> : <span className="muted-dash">—</span>}</td></tr>)}</tbody></table></div> : <div className="admin-empty"><ClipboardIcon /><strong>No borrowing requests yet</strong><span>Student requests will appear here when they arrive.</span></div>}
    </section>
  </>;
}

function ClipboardIcon() { return <BookMarked size={26} />; }

function AdminBooks() {
  const blank = { title: "", author: "", category: "Fiction", description: "", cover_url: "", language: "English", published_year: "", isbn: "", copies_total: 1, copies_available: 1, is_featured: false, is_published: true };
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase));
  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error: loadError } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message); else setBooks(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const edit = (book) => {
    setEditingId(book.id);
    setForm({ ...blank, ...book, published_year: book.published_year || "" });
    setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setEditingId(null); setForm(blank); setMessage(""); setError(""); };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const payload = { ...form, published_year: form.published_year ? Number(form.published_year) : null, copies_total: Number(form.copies_total), copies_available: Number(form.copies_available) };
    const result = editingId ? await supabase.from("books").update(payload).eq("id", editingId) : await supabase.from("books").insert(payload);
    setBusy(false);
    if (result.error) setError(result.error.message);
    else { setMessage(editingId ? "Book details updated." : "Book added to the collection."); reset(); load(); }
  };
  const remove = async (book) => {
    if (!window.confirm("Remove “" + book.title + "” from the collection?")) return;
    const { error: deleteError } = await supabase.from("books").delete().eq("id", book.id);
    if (deleteError) setError(deleteError.message); else load();
  };
  return <>
    <div className="admin-page-heading"><div><span className="eyebrow">THE SHELVES</span><h1>Book <em>collection.</em></h1><p>Add titles, update details and keep the catalog fresh.</p></div><span className="admin-count">{books.length} titles</span></div>
    {!supabase && <div className="setup-notice"><CircleHelp size={19} /><span>Connect Supabase to add or edit books. Demo books are shown on the student catalog.</span></div>}
    {error && <div className="form-message form-error"><X size={16} />{error}</div>}
    {message && <div className="form-message form-success"><Check size={16} />{message}</div>}
    <section className="admin-panel book-editor-panel"><div className="admin-panel-heading"><div><span className="eyebrow">{editingId ? "UPDATE A TITLE" : "GROW THE COLLECTION"}</span><h2>{editingId ? "Edit book details" : "Add a new book"}</h2></div>{editingId && <button className="button button-outline button-small" onClick={reset}>Cancel edit</button>}</div>
      <form className="book-editor-form" onSubmit={save}>
        <label>Book title<input required value={form.title} onChange={(e) => change("title", e.target.value)} placeholder="e.g. The Secret Garden" /></label>
        <label>Author<input value={form.author} onChange={(e) => change("author", e.target.value)} placeholder="Author name" /></label>
        <label>Category<select value={form.category} onChange={(e) => change("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
        <label>Language<input value={form.language} onChange={(e) => change("language", e.target.value)} /></label>
        <label>Published year<input type="number" min="0" max="2100" value={form.published_year} onChange={(e) => change("published_year", e.target.value)} placeholder="e.g. 1911" /></label>
        <label>ISBN<input value={form.isbn || ""} onChange={(e) => change("isbn", e.target.value)} placeholder="Optional" /></label>
        <label className="editor-wide">Cover image URL<input type="url" value={form.cover_url || ""} onChange={(e) => change("cover_url", e.target.value)} placeholder="https://…" /></label>
        <label className="editor-wide">Description<textarea rows="3" value={form.description || ""} onChange={(e) => change("description", e.target.value)} placeholder="A short description for students…" /></label>
        <label>Total copies<input type="number" min="0" value={form.copies_total} onChange={(e) => change("copies_total", e.target.value)} /></label>
        <label>Available copies<input type="number" min="0" value={form.copies_available} onChange={(e) => change("copies_available", e.target.value)} /></label>
        <div className="editor-checks"><label><input type="checkbox" checked={form.is_published} onChange={(e) => change("is_published", e.target.checked)} /> Visible in catalog</label><label><input type="checkbox" checked={form.is_featured} onChange={(e) => change("is_featured", e.target.checked)} /> Staff pick</label></div>
        <div className="editor-actions"><button className="button button-dark" type="submit" disabled={busy || !supabase}>{busy ? "Saving…" : editingId ? "Save changes" : "Add to collection"}<ArrowUpRight size={16} /></button></div>
      </form>
    </section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">ALL TITLES</span><h2>Manage your books</h2></div></div>
      {loading ? <PageLoader /> : books.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TITLE</th><th>CATEGORY</th><th>COPIES</th><th>VISIBILITY</th><th>ACTION</th></tr></thead><tbody>{books.map((book) => <tr key={book.id}><td><strong>{book.title}</strong><small>{book.author || "Unknown author"}</small></td><td>{book.category}</td><td>{book.copies_available} / {book.copies_total}</td><td><span className={"status-pill " + (book.is_published ? "status-approved" : "status-rejected")}>{book.is_published ? "Published" : "Hidden"}</span></td><td><div className="table-actions"><button title="Edit book" onClick={() => edit(book)}><Settings2 size={15} /></button><button title="Delete book" onClick={() => remove(book)}><X size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><BookOpen size={26} /><strong>Your collection is ready for its first title</strong><span>Add a book using the form above.</span></div>}
    </section>
  </>;
}

function AdminPage({ profile }) {
  const location = useLocation();
  return <AdminShell profile={profile}>
    {location.pathname === "/admin/books" ? <AdminBooks /> : <AdminOverview />}
  </AdminShell>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [profileLoading, setProfileLoading] = useState(false);
  const [books, setBooks] = useState(DEMO_BOOKS);
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }) => { if (!error) setSession(data.session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!session || !supabase) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    supabase.from("profiles").select("id,full_name,class_name,email,role,created_at").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => { if (active) { setProfile(data || null); setProfileLoading(false); } });
    return () => { active = false; };
  }, [session?.user?.id]);
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.from("books").select("*").eq("is_published", true).order("created_at", { ascending: false })
      .then(({ data, error }) => { if (active && !error && data?.length) setBooks(data); });
    return () => { active = false; };
  }, []);
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };
  return <BrowserRouter>
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" session={session} />} />
      <Route path="/register" element={<AuthPage mode="register" session={session} />} />
      <Route path="/admin/*" element={<AdminRoute session={session} authLoading={authLoading} profileLoading={profileLoading} profile={profile}><AdminPage profile={profile} /></AdminRoute>} />
      <Route path="/*" element={<><SiteHeader session={session} profile={profile} onSignOut={signOut} /><Routes>
        <Route path="/" element={<HomePage books={books} />} />
        <Route path="/catalog" element={<CatalogPage books={books} />} />
        <Route path="/books/:id" element={<BookDetailPage books={books} session={session} />} />
        <Route path="/account" element={<ProtectedRoute session={session} authLoading={authLoading} profileLoading={profileLoading}><AccountPage session={session} profile={profile} onSignOut={signOut} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes><SiteFooter /></>} />
    </Routes>
  </BrowserRouter>;
}

export default App;

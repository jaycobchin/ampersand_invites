import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flower2,
  Heart,
  ListChecks,
  MapPin,
  Plus,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge, currency, dateLabel, daysUntil, guestStatus, totals, useApp } from '../lib';

export function Dashboard() {
  const { data, navigate, mutate } = useApp(),
    w = data.wedding!;
  const done = w.tasks.filter((t) => t.done).length,
    progress = w.tasks.length ? Math.round((done / w.tasks.length) * 100) : 0;
  const attending = w.guests.filter((g) => guestStatus(g) === 'attending').length,
    pending = w.guests.filter((g) => guestStatus(g) === 'pending').length;
  const budget = totals(w),
    upcoming = [...w.tasks]
      .filter((t) => !t.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 4);
  const recommended = data.vendors
    .filter((v) => !w.selections.some((s) => s.vendorId === v.id))
    .slice(0, 3);
  return (
    <div className="dashboard">
      <div className="dashboard-greeting">
        <span className="eyebrow">A LITTLE CLOSER TO YOUR BIG DAY</span>
        <span className="greeting-date">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="couple-title">
            {w.partner1} <em>&</em> {w.partner2}
          </div>
          <h1>
            Your day.
            <br />
            <em>Coming together.</em>
          </h1>
          <p>A little planning today. A beautiful memory tomorrow.</p>
          <div className="hero-details">
            <span>
              <CalendarDays size={15} />
              {dateLabel(w.date)}
            </span>
            <span>
              <MapPin size={15} />
              {w.city}
            </span>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src={w.cover || '/images/wedding.jpg'}
            alt="Flowers and thoughtful details for a wedding celebration"
          />
          <div className="countdown-badge">
            <Flower2 size={23} strokeWidth={1} />
            <strong>{daysUntil(w.date)}</strong>
            <span>DAYS TO GO</span>
          </div>
          <div className="hero-photo-caption">The best is yet to come.</div>
        </div>
      </section>
      <div className="section-label">
        <span>YOUR WEDDING, AT A GLANCE</span>
        <span>Every little step counts.</span>
      </div>
      <div className="stats-grid">
        <button className="stat-card" onClick={() => navigate('/planning')}>
          <div className="stat-top">
            Planning progress
            <ListChecks size={18} />
          </div>
          <div className="stat-value">
            {progress}
            <small>%</small>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="stat-bottom">
            {done} of {w.tasks.length} little things, done <ArrowUpRight size={14} />
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('/guests')}>
          <div className="stat-top">
            Joining the celebration
            <Users size={18} />
          </div>
          <div className="stat-value">
            {attending}
            <small> / {w.guests.length}</small>
          </div>
          <div className="stat-bottom">
            <span>
              <span className="status-dot amber" />
              {pending} awaiting a reply
            </span>
            <ArrowUpRight size={14} />
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('/vendors')}>
          <div className="stat-top">
            Your dream team
            <Flower2 size={18} />
          </div>
          <div className="stat-value">
            {new Set(w.selections.map((s) => s.category)).size}
            <small> / 5</small>
          </div>
          <div className="stat-bottom">
            {w.shortlist.length} vendors on your shortlist
            <ArrowUpRight size={14} />
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('/budget')}>
          <div className="stat-top">
            Budget remaining
            <Wallet size={18} />
          </div>
          <div className="stat-value money">{currency(budget.remaining, w.currency)}</div>
          <div className="stat-bottom">
            of {currency(w.totalBudget, w.currency)} planned
            <ArrowUpRight size={14} />
          </div>
        </button>
      </div>
      <div className="dashboard-middle">
        <section className="card next-steps">
          <div className="card-heading">
            <div>
              <span className="eyebrow">ONE THING AT A TIME</span>
              <h2>A little next step.</h2>
            </div>
            <button className="text-button" onClick={() => navigate('/planning')}>
              View checklist <ArrowRight size={15} />
            </button>
          </div>
          <div className="task-list">
            {upcoming.length ? (
              upcoming.map((task) => (
                <div className="task-row" key={task.id}>
                  <button
                    className="task-check"
                    aria-label={`Complete ${task.title}`}
                    onClick={() => {
                      const { id, ...rest } = task;
                      mutate(
                        `/wedding/tasks/${id}`,
                        'PATCH',
                        { ...rest, done: true },
                        'One little thing, done.',
                      );
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <div className="task-name">
                    <strong>{task.title}</strong>
                    <span>{task.category}</span>
                  </div>
                  <span className="task-due">{dateLabel(task.due, true)}</span>
                </div>
              ))
            ) : (
              <div className="mini-empty">
                <Check size={24} />
                <p>You’re all caught up. Take a little moment for yourselves.</p>
              </div>
            )}
          </div>
          <button className="add-task-link" onClick={() => navigate('/planning')}>
            <Plus size={15} />
            Add a little to-do
          </button>
        </section>
        <section className="website-preview-card">
          <div className="website-preview-art">
            <div className="preview-frame">
              <span>WE’RE GETTING MARRIED</span>
              <Flower2 size={33} strokeWidth={1} />
              <h3>
                {w.partner1}
                <em>&</em>
                {w.partner2}
              </h3>
              <p>{dateLabel(w.date)}</p>
            </div>
            <span className="preview-label">YOUR WEDDING WEBSITE</span>
          </div>
          <div className="website-preview-bottom">
            <div>
              <h3>Your love story, shared.</h3>
              <p>
                {w.published
                  ? 'Your little corner of the internet is live.'
                  : 'A beautiful place to welcome your guests.'}
              </p>
            </div>
            <button aria-label="Edit wedding website" onClick={() => navigate('/website')}>
              <ArrowUpRight size={20} />
            </button>
          </div>
        </section>
      </div>
      <section className="dashboard-vendors">
        <div className="card-heading">
          <div>
            <span className="eyebrow">GOOD PEOPLE. BEAUTIFUL THINGS.</span>
            <h2>Meet your dream team.</h2>
          </div>
          <button className="text-button" onClick={() => navigate('/vendors')}>
            Explore vendors <ArrowRight size={15} />
          </button>
        </div>
        {recommended.length ? (
          <div className="vendor-grid">
            {recommended.map((v) => (
              <button
                className="vendor-card compact"
                key={v.id}
                onClick={() => navigate('/vendors')}
              >
                <div className="vendor-photo">
                  <img src={v.image || '/images/flowers.jpg'} alt={v.name} />
                  <span className="vendor-category">{v.category}</span>
                  <span className={`vendor-heart ${w.shortlist.includes(v.id) ? 'saved' : ''}`}>
                    <Heart size={17} />
                  </span>
                </div>
                <div className="vendor-card-body">
                  <h3>{v.name}</h3>
                  <p>
                    <MapPin size={13} />
                    {v.city}
                    <span>From {currency(v.price, v.currency)}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card mini-empty">
            <Flower2 size={25} />
            <p>
              Your vendor marketplace will grow as local businesses join. Browse to see available
              profiles.
            </p>
            <button className="button secondary" onClick={() => navigate('/vendors')}>
              Explore vendors
            </button>
          </div>
        )}
      </section>
      <div className="dashboard-note">
        <Heart size={16} strokeWidth={1.3} />
        <p>
          Remember, the most important thing is already sorted. <em>You found each other.</em>
        </p>
      </div>
    </div>
  );
}

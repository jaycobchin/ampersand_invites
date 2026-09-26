import { useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  Flower2,
  Globe2,
  Link,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  CopyLink,
  Empty,
  Field,
  Modal,
  PageHeading,
  SaveForm,
  categories,
  currency,
  dateLabel,
  formValues,
  today,
  totals,
  useApp,
} from '../lib';
import type { Task, Event, Budget } from '../types';
import { WeddingFields } from './Auth';

export function Planning() {
  const { data, mutate } = useApp(),
    w = data.wedding!;
  const [filter, setFilter] = useState('all'),
    [editing, setEditing] = useState<Task | 'new' | null>(null);
  const done = w.tasks.filter((t) => t.done).length,
    progress = w.tasks.length ? Math.round((done / w.tasks.length) * 100) : 0;
  const tasks = [...w.tasks]
    .filter((t) => filter === 'all' || (filter === 'done' ? t.done : !t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  return (
    <>
      <PageHeading
        eyebrow="LITTLE STEPS, BIG DAY"
        title="One thing at a time."
        description="A thoughtful plan, with plenty of room to make it your own."
      >
        <button className="button primary" onClick={() => setEditing('new')}>
          <Plus size={17} />
          Add a task
        </button>
      </PageHeading>
      <div className="planning-progress card">
        <span className="progress-flower">
          <Flower2 size={30} strokeWidth={1.3} />
        </span>
        <div>
          <h3>{done} little things, done.</h3>
          <p>
            {done === w.tasks.length
              ? 'You’re all caught up. Enjoy a little time together.'
              : 'You’re making something beautiful, one step at a time.'}
          </p>
        </div>
        <div className="planning-progress-bar">
          <strong>{progress}%</strong>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="tabs">
        {[
          ['all', 'All tasks'],
          ['todo', 'To do'],
          ['done', 'Completed'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? 'active' : ''}
            onClick={() => setFilter(value)}
          >
            {label}
            {value === 'all' && <span>{w.tasks.length}</span>}
          </button>
        ))}
      </div>
      <div className="card checklist-card">
        {tasks.length ? (
          tasks.map((task) => (
            <div className={`task-row large ${task.done ? 'done' : ''}`} key={task.id}>
              <button
                className={`task-check ${task.done ? 'checked' : ''}`}
                aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
                onClick={() =>
                  mutate(`/wedding/tasks/${task.id}`, 'PATCH', { ...task, done: !task.done })
                }
              >
                <Check size={15} />
              </button>
              <div className="task-name">
                <strong>{task.title}</strong>
                <span>{task.notes || task.category}</span>
              </div>
              <Badge>{task.category}</Badge>
              <span className={`task-due ${!task.done && task.due < today() ? 'overdue' : ''}`}>
                <CalendarDays size={14} />
                {dateLabel(task.due, true)}
              </span>
              <button
                className="icon-button"
                aria-label={`Edit ${task.title}`}
                onClick={() => setEditing(task)}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button danger"
                aria-label={`Delete ${task.title}`}
                onClick={() => {
                  if (confirm('Remove this task from your checklist?'))
                    mutate(`/wedding/tasks/${task.id}`, 'DELETE', {}, 'Task removed.');
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            title="A little breathing room."
            text="No tasks in this view. Add something to your plan whenever you’re ready."
          />
        )}
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? 'A little to-do.' : 'Make a little adjustment.'}
          close={() => setEditing(null)}
        >
          <SaveForm
            label="Save task"
            onSave={async (form) => {
              const values = formValues(form);
              if (
                await mutate(
                  `/wedding/tasks${editing === 'new' ? '' : `/${editing.id}`}`,
                  editing === 'new' ? 'POST' : 'PATCH',
                  { ...values, done: editing === 'new' ? false : editing.done },
                  'Your checklist is up to date.',
                )
              )
                setEditing(null);
            }}
          >
            <Field label="What needs doing?">
              <input
                name="title"
                defaultValue={editing === 'new' ? '' : editing.title}
                maxLength={200}
                required
              />
            </Field>
            <div className="form-row">
              <Field label="Category">
                <select
                  name="category"
                  defaultValue={editing === 'new' ? 'Planning' : editing.category}
                >
                  {['Planning', 'Guests', ...categories, 'Ceremony', 'Reception', 'Logistics'].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Due date">
                <input
                  name="due"
                  type="date"
                  defaultValue={editing === 'new' ? today() : editing.due}
                  required
                />
              </Field>
            </div>
            <Field label="A few notes">
              <textarea
                name="notes"
                defaultValue={editing === 'new' ? '' : editing.notes}
                rows={3}
                maxLength={2000}
              />
            </Field>
            {editing !== 'new' && (
              <button
                className="text-button danger"
                type="button"
                onClick={async () => {
                  if (
                    confirm('Remove this task from your checklist?') &&
                    (await mutate(`/wedding/tasks/${editing.id}`, 'DELETE', {}, 'Task removed.'))
                  )
                    setEditing(null);
                }}
              >
                <Trash2 size={14} />
                Remove task
              </button>
            )}
          </SaveForm>
        </Modal>
      )}
    </>
  );
}
export function Events() {
  const { data, mutate } = useApp(),
    w = data.wedding!;
  const [editing, setEditing] = useState<Event | 'new' | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="THE WAY YOUR DAY UNFOLDS"
        title="Moments to look forward to."
        description="From the first happy tears to the last dance."
      >
        <button className="button primary" onClick={() => setEditing('new')}>
          <Plus size={17} />
          Add event
        </button>
      </PageHeading>
      <div className="events-grid">
        {[...w.events]
          .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
          .map((event, i) => (
            <article className="card event-card" key={event.id}>
              <div className="event-card-top">
                <span className="event-number">0{i + 1}</span>
                <Badge tone={event.visibility === 'public' ? 'attending' : ''}>
                  {event.visibility === 'public' ? 'Public event' : 'Invite only'}
                </Badge>
                <button
                  className="icon-button"
                  aria-label={`Edit ${event.name}`}
                  onClick={() => setEditing(event)}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <h2>{event.name}</h2>
              <p>{event.description || 'A beautiful part of your day.'}</p>
              <div className="event-details">
                <span>
                  <CalendarDays size={17} />
                  {dateLabel(event.date)}
                </span>
                <span>
                  <Clock3 size={17} />
                  {event.time}
                </span>
                <span>
                  <MapPin size={17} />
                  {event.venue || 'Venue to be confirmed'}
                </span>
                {event.address && <small>{event.address}</small>}
              </div>
              <div className="event-card-bottom">
                <span>
                  <Users size={15} />
                  {w.guests.filter((g) => g.eventIds.includes(event.id)).length} invited
                </span>
                <button
                  className="text-button danger"
                  onClick={() => {
                    if (
                      confirm('Delete this event and its guest responses? This cannot be undone.')
                    )
                      mutate(`/wedding/events/${event.id}`, 'DELETE', {}, 'Event removed.');
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
      </div>
      {!w.events.length && (
        <div className="card">
          <Empty
            title="Let’s set the scene."
            text="Create your ceremony, reception, or any other moment you’d love to share."
          >
            <button className="button primary" onClick={() => setEditing('new')}>
              <Plus size={16} />
              Add your first event
            </button>
          </Empty>
        </div>
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'A moment worth sharing.' : 'Edit your event.'}
          close={() => setEditing(null)}
        >
          <SaveForm
            label="Save event"
            onSave={async (form) => {
              if (
                await mutate(
                  `/wedding/events${editing === 'new' ? '' : `/${editing.id}`}`,
                  editing === 'new' ? 'POST' : 'PATCH',
                  formValues(form),
                  'Event saved.',
                )
              )
                setEditing(null);
            }}
          >
            <Field label="Event name">
              <input
                name="name"
                required
                defaultValue={editing === 'new' ? '' : editing.name}
                placeholder="The solemnisation"
                maxLength={200}
              />
            </Field>
            <div className="form-row">
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing === 'new' ? w.date : editing.date}
                />
              </Field>
              <Field label="Start time">
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={editing === 'new' ? '16:00' : editing.time}
                />
              </Field>
            </div>
            <Field label="Venue">
              <input
                name="venue"
                defaultValue={editing === 'new' ? '' : editing.venue}
                maxLength={200}
              />
            </Field>
            <Field label="Address">
              <input
                name="address"
                defaultValue={editing === 'new' ? '' : editing.address}
                maxLength={500}
              />
            </Field>
            <Field label="Dress code">
              <input
                name="dressCode"
                defaultValue={editing === 'new' ? '' : editing.dressCode}
                placeholder="Garden formal"
                maxLength={200}
              />
            </Field>
            <Field label="A few words about this moment">
              <textarea
                name="description"
                defaultValue={editing === 'new' ? '' : editing.description}
                rows={3}
                maxLength={2000}
              />
            </Field>
            <Field
              label="Visibility"
              hint="Invite-only events appear only on assigned guests’ private invitations."
            >
              <select
                name="visibility"
                defaultValue={editing === 'new' ? 'public' : editing.visibility}
              >
                <option value="public">Show on our public wedding page</option>
                <option value="invited_only">Only show to invited guests</option>
              </select>
            </Field>
          </SaveForm>
        </Modal>
      )}
    </>
  );
}
export function BudgetPage() {
  const { data, mutate } = useApp(),
    w = data.wedding!,
    values = totals(w);
  const [editing, setEditing] = useState<Budget | 'new' | null>(null),
    [totalEdit, setTotalEdit] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="ROOM FOR WHAT MATTERS"
        title="Thoughtfully budgeted."
        description="A clear picture of your plans, commitments, and little splurges."
      >
        <button className="button secondary" onClick={() => setTotalEdit(true)}>
          <Pencil size={15} />
          Set total budget
        </button>
        <button className="button primary" onClick={() => setEditing('new')}>
          <Plus size={17} />
          Add category
        </button>
      </PageHeading>
      <div className="stats-grid budget-stats">
        {[
          ['Total budget', w.totalBudget],
          ['Committed', values.committed],
          ['Paid so far', values.paid],
          ['Room remaining', values.remaining],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              {label}
              <Wallet size={17} />
            </div>
            <div className="stat-value money">{currency(Number(value), w.currency)}</div>
          </div>
        ))}
      </div>
      <div className="card budget-overview">
        <div>
          <h3>A little perspective.</h3>
          <p>
            {w.totalBudget ? Math.round((values.committed / w.totalBudget) * 100) : 0}% of your
            budget is committed.
            {values.remaining < 0
              ? ' Your commitments are above your planned budget.'
              : ' Every choice is making your day more yours.'}
          </p>
        </div>
        <div className="progress-track">
          <span
            style={{
              width: `${w.totalBudget ? Math.min(100, (values.committed / w.totalBudget) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
      <section className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Planned</th>
                <th>Other commitments</th>
                <th>Selected vendors</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {w.budget.map((b) => {
                const selected = w.selections
                  .filter((s) => s.category === b.name)
                  .reduce((n, s) => n + s.amount, 0);
                return (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                    </td>
                    <td>{currency(b.target, w.currency)}</td>
                    <td>{currency(b.committed, w.currency)}</td>
                    <td>{currency(selected, w.currency)}</td>
                    <td>{currency(b.paid, w.currency)}</td>
                    <td className={b.target - b.committed - selected < 0 ? 'negative' : ''}>
                      {currency(b.target - b.committed - selected, w.currency)}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${b.name} budget`}
                        onClick={() => setEditing(b)}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>
                  {currency(
                    w.budget.reduce((n, b) => n + b.target, 0),
                    w.currency,
                  )}
                </td>
                <td colSpan={2}>Committed: {currency(values.committed, w.currency)}</td>
                <td>{currency(values.paid, w.currency)}</td>
                <td>{currency(values.remaining, w.currency)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="table-footer">
          Selected vendor quotes are added automatically. Record other commitments and payments
          here.
        </div>
      </section>
      {editing && (
        <Modal
          title={
            editing === 'new'
              ? 'Room for another detail.'
              : `${editing.name}, thoughtfully planned.`
          }
          close={() => setEditing(null)}
        >
          <SaveForm
            label="Save budget category"
            onSave={async (form) => {
              const v = formValues(form);
              if (
                await mutate(
                  `/wedding/budget${editing === 'new' ? '' : `/${editing.id}`}`,
                  editing === 'new' ? 'POST' : 'PATCH',
                  {
                    ...v,
                    target: Number(v.target),
                    committed: Number(v.committed),
                    paid: Number(v.paid),
                  },
                  'Budget updated.',
                )
              )
                setEditing(null);
            }}
          >
            <Field label="Category">
              <input
                name="name"
                required
                readOnly={editing !== 'new'}
                defaultValue={editing === 'new' ? '' : editing.name}
                maxLength={80}
              />
            </Field>
            <Field label={`Planned amount (${w.currency})`}>
              <input
                name="target"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing === 'new' ? 0 : editing.target}
              />
            </Field>
            <Field
              label={`Other committed amount (${w.currency})`}
              hint="Exclude selected vendor quotes; they are included automatically."
            >
              <input
                name="committed"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing === 'new' ? 0 : editing.committed}
              />
            </Field>
            <Field label={`Total paid (${w.currency})`}>
              <input
                name="paid"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing === 'new' ? 0 : editing.paid}
              />
            </Field>
          </SaveForm>
        </Modal>
      )}
      {totalEdit && (
        <Modal title="Set the bigger picture." close={() => setTotalEdit(false)}>
          <SaveForm
            label="Save total budget"
            onSave={async (form) => {
              if (
                await mutate(
                  '/wedding',
                  'PATCH',
                  { totalBudget: Number(formValues(form).totalBudget) },
                  'Total budget updated.',
                )
              )
                setTotalEdit(false);
            }}
          >
            <Field label={`Total wedding budget (${w.currency})`}>
              <input
                name="totalBudget"
                type="number"
                required
                min="0"
                step="0.01"
                defaultValue={w.totalBudget}
              />
            </Field>
          </SaveForm>
        </Modal>
      )}
    </>
  );
}
export function Website() {
  const { data, mutate, navigate } = useApp(),
    w = data.wedding!,
    owner = w.ownerId === data.user.id;
  const [theme, setTheme] = useState(w.theme);
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CORNER OF THE INTERNET"
        title="Your love story, shared."
        description="A beautiful welcome for the people who will be there."
      >
        <Badge tone={w.published ? 'attending' : 'pending'}>
          {w.published ? 'Published' : 'Draft'}
        </Badge>
        <a className="button secondary" href={`/w/${w.slug}`} target="_blank" rel="noreferrer">
          Preview
          <ArrowUpRight size={16} />
        </a>
        {owner && (
          <button
            className="button primary"
            onClick={() =>
              mutate(
                '/wedding',
                'PATCH',
                { published: !w.published },
                w.published
                  ? 'Your wedding page is now unpublished.'
                  : 'Your wedding website is live.',
              )
            }
          >
            {w.published ? 'Unpublish' : 'Publish website'}
            <Globe2 size={16} />
          </button>
        )}
      </PageHeading>
      <div className="website-editor">
        <section className="card editor-form">
          <SaveForm
            label="Save website"
            onSave={(form) => {
              const v = formValues(form);
              delete v.themeChoice;
              return mutate(
                '/wedding',
                'PATCH',
                { ...v, theme },
                'Your wedding website is updated.',
              );
            }}
          >
            <div>
              <h2>Make it feel like you.</h2>
              <p className="muted">Your names, date, and events stay in sync with your wedding.</p>
            </div>
            <fieldset className="theme-picker">
              <legend>Choose your mood</legend>
              {[
                ['garden', 'Garden', 'A little wild, a little romantic'],
                ['classic', 'Classic', 'Timeless, like the two of you'],
                ['rose', 'Rose', 'Soft and full of heart'],
              ].map(([value, label, desc]) => (
                <label key={value} className={`theme-choice ${theme === value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="themeChoice"
                    value={value}
                    checked={theme === value}
                    onChange={() => setTheme(value)}
                  />
                  <span className={`theme-swatch ${value}`}>Aa</span>
                  <strong>{label}</strong>
                </label>
              ))}
            </fieldset>
            <Field
              label="Cover image URL"
              hint="Paste a direct HTTPS image link, or keep the included wedding photograph."
            >
              <input name="cover" defaultValue={w.cover} maxLength={2000} />
            </Field>
            <Field label="Your story">
              <textarea name="story" defaultValue={w.story} rows={5} maxLength={5000} />
            </Field>
            <Field label="Good to know / frequently asked questions">
              <textarea name="faq" defaultValue={w.faq} rows={4} maxLength={5000} />
            </Field>
            {owner && (
              <>
                <Field label="Your website address">
                  <div className="slug-input">
                    <span>/w/</span>
                    <input
                      name="slug"
                      defaultValue={w.slug}
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      minLength={3}
                      maxLength={80}
                    />
                  </div>
                </Field>
                <Field label="Who can see your website?">
                  <select name="visibility" defaultValue={w.visibility}>
                    <option value="public">Anyone with the website address</option>
                    <option value="invite_only">Only guests with a private invitation link</option>
                  </select>
                </Field>
              </>
            )}
            <input type="hidden" name="theme" value={theme} />
          </SaveForm>
        </section>
        <aside>
          <div className={`website-live-preview ${theme}`}>
            <div className="browser-chrome">
              <i />
              <i />
              <i />
              <span>
                {w.partner1.toLowerCase()} & {w.partner2.toLowerCase()}
              </span>
            </div>
            <div
              className="live-preview-image"
              style={{
                backgroundImage: `url("${(w.cover || '/images/wedding.jpg').replace(/["\\\n\r]/g, '')}")`,
              }}
            >
              <span>TOGETHER WITH OUR FAMILIES</span>
              <h2>
                {w.partner1}
                <em>&</em>
                {w.partner2}
              </h2>
              <p>{dateLabel(w.date)}</p>
            </div>
            <div className="live-preview-copy">
              <Flower2 size={30} strokeWidth={1} />
              <h3>A celebration of us.</h3>
              <p>{w.story}</p>
              <span className="preview-rsvp">We hope you’ll join us</span>
            </div>
          </div>
          <div className="card website-share">
            <h3>Ready to share the love?</h3>
            <p>
              {w.visibility === 'invite_only'
                ? 'This website is invite-only. Share each household’s private link from your guest list.'
                : 'Share your website, then send private invitation links from your guest list to collect RSVPs.'}
            </p>
            {w.published && w.visibility === 'public' && <CopyLink path={`/w/${w.slug}`} />}
            <button className="text-button" onClick={() => navigate('/guests')}>
              Go to your guest list <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="card website-share">
            <h3>Your schedule</h3>
            <p>{w.events.length} events, kept in sync with your website.</p>
            <button className="text-button" onClick={() => navigate('/events')}>
              Manage events <ArrowUpRight size={15} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { data, mutate } = useApp(),
    w = data.wedding!,
    owner = w.ownerId === data.user.id;
  const [link, setLink] = useState('');
  return (
    <>
      <PageHeading
        eyebrow="THE DETAILS THAT MAKE IT YOURS"
        title="Your wedding, your way."
        description="A few essentials that bring everything together."
      />
      <div className="settings-grid">
        <section className="card editor-form">
          <h2>Your wedding details</h2>
          <SaveForm
            onSave={(form) => {
              const v = formValues(form);
              return mutate(
                '/wedding',
                'PATCH',
                {
                  ...v,
                  guestEstimate: Number(v.guestEstimate),
                  totalBudget: Number(v.totalBudget),
                },
                'Wedding details saved.',
              );
            }}
          >
            <WeddingFields wedding={w} />
          </SaveForm>
        </section>
        <div>
          <section className="card editor-form">
            <div className="card-heading">
              <h2>Better, together.</h2>
              <Users size={21} />
            </div>
            <p>Give a planner, friend, or family member a hand in making your day happen.</p>
            {w.members?.map((member) => (
              <div className="member-row" key={member.id}>
                <div className="avatar soft">{member.name[0]}</div>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
                {owner && (
                  <button
                    className="icon-button danger"
                    aria-label={`Remove collaborator ${member.name}`}
                    onClick={() => {
                      if (confirm(`Remove ${member.name} from your wedding workspace?`))
                        mutate(
                          `/wedding/collaborators/${member.id}`,
                          'DELETE',
                          {},
                          'Collaborator removed.',
                        );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {owner ? (
              <SaveForm
                label="Create invitation link"
                onSave={async (form) => {
                  const result = await mutate('/wedding/collaborators', 'POST', formValues(form));
                  if (result) setLink(result.path);
                }}
              >
                <Field label="Their email address">
                  <input name="email" type="email" required placeholder="someone@lovely.com" />
                </Field>
                <p className="field-hint">
                  They’ll need to sign in with this email. Links expire after 7 days. Copy the link
                  and send it yourself.
                </p>
              </SaveForm>
            ) : (
              <p className="muted">The wedding owner can invite and remove collaborators.</p>
            )}
            {link && (
              <div className="share-invite">
                <input
                  readOnly
                  aria-label="Collaborator invitation link"
                  value={window.location.origin + link}
                  onFocus={(e) => e.target.select()}
                />
                <CopyLink path={link} />
              </div>
            )}
          </section>
          <section className="card account-card">
            <h3>Your account</h3>
            <p>
              {data.user.name}
              <br />
              {data.user.email}
            </p>
            <Badge>{owner ? 'Wedding owner' : 'Collaborator'}</Badge>
          </section>
        </div>
      </div>
    </>
  );
}

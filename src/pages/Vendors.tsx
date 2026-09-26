import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flower2,
  Heart,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Badge,
  Empty,
  Field,
  Modal,
  PageHeading,
  SaveForm,
  api,
  categories,
  currency,
  dateLabel,
  formValues,
  today,
  useApp,
} from '../lib';
import type { Enquiry, Quote, Vendor } from '../types';

export function Vendors() {
  const { data, mutate } = useApp(),
    w = data.wedding!;
  const [tab, setTab] = useState('discover'),
    [category, setCategory] = useState('All'),
    [search, setSearch] = useState(''),
    [max, setMax] = useState('');
  const [detail, setDetail] = useState<Vendor | null>(null),
    [enquire, setEnquire] = useState<Vendor | null>(null),
    [quote, setQuote] = useState<Quote | null>(null);
  const vendors = data.vendors.filter(
    (v) =>
      (category === 'All' || v.category === category) &&
      `${v.name} ${v.city} ${v.description}`.toLowerCase().includes(search.toLowerCase()) &&
      (!max || v.price <= Number(max)) &&
      (tab !== 'mine' ||
        w.shortlist.includes(v.id) ||
        data.enquiries.some((e) => e.vendorId === v.id) ||
        w.selections.some((s) => s.vendorId === v.id)),
  );
  return (
    <>
      <PageHeading
        eyebrow="GOOD PEOPLE. BEAUTIFUL THINGS."
        title="Meet your dream team."
        description="Find the people who will help make your day feel like you."
      />
      <div className="tabs">
        <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>
          Discover vendors
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My vendors<span>{w.shortlist.length}</span>
        </button>
        <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>
          Compare quotes<span>{data.quotes.length}</span>
        </button>
      </div>
      {tab === 'quotes' ? (
        <section className="card table-card">
          {data.quotes.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vendor / package</th>
                    <th>Category</th>
                    <th>Quote</th>
                    <th>Valid until</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <strong>{q.vendor?.name}</strong>
                        <small className="table-subtitle">{q.title}</small>
                      </td>
                      <td>{q.vendor?.category}</td>
                      <td>
                        <strong>{currency(q.total, q.currency)}</strong>
                      </td>
                      <td>{dateLabel(q.expires, true)}</td>
                      <td>
                        <Badge tone={q.status === 'selected' ? 'attending' : ''}>
                          {q.expires < today() && q.status !== 'selected' ? 'Expired' : q.status}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="button secondary small-button"
                          onClick={() => {
                            setQuote(q);
                            mutate(`/quotes/${q.id}/viewed`);
                          }}
                        >
                          View quote <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="The possibilities are coming."
              text="Send an enquiry to a vendor. Their quote will appear here, ready for a thoughtful comparison."
            />
          )}
        </section>
      ) : (
        <>
          <div className="vendor-toolbar">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search vendors"
                placeholder="Search a name, location, or style…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input
              className="price-filter"
              aria-label="Maximum starting price"
              type="number"
              min="0"
              placeholder="Max starting price"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </div>
          <div className="category-filters">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                className={category === c ? 'active' : ''}
                onClick={() => setCategory(c)}
              >
                {c === 'All' ? 'All the lovely people' : c}
              </button>
            ))}
          </div>
          {data.user.demo && (
            <p className="sample-note">
              These are fictional vendors for exploring the product. Try the vendor workspace to
              respond to your enquiries.
            </p>
          )}
          <div className="vendor-grid marketplace-grid">
            {vendors.map((v) => {
              const enquiry = data.enquiries.find((e) => e.vendorId === v.id),
                selected = w.selections.some((s) => s.vendorId === v.id);
              return (
                <article className="vendor-card" key={v.id}>
                  <div className="vendor-photo">
                    <button
                      className="vendor-image-button"
                      onClick={() => setDetail(v)}
                      aria-label={`View ${v.name}`}
                    >
                      <img src={v.image || '/images/flowers.jpg'} alt={v.name} />
                    </button>
                    <span className="vendor-category">{v.category}</span>
                    <button
                      className={`vendor-heart ${w.shortlist.includes(v.id) ? 'saved' : ''}`}
                      aria-label={`${w.shortlist.includes(v.id) ? 'Remove' : 'Shortlist'} ${v.name}`}
                      onClick={() => mutate(`/wedding/shortlist/${v.id}`)}
                    >
                      <Heart size={18} />
                    </button>
                  </div>
                  <div className="vendor-card-body">
                    <div className="vendor-title-row">
                      <button className="vendor-title" onClick={() => setDetail(v)}>
                        <h3>{v.name}</h3>
                      </button>
                      {selected && (
                        <Badge tone="attending">
                          <Check size={12} />
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p className="vendor-location">
                      <MapPin size={13} />
                      {v.city}
                    </p>
                    <p className="vendor-description">{v.description}</p>
                    <div className="vendor-card-bottom">
                      <span>
                        From <strong>{currency(v.price, v.currency)}</strong>
                      </span>
                      <button className="text-button" onClick={() => setDetail(v)}>
                        Meet the vendor <ArrowUpRight size={15} />
                      </button>
                    </div>
                    {enquiry && (
                      <div className="enquiry-status">
                        <MessageSquare size={13} />
                        Enquiry: {enquiry.status}
                        <button onClick={() => setTab('quotes')}>View quotes</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!vendors.length && (
            <div className="card">
              <Empty
                title={
                  tab === 'mine'
                    ? 'A few favourites, all in one place.'
                    : 'Something lovely is on its way.'
                }
                text={
                  tab === 'mine'
                    ? 'Tap a heart to save a vendor, or send your first enquiry.'
                    : 'No approved vendors match these filters yet. Try another category or check back as businesses join.'
                }
              />
            </div>
          )}
        </>
      )}
      {detail && (
        <Modal title={detail.name} close={() => setDetail(null)} wide>
          <img
            className="vendor-detail-image"
            src={detail.image || '/images/flowers.jpg'}
            alt={detail.name}
          />
          <div className="vendor-detail-meta">
            <Badge>{detail.category}</Badge>
            <span>
              <MapPin size={14} />
              {detail.city}
            </span>
            <strong>From {currency(detail.price, detail.currency)}</strong>
          </div>
          <p>{detail.description}</p>
          {detail.portfolio.length > 1 && (
            <div className="portfolio-strip">
              {detail.portfolio.map((url, i) => (
                <img src={url} key={i} alt={`${detail.name} portfolio ${i + 1}`} />
              ))}
            </div>
          )}
          <h3>Packages, with you in mind.</h3>
          {detail.packages
            .filter((p) => p.active)
            .map((p, i) => (
              <div className="package-card" key={i}>
                <div>
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                </div>
                <strong>{currency(p.price, detail.currency)}</strong>
              </div>
            ))}
          <div className="form-footer">
            <button
              className="button secondary"
              onClick={() => mutate(`/wedding/shortlist/${detail.id}`)}
            >
              <Heart size={16} />
              {w.shortlist.includes(detail.id) ? 'Remove from shortlist' : 'Save to shortlist'}
            </button>
            <button
              className="button primary"
              onClick={() => {
                setEnquire(detail);
                setDetail(null);
              }}
            >
              Say a little hello
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {enquire && (
        <Modal title={`A hello to ${enquire.name}.`} close={() => setEnquire(null)}>
          <div className="enquiry-wedding-summary">
            <strong>
              {w.partner1} & {w.partner2}
            </strong>
            <span>
              {dateLabel(w.date)} · {w.city} · Around {w.guestEstimate} guests
            </span>
          </div>
          <p>
            We’ll include your wedding date, location, and estimated guest count, so they can make
            their response personal.
          </p>
          <SaveForm
            label="Send enquiry"
            onSave={async (form) => {
              if (
                await mutate(
                  '/wedding/enquiries',
                  'POST',
                  { vendorId: enquire.id, message: formValues(form).message },
                  'Your enquiry is in their vendor workspace.',
                )
              )
                setEnquire(null);
            }}
          >
            <Field label="Tell them what you have in mind">
              <textarea
                name="message"
                rows={5}
                minLength={10}
                maxLength={4000}
                required
                placeholder="We love your work! We’re imagining…"
              />
            </Field>
          </SaveForm>
        </Modal>
      )}
      {quote && <QuoteDetail quote={quote} close={() => setQuote(null)} />}
    </>
  );
}
function QuoteDetail({ quote, close }: { quote: Quote; close: () => void }) {
  const { mutate } = useApp();
  return (
    <Modal title={quote.title} close={close} wide>
      <div className="quote-heading">
        <div>
          <span className="eyebrow">PREPARED JUST FOR YOU</span>
          <h3>{quote.vendor?.name}</h3>
          <p>Valid until {dateLabel(quote.expires)}</p>
        </div>
        <Badge tone={quote.status === 'selected' ? 'attending' : ''}>{quote.status}</Badge>
      </div>
      <p>{quote.description}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Detail</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{currency(item.price, quote.currency)}</td>
                <td>{currency(item.price * item.quantity, quote.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="quote-total">
        <span>Total</span>
        <strong>{currency(quote.total, quote.currency)}</strong>
      </div>
      <p className="field-hint">
        Selecting this quote adds it to your committed wedding budget. Arrange contracts and
        payments directly with your vendor.
      </p>
      <div className="form-footer">
        <button
          className="button primary"
          disabled={
            quote.status === 'selected' || quote.expires < today() || quote.status === 'superseded'
          }
          onClick={async () => {
            if (
              confirm(
                `Choose ${quote.vendor?.name} and commit ${currency(quote.total, quote.currency)} to your budget?`,
              )
            ) {
              if (
                await mutate(
                  `/wedding/quotes/${quote.id}/select`,
                  'POST',
                  {},
                  'A lovely addition to your dream team. Your budget is updated.',
                )
              )
                close();
            }
          }}
        >
          {quote.status === 'selected'
            ? 'Part of your dream team'
            : quote.expires < today()
              ? 'This quote has expired'
              : 'Choose this vendor'}
          <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}

export function VendorWorkspace({ profile }: { profile: boolean }) {
  const { data, mutate, navigate } = useApp();
  const [quoting, setQuoting] = useState<Enquiry | null>(null),
    [filter, setFilter] = useState('all');
  if (profile) return <VendorProfile />;
  const enquiries = data.enquiries.filter((e) => filter === 'all' || e.status === filter);
  return (
    <>
      <PageHeading
        eyebrow="BE PART OF SOMETHING BEAUTIFUL"
        title={`Hello, ${data.vendor?.name || data.user.name}.`}
        description="Thoughtful enquiries from couples who love what you do."
      >
        <button className="button secondary" onClick={() => navigate('/profile')}>
          <Pencil size={16} />
          Edit business profile
        </button>
      </PageHeading>
      <div className="stats-grid vendor-stats">
        {[
          ['All enquiries', data.enquiries.length],
          ['New conversations', data.enquiries.filter((e) => e.status === 'new').length],
          ['Quotes sent', data.enquiries.reduce((n, e) => n + (e.quotes?.length || 0), 0)],
          ['Couples who chose you', data.enquiries.filter((e) => e.status === 'selected').length],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="table-toolbar lead-toolbar">
        <h2>Your conversations.</h2>
        <select
          aria-label="Filter enquiries"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['all', 'new', 'viewed', 'responded', 'quoted', 'selected', 'declined', 'lost'].map(
            (v) => (
              <option key={v} value={v}>
                {v === 'all' ? 'All enquiries' : v}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="lead-grid">
        {enquiries.map((e) => (
          <article className="card lead-card" key={e.id}>
            <div className="card-heading">
              <div>
                <div className="eyebrow">{dateLabel(e.createdAt.slice(0, 10), true)}</div>
                <h2>
                  {e.wedding?.partner1} & {e.wedding?.partner2}
                </h2>
              </div>
              <Badge tone={e.status === 'selected' ? 'attending' : ''}>{e.status}</Badge>
            </div>
            <div className="lead-details">
              <span>
                <CalendarDays size={15} />
                {dateLabel(e.wedding!.date)}
              </span>
              <span>
                <MapPin size={15} />
                {e.wedding?.city}
              </span>
              <span>
                <Users size={15} />
                {e.wedding?.guestEstimate} guests
              </span>
            </div>
            <blockquote>{e.message}</blockquote>
            <details className="event-context">
              <summary>Wedding schedule</summary>
              {e.wedding?.events.map((event, i) => (
                <p key={i}>
                  {event.name} · {dateLabel(event.date, true)} · {event.time} · {event.venue}
                </p>
              ))}
            </details>
            {e.quotes?.map((q) => (
              <div className="lead-quote" key={q.id}>
                <div>
                  <strong>{q.title}</strong>
                  <small>
                    {q.status} · valid until {dateLabel(q.expires, true)}
                  </small>
                </div>
                <strong>{currency(q.total, q.currency)}</strong>
              </div>
            ))}
            <div className="lead-actions">
              <select
                aria-label={`Status for ${e.wedding?.partner1}`}
                value={['quoted', 'selected'].includes(e.status) ? '' : e.status}
                disabled={e.status === 'selected'}
                onChange={(event) =>
                  mutate(
                    `/vendor/enquiries/${e.id}`,
                    'PATCH',
                    { status: event.target.value },
                    'Lead status updated.',
                  )
                }
              >
                <option value="" disabled>
                  Update lead status
                </option>
                {['new', 'viewed', 'responded', 'declined', 'lost'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <button className="button primary" onClick={() => setQuoting(e)}>
                <Plus size={16} />
                Create quote
              </button>
            </div>
          </article>
        ))}
      </div>
      {!enquiries.length && (
        <div className="card">
          <Empty
            title="Good conversations start here."
            text="Enquiries will appear here when couples reach out through your marketplace profile."
          />
        </div>
      )}
      {quoting && <QuoteForm enquiry={quoting} close={() => setQuoting(null)} />}
    </>
  );
}
function QuoteForm({ enquiry, close }: { enquiry: Enquiry; close: () => void }) {
  const { data, mutate } = useApp();
  const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }]);
  return (
    <Modal
      title={`Something lovely for ${enquiry.wedding?.partner1} & ${enquiry.wedding?.partner2}.`}
      close={close}
      wide
    >
      <SaveForm
        label="Send quote"
        onSave={async (form) => {
          if (
            await mutate(
              `/vendor/enquiries/${enquiry.id}/quotes`,
              'POST',
              { ...formValues(form), items },
              'Your quote is ready for the couple to view.',
            )
          )
            close();
        }}
      >
        <Field label="Start with a package">
          <select
            defaultValue=""
            onChange={(e) => {
              const p = data.vendor?.packages.find((p) => p.id === e.target.value);
              if (p) setItems([{ name: p.name, quantity: 1, price: p.price }]);
            }}
          >
            <option value="">Create a custom quote</option>
            {data.vendor?.packages
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Quote title">
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Your signature wedding collection"
          />
        </Field>
        <Field label="Inclusions and notes">
          <textarea
            name="description"
            rows={3}
            maxLength={3000}
            placeholder="Let them know what makes this package special."
          />
        </Field>
        <div className="line-items">
          <div className="line-item-labels">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit price ({enquiry.wedding?.currency})</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div className="line-item" key={i}>
              <input
                aria-label={`Item ${i + 1} name`}
                required
                value={item.name}
                maxLength={200}
                onChange={(e) =>
                  setItems(items.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)))
                }
              />
              <input
                aria-label={`Item ${i + 1} quantity`}
                type="number"
                required
                min="1"
                max="10000"
                value={item.quantity}
                onChange={(e) =>
                  setItems(
                    items.map((v, j) => (j === i ? { ...v, quantity: Number(e.target.value) } : v)),
                  )
                }
              />
              <input
                aria-label={`Item ${i + 1} price`}
                type="number"
                required
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) =>
                  setItems(
                    items.map((v, j) => (j === i ? { ...v, price: Number(e.target.value) } : v)),
                  )
                }
              />
              <button
                className="icon-button danger"
                type="button"
                disabled={items.length === 1}
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setItems(items.filter((_, j) => i !== j))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="text-button"
          type="button"
          disabled={items.length >= 30}
          onClick={() => setItems([...items, { name: '', quantity: 1, price: 0 }])}
        >
          <Plus size={15} />
          Add line item
        </button>
        <Field label="Valid until">
          <input
            name="expires"
            type="date"
            min={today()}
            defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
            required
          />
        </Field>
        <div className="quote-total">
          <span>Total</span>
          <strong>
            {currency(
              items.reduce((n, i) => n + Math.round(i.quantity * i.price * 100) / 100, 0),
              enquiry.wedding?.currency,
            )}
          </strong>
        </div>
      </SaveForm>
    </Modal>
  );
}
function VendorProfile() {
  const { data, mutate, navigate } = useApp(),
    v = data.vendor;
  const [packages, setPackages] = useState(v?.packages || []);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, BEAUTIFULLY PRESENTED"
        title="Tell your story."
        description="Help the right couples find you and fall in love with what you do."
      >
        <Badge tone={v?.approved ? 'attending' : 'pending'}>
          {v?.approved ? 'Approved listing' : 'Awaiting review'}
        </Badge>
      </PageHeading>
      <div className="card vendor-profile-form">
        <SaveForm
          label="Save business profile"
          onSave={async (form) => {
            const values = formValues(form);
            const result = await mutate(
              '/vendor/profile',
              'PUT',
              {
                ...values,
                price: Number(values.price),
                portfolio: values.portfolio
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
                packages,
              },
              data.user.demo
                ? 'Your sample profile is updated.'
                : 'Profile saved and submitted for review.',
            );
            if (result) navigate('/profile');
          }}
        >
          <h2>A little about your business.</h2>
          <div className="form-row">
            <Field label="Business name">
              <input name="name" defaultValue={v?.name || ''} required maxLength={150} />
            </Field>
            <Field label="Category">
              <select name="category" defaultValue={v?.category || 'Photography'}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={v?.description || ''}
              rows={4}
              required
              maxLength={4000}
            />
          </Field>
          <div className="form-row">
            <Field label="City / service area">
              <input name="city" defaultValue={v?.city || 'Singapore'} required />
            </Field>
            <Field label="Starting price">
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={v?.price || 0}
                required
              />
            </Field>
            <Field label="Currency">
              <select name="currency" defaultValue={v?.currency || 'SGD'}>
                {['SGD', 'USD', 'MYR', 'GBP', 'EUR', 'AUD'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Cover image URL">
            <input
              name="image"
              defaultValue={v?.image || '/images/flowers.jpg'}
              required
              maxLength={2000}
            />
          </Field>
          <Field
            label="Portfolio image URLs"
            hint="One direct HTTPS image link per line, up to 12 photographs."
          >
            <textarea name="portfolio" defaultValue={v?.portfolio.join('\n') || ''} rows={3} />
          </Field>
          <div className="card-heading">
            <h2>Your packages.</h2>
            <button
              type="button"
              className="button secondary"
              disabled={packages.length >= 30}
              onClick={() =>
                setPackages([...packages, { name: '', description: '', price: 0, active: true }])
              }
            >
              <Plus size={15} />
              Add package
            </button>
          </div>
          {packages.map((p, i) => (
            <div className="package-editor" key={p.id || i}>
              <div className="form-row">
                <Field label="Package name">
                  <input
                    required
                    value={p.name}
                    maxLength={200}
                    onChange={(e) =>
                      setPackages(
                        packages.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)),
                      )
                    }
                  />
                </Field>
                <Field label="Starting price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={p.price}
                    onChange={(e) =>
                      setPackages(
                        packages.map((v, j) =>
                          j === i ? { ...v, price: Number(e.target.value) } : v,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="What’s included">
                <textarea
                  rows={2}
                  value={p.description}
                  maxLength={2000}
                  onChange={(e) =>
                    setPackages(
                      packages.map((v, j) => (j === i ? { ...v, description: e.target.value } : v)),
                    )
                  }
                />
              </Field>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) =>
                    setPackages(
                      packages.map((v, j) => (j === i ? { ...v, active: e.target.checked } : v)),
                    )
                  }
                />
                Show this package on my profile
              </label>
            </div>
          ))}
          {!data.user.demo && (
            <p className="field-hint">
              New and edited profiles are reviewed before appearing in the marketplace.
            </p>
          )}
        </SaveForm>
      </div>
    </>
  );
}

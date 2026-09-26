import { useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Download,
  Link,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  Badge,
  CopyLink,
  Empty,
  Field,
  Modal,
  PageHeading,
  SaveForm,
  api,
  formValues,
  guestStatus,
  useApp,
} from '../lib';
import type { Guest } from '../types';

export function Guests() {
  const { data, mutate, notify } = useApp(),
    w = data.wedding!;
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [event, setEvent] = useState('all');
  const [editing, setEditing] = useState<Guest | 'new' | null>(null),
    [importing, setImporting] = useState(false),
    [invitation, setInvitation] = useState('');
  const guests = w.guests.filter(
    (g) =>
      `${g.firstName} ${g.lastName} ${g.email} ${g.tags} ${w.groups.find((h) => h.id === g.groupId)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' || guestStatus(g) === filter) &&
      (event === 'all' || g.eventIds.includes(event)),
  );
  const counts = {
    attending: w.guests.filter((g) => guestStatus(g) === 'attending').length,
    declined: w.guests.filter((g) => guestStatus(g) === 'declined').length,
    pending: w.guests.filter((g) => guestStatus(g) === 'pending').length,
  };
  async function invite(guest: Guest) {
    const result = await mutate(`/wedding/groups/${guest.groupId}/invite`);
    if (result) setInvitation(result.path);
  }
  function exportGuests() {
    const escape = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
    const rows = [
      ['first_name', 'last_name', 'email', 'phone', 'household', 'tags', 'rsvp', 'dietary'],
      ...w.guests.map((g) => [
        g.firstName,
        g.lastName,
        g.email,
        g.phone,
        w.groups.find((h) => h.id === g.groupId)?.name || '',
        g.tags,
        guestStatus(g),
        g.dietary,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'our-wedding-guests.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR FAVOURITE PEOPLE"
        title="A place for everyone."
        description="All the people who make your day a little more special."
      >
        <button className="button secondary" onClick={() => setImporting(true)}>
          <Upload size={16} />
          Import CSV
        </button>
        <button className="button primary" onClick={() => setEditing('new')}>
          <Plus size={17} />
          Add guest
        </button>
      </PageHeading>
      <div className="guest-stats">
        <div>
          <span className="stat-circle">
            <Users size={19} />
          </span>
          <strong>{w.guests.length}</strong>
          <span>on the guest list</span>
        </div>
        <div>
          <span className="status-dot" />
          <strong>{counts.attending}</strong>
          <span>attending</span>
        </div>
        <div>
          <span className="status-dot amber" />
          <strong>{counts.pending}</strong>
          <span>awaiting a reply</span>
        </div>
        <div>
          <span className="status-dot rose" />
          <strong>{counts.declined}</strong>
          <span>celebrating from afar</span>
        </div>
      </div>
      <section className="card table-card">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search guests"
              placeholder="Find a name, household, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <select
              aria-label="Filter by RSVP"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All responses</option>
              <option value="attending">Attending</option>
              <option value="pending">Awaiting reply</option>
              <option value="declined">Declined</option>
            </select>
            <select
              aria-label="Filter by event"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            >
              <option value="all">All events</option>
              {w.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button className="icon-button" aria-label="Export guest list" onClick={exportGuests}>
              <Download size={18} />
            </button>
          </div>
        </div>
        {guests.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Household</th>
                  <th>Events</th>
                  <th>RSVP</th>
                  <th>Dietary notes</th>
                  <th>Invitation</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="guest-name">
                        <span className="avatar soft">
                          {g.firstName[0]}
                          {g.lastName[0]}
                        </span>
                        <div>
                          <strong>
                            {g.firstName} {g.lastName}
                            {g.isPlusOne && <small className="plus-label">+1</small>}
                          </strong>
                          <small>{g.email || g.tags || 'No email added'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{w.groups.find((h) => h.id === g.groupId)?.name}</td>
                    <td>
                      <span
                        title={w.events
                          .filter((e) => g.eventIds.includes(e.id))
                          .map((e) => e.name)
                          .join(', ')}
                      >
                        {g.eventIds.length} {g.eventIds.length === 1 ? 'event' : 'events'}
                      </span>
                    </td>
                    <td>
                      <Badge tone={guestStatus(g)}>
                        {guestStatus(g) === 'pending'
                          ? 'Awaiting reply'
                          : guestStatus(g) === 'attending'
                            ? 'Attending'
                            : 'Declined'}
                      </Badge>
                    </td>
                    <td className="dietary-cell">
                      {g.dietary || <span className="muted">—</span>}
                    </td>
                    <td>
                      <button className="text-button table-link" onClick={() => invite(g)}>
                        <Link size={14} />
                        {g.invitedAt ? 'View link' : 'Get invite link'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        {!g.isPlusOne && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${g.firstName} ${g.lastName}`}
                              onClick={() => setEditing(g)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label={`Remove ${g.firstName} ${g.lastName}`}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${g.firstName} and their plus-one, if any, from the guest list?`,
                                  )
                                )
                                  mutate(`/wedding/guests/${g.id}`, 'DELETE', {}, 'Guest removed.');
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              w.guests.length
                ? 'No guests match just yet.'
                : 'Every celebration starts with your people.'
            }
            text={
              w.guests.length
                ? 'Try another name or change your filters.'
                : 'Add your first guest or bring your list over from a spreadsheet.'
            }
          >
            <button className="button primary" onClick={() => setEditing('new')}>
              <Plus size={16} />
              Add a guest
            </button>
          </Empty>
        )}
        <div className="table-footer">
          <span>
            {guests.length} {guests.length === 1 ? 'guest' : 'guests'} · {w.groups.length}{' '}
            households
          </span>
          <span>Guest details are private to your wedding workspace.</span>
        </div>
      </section>
      {editing && (
        <GuestForm guest={editing === 'new' ? undefined : editing} close={() => setEditing(null)} />
      )}
      {importing && <ImportGuests close={() => setImporting(false)} />}
      {invitation && (
        <Modal title="An invitation, just for them." close={() => setInvitation('')}>
          <p>
            This private link includes everyone in their household and only the events they’re
            invited to. Share it in your preferred messaging app.
          </p>
          <div className="link-box">
            <Link size={18} />
            <input
              aria-label="Private invitation link"
              readOnly
              value={window.location.origin + invitation}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="form-footer">
            <CopyLink path={invitation} />
            <a className="button primary" href={invitation} target="_blank" rel="noreferrer">
              Preview invitation
              <ArrowUpRight size={16} />
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
function GuestForm({ guest, close }: { guest?: Guest; close: () => void }) {
  const { data, mutate } = useApp(),
    w = data.wedding!;
  return (
    <Modal
      title={guest ? 'A little about your guest.' : 'Make room for someone lovely.'}
      close={close}
    >
      <SaveForm
        label={guest ? 'Save guest' : 'Add guest'}
        onSave={async (form) => {
          const values = formValues(form),
            body = {
              ...values,
              eventIds: new FormData(form).getAll('eventIds'),
              plusOne: values.plusOne === 'on',
            };
          if (
            await mutate(
              `/wedding/guests${guest ? `/${guest.id}` : ''}`,
              guest ? 'PATCH' : 'POST',
              body,
              guest ? 'Guest updated.' : 'Guest added to your celebration.',
            )
          )
            close();
        }}
      >
        <div className="form-row">
          <Field label="First name">
            <input name="firstName" defaultValue={guest?.firstName} required maxLength={100} />
          </Field>
          <Field label="Last name">
            <input name="lastName" defaultValue={guest?.lastName || ''} maxLength={100} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Email">
            <input name="email" type="email" defaultValue={guest?.email || ''} />
          </Field>
          <Field label="Mobile number">
            <input name="phone" type="tel" defaultValue={guest?.phone || ''} maxLength={50} />
          </Field>
        </div>
        <Field
          label="Household / invitation group"
          hint="Guests in the same household share a private invitation link."
        >
          <input
            name="group"
            list="households"
            defaultValue={w.groups.find((h) => h.id === guest?.groupId)?.name || ''}
            placeholder="e.g. The Tan family"
            maxLength={150}
          />
          <datalist id="households">
            {w.groups.map((g) => (
              <option key={g.id}>{g.name}</option>
            ))}
          </datalist>
        </Field>
        <Field label="Tags">
          <input
            name="tags"
            defaultValue={guest?.tags || ''}
            placeholder="Family, friends, colleagues…"
            maxLength={300}
          />
        </Field>
        <fieldset className="checkbox-group">
          <legend>Invite to these events</legend>
          {w.events.length ? (
            w.events.map((e) => (
              <label key={e.id} className="checkbox-label">
                <input
                  type="checkbox"
                  name="eventIds"
                  value={e.id}
                  defaultChecked={guest ? guest.eventIds.includes(e.id) : true}
                />
                {e.name}
                {guest && <small>{guest.responses[e.id] || 'Not invited'}</small>}
              </label>
            ))
          ) : (
            <p className="muted">Create an event first, then come back to assign it.</p>
          )}
        </fieldset>
        <label className="checkbox-label">
          <input type="checkbox" name="plusOne" defaultChecked={guest?.plusOne} />
          They’re welcome to bring a plus-one
        </label>
        <Field label="Dietary needs / allergies">
          <textarea
            name="dietary"
            defaultValue={guest?.dietary || ''}
            rows={2}
            maxLength={2000}
            placeholder="Your guest can also add this when they RSVP."
          />
        </Field>
      </SaveForm>
    </Modal>
  );
}
function ImportGuests({ close }: { close: () => void }) {
  const { mutate, notify } = useApp();
  const [csv, setCsv] = useState(''),
    [preview, setPreview] = useState<any>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  async function inspect(value = csv, columns = mapping) {
    setBusy(true);
    try {
      const result = await api('/wedding/guests/import/preview', 'POST', {
        csv: value,
        mapping: columns,
      });
      setPreview(result);
      setMapping(result.mapping);
    } catch (e: any) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Bring your people along." close={close} wide>
      <p>
        Upload a CSV with up to 500 guests. We’ll check every row before adding anyone. Imported
        guests will be invited to all current events.
      </p>
      <a className="text-button" href="/guest-template.csv" download>
        <Download size={15} />
        Download the sample CSV
      </a>
      <Field label="Guest list CSV">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 500000) {
              notify('Please choose a CSV smaller than 500 KB.', true);
              return;
            }
            const value = await file.text();
            setCsv(value);
            setMapping({});
            setPreview(null);
            await inspect(value, {});
          }}
        />
      </Field>
      {busy && <p role="status">Checking your guest list…</p>}
      {preview && (
        <>
          <h3>Match your columns</h3>
          <div className="form-row wrap">
            {Object.entries({
              firstName: 'First name',
              lastName: 'Last name',
              email: 'Email',
              phone: 'Mobile',
              group: 'Household',
              tags: 'Tags',
            }).map(([key, label]) => (
              <Field key={key} label={label}>
                <select
                  value={mapping[key] || ''}
                  onChange={(e) => {
                    setMapping({ ...mapping, [key]: e.target.value });
                    setPreview({ ...preview, stale: true });
                  }}
                >
                  <option value="">Not included</option>
                  {preview.headers.map((h: string) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <button className="button secondary" disabled={busy} onClick={() => inspect()}>
            Check columns
          </button>
          <div className="import-summary">
            <Badge tone={preview.errors.length ? 'declined' : 'attending'}>
              {preview.rows.length} ready · {preview.errors.length} to fix
            </Badge>
            <p>
              {preview.total} rows found.{' '}
              {preview.errors.length > 0
                ? 'Fix the rows below in your file, or correct the column mapping, then check again.'
                : 'Take a quick look before bringing them over.'}
            </p>
          </div>
          {preview.errors.length > 0 && (
            <div className="import-errors" role="alert">
              {preview.errors.map((e: any) => (
                <p key={e.row}>
                  <strong>Row {e.row}:</strong> {e.message}
                </p>
              ))}
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Household</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((r: any, i: number) => (
                  <tr key={i}>
                    <td>
                      {r.firstName} {r.lastName}
                    </td>
                    <td>{r.email || '—'}</td>
                    <td>{r.group || 'Individual invitation'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-footer">
            <button
              className="button primary"
              disabled={busy || preview.stale || preview.errors.length > 0 || !preview.rows.length}
              onClick={async () => {
                setBusy(true);
                const result = await mutate(
                  '/wedding/guests/import',
                  'POST',
                  { rows: preview.rows },
                  `${preview.rows.length} guests added.`,
                );
                setBusy(false);
                if (result) close();
              }}
            >
              <Upload size={16} />
              Import {preview.rows.length} guests
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

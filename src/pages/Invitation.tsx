import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Flower2, Heart, MapPin } from 'lucide-react';
import { Brand, Field, SaveForm, api, dateLabel } from '../lib';
import type { Guest, Wedding } from '../types';

export function Invitation({ path }: { path: string }) {
  const [data, setData] = useState<{
      wedding: Wedding;
      guests?: Guest[];
      preview?: boolean;
    } | null>(null),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [guests, setGuests] = useState<Guest[]>([]),
    [lookup, setLookup] = useState(false);
  useEffect(() => {
    setError('');
    api(path)
      .then((result) => {
        setData(result);
        setGuests(result.guests || []);
      })
      .catch((e) => setError(e.message));
  }, [path]);
  if (!data)
    return (
      <div className="invitation-error">
        <Brand />
        <Flower2 size={45} strokeWidth={1} />
        <h1>
          {error ? 'A little help from the couple.' : 'An invitation to something beautiful.'}
        </h1>
        <p>{error || 'Opening your invitation…'}</p>
        {error && (
          <a className="button secondary" href="/">
            Back to Ampersand
          </a>
        )}
      </div>
    );
  const w = data.wedding;
  const scrollToRsvp = () =>
    document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className={`invitation-page ${w.theme}`}>
      <header className="invitation-header">
        <a href="#" className="invitation-monogram">
          {w.partner1[0]} <em>&</em> {w.partner2[0]}
        </a>
        <nav>
          <a href="#our-story">Our story</a>
          <a href="#the-day">The day</a>
          <button className="button primary" onClick={scrollToRsvp}>
            RSVP <Heart size={14} />
          </button>
        </nav>
      </header>
      {data.preview && (
        <div className="preview-notice">
          A private preview. Your wedding website is not published yet.
        </div>
      )}
      <section
        className="invitation-hero"
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(15,32,24,.14),rgba(15,32,24,.55)),url("${(w.cover || '/images/wedding.jpg').replace(/["\\\n\r]/g, '')}")`,
        }}
      >
        <div className="eyebrow">TOGETHER WITH OUR FAMILIES</div>
        <h1>
          {w.partner1}
          <em>&</em>
          {w.partner2}
        </h1>
        <div className="invitation-date">
          {dateLabel(w.date)}
          <span>·</span>
          {w.city}
        </div>
        <p>We’re getting married. And we’d love you to be there.</p>
        <button className="button ivory" onClick={scrollToRsvp}>
          Join our celebration <ArrowRight size={16} />
        </button>
      </section>
      <section className="invitation-story" id="our-story">
        <Flower2 size={42} strokeWidth={1} />
        <div className="eyebrow">OUR NEXT CHAPTER</div>
        <h2>
          A celebration of us.
          <br />
          <em>And all the people we love.</em>
        </h2>
        <p>{w.story}</p>
        <span className="ornament">&</span>
      </section>
      <section className="invitation-schedule" id="the-day">
        <div className="eyebrow">EVERY LOVELY MOMENT</div>
        <h2>The way the day unfolds.</h2>
        <div className="invitation-event-grid">
          {[...w.events]
            .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
            .map((event, i) => (
              <article className="invitation-event" key={event.id}>
                <span className="event-number">0{i + 1}</span>
                <h3>{event.name}</h3>
                <div className="event-when">
                  {dateLabel(event.date)} · {event.time}
                </div>
                <p>{event.description}</p>
                <div className="event-location">
                  <MapPin size={18} />
                  <strong>{event.venue || 'Details to come'}</strong>
                  <span>{event.address}</span>
                </div>
                {event.dressCode && <p className="dress-code">Dress code: {event.dressCode}</p>}
              </article>
            ))}
        </div>
        {!w.events.length && (
          <p>We’re putting the finishing touches on our day. More details soon.</p>
        )}
      </section>
      {w.faq && (
        <section className="invitation-faq">
          <div className="eyebrow">A FEW LITTLE DETAILS</div>
          <h2>Good to know.</h2>
          <p>{w.faq}</p>
        </section>
      )}
      <section className="invitation-rsvp" id="rsvp">
        <Heart size={32} strokeWidth={1} />
        <div className="eyebrow">SAVE A SEAT FOR YOURSELF</div>
        <h2>{success ? 'We’ve saved your reply.' : 'Will you celebrate with us?'}</h2>
        {success ? (
          <div className="rsvp-success" role="status">
            <div className="success-check">
              <Check size={28} />
            </div>
            <p>
              Thank you for letting us know. Your response is safely with {w.partner1} &{' '}
              {w.partner2}.
            </p>
            <button className="button secondary" onClick={() => setSuccess(false)}>
              Update my response
            </button>
          </div>
        ) : data.guests ? (
          <>
            <p>A little reply means the world to us.</p>
            <SaveForm
              className="rsvp-form"
              label="Send our response"
              onSave={async () => {
                setError('');
                try {
                  await api(`${path}/rsvp`, 'POST', {
                    guests: guests.map((g) => ({
                      id: g.id,
                      firstName: g.firstName,
                      lastName: g.lastName,
                      dietary: g.dietary,
                      responses: g.responses,
                    })),
                  });
                  setSuccess(true);
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              {guests.map((guest, index) => (
                <fieldset className="rsvp-guest" key={guest.id}>
                  <legend>
                    {guest.firstName} {guest.lastName}
                    {guest.isPlusOne ? ' · Plus-one' : ''}
                  </legend>
                  {guest.isPlusOne && (
                    <div className="form-row">
                      <Field label="Plus-one first name">
                        <input
                          required
                          maxLength={100}
                          value={guest.firstName}
                          onChange={(e) =>
                            setGuests(
                              guests.map((g, i) =>
                                i === index ? { ...g, firstName: e.target.value } : g,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Plus-one last name">
                        <input
                          maxLength={100}
                          value={guest.lastName}
                          onChange={(e) =>
                            setGuests(
                              guests.map((g, i) =>
                                i === index ? { ...g, lastName: e.target.value } : g,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  )}
                  {w.events
                    .filter((e) => guest.eventIds.includes(e.id))
                    .map((event) => (
                      <div className="rsvp-event" key={event.id}>
                        <div>
                          <strong>{event.name}</strong>
                          <small>
                            {dateLabel(event.date, true)} · {event.time}
                          </small>
                        </div>
                        <div className="rsvp-options">
                          <label
                            className={guest.responses[event.id] === 'attending' ? 'selected' : ''}
                          >
                            <input
                              type="radio"
                              name={`${guest.id}-${event.id}`}
                              required
                              value="attending"
                              checked={guest.responses[event.id] === 'attending'}
                              onChange={() =>
                                setGuests(
                                  guests.map((g, i) =>
                                    i === index
                                      ? {
                                          ...g,
                                          responses: { ...g.responses, [event.id]: 'attending' },
                                        }
                                      : g,
                                  ),
                                )
                              }
                            />
                            Joyfully accept
                          </label>
                          <label
                            className={guest.responses[event.id] === 'declined' ? 'selected' : ''}
                          >
                            <input
                              type="radio"
                              name={`${guest.id}-${event.id}`}
                              required
                              value="declined"
                              checked={guest.responses[event.id] === 'declined'}
                              onChange={() =>
                                setGuests(
                                  guests.map((g, i) =>
                                    i === index
                                      ? {
                                          ...g,
                                          responses: { ...g.responses, [event.id]: 'declined' },
                                        }
                                      : g,
                                  ),
                                )
                              }
                            />
                            Regretfully decline
                          </label>
                        </div>
                      </div>
                    ))}
                  {!guest.eventIds.length && (
                    <p className="muted">The couple hasn’t assigned your events yet.</p>
                  )}
                  <Field label={`Dietary needs or allergies for ${guest.firstName}`}>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      placeholder="Anything we should know to take good care of you?"
                      value={guest.dietary}
                      onChange={(e) =>
                        setGuests(
                          guests.map((g, i) =>
                            i === index ? { ...g, dietary: e.target.value } : g,
                          ),
                        )
                      }
                    />
                  </Field>
                </fieldset>
              ))}
              {error && (
                <div className="inline-error" role="alert">
                  {error}
                </div>
              )}
              <p className="field-hint">
                Your reply and dietary notes are shared only with the couple and their planning
                collaborators.
              </p>
            </SaveForm>
          </>
        ) : (
          <div className="invitation-lookup">
            <p>
              Your personal invitation link is your way in. It lets us save the right seats for your
              household.
            </p>
            <SaveForm
              label="Open my invitation"
              onSave={async (form) => {
                const value = String(new FormData(form).get('code')).trim();
                const match = value.match(/(?:\/invite\/)?([a-f0-9]{64})(?:[/?#].*)?$/);
                if (match) window.location.assign(`/invite/${match[1]}`);
                else setError('Please use the private invitation link or code sent by the couple.');
              }}
            >
              <Field label="Your invitation link or code">
                <input name="code" required placeholder="Paste the link from your invitation" />
              </Field>
              {error && (
                <div className="inline-error" role="alert">
                  {error}
                </div>
              )}
            </SaveForm>
          </div>
        )}
      </section>
      <footer className="invitation-footer">
        <div>
          {w.partner1} <em>&</em> {w.partner2}
        </div>
        <p>
          With love, and a little help from <a href="/">ampersand invites</a>.
        </p>
      </footer>
    </div>
  );
}

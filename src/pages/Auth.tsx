import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Heart, Flower2, CalendarHeart } from 'lucide-react';
import { api, Brand, Field, SaveForm, formValues, useApp, today } from '../lib';
import { useDeploymentConfig } from '../deployment';

export function Auth({ onDone, joining }: { onDone: () => Promise<void>; joining: boolean }) {
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>(
    joining || window.location.pathname === '/register'
      ? 'register'
      : window.location.pathname === '/login'
        ? 'login'
        : 'landing',
  );
  const [error, setError] = useState(''),
    [demo, setDemo] = useState(false);
  const { config, error: configError } = useDeploymentConfig();
  const demoSite = config?.mode === 'demo';
  async function startDemo() {
    setDemo(true);
    setError('');
    try {
      await api('/auth/demo', 'POST', {});
      await onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDemo(false);
    }
  }
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav>
          <a href="#how-it-works" className="landing-nav-link">
            A little about us
          </a>
          {demoSite ? (
            config.liveUrl && (
              <>
                <a className="text-button" href={`${config.liveUrl}/login`}>
                  Sign in
                </a>
                <a className="button primary" href={`${config.liveUrl}/register`}>
                  Create your real account <ArrowUpRight size={16} />
                </a>
              </>
            )
          ) : (
            <>
              <button
                className="text-button"
                disabled={!config}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Sign in
              </button>
              <button
                className="button primary"
                disabled={!config}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Start your story <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="landing-main">
        <section className="landing-copy">
          {mode === 'landing' || demoSite || !config ? (
            <>
              <div className="eyebrow">
                <span className="little-line" />
                {demoSite ? 'EXPLORE A SAMPLE WEDDING' : 'YOUR TOGETHER STARTS HERE'}
              </div>
              <h1>
                A day to remember.
                <br />
                <em>
                  A little less
                  <br className="desktop-break" /> to think about.
                </em>
              </h1>
              <p className="landing-description">
                {demoSite ? (
                  <>
                    Try planning a wedding with fictional guests and vendors.
                    <br />
                    Your real wedding starts with its own account on our live site.
                  </>
                ) : (
                  <>
                    The people you love. The details that matter.
                    <br />
                    Bring your wedding together in one beautiful space.
                  </>
                )}
              </p>
              <div className="landing-cta">
                {demoSite ? (
                  <>
                    <button
                      className="button primary large"
                      disabled={demo || !config.demoEnabled}
                      onClick={startDemo}
                    >
                      {demo ? 'Opening your sample wedding…' : 'Explore the demo'}{' '}
                      <ArrowRight size={18} />
                    </button>
                    {config.liveUrl && (
                      <a className="text-button" href={`${config.liveUrl}/register`}>
                        Create your real account <ArrowUpRight size={17} />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="button primary large"
                      disabled={!config}
                      onClick={() => setMode('register')}
                    >
                      Let’s plan your wedding <ArrowRight size={18} />
                    </button>
                    {config?.demoUrl && (
                      <a className="text-button" href={config.demoUrl}>
                        Try the demo <ArrowUpRight size={17} />
                      </a>
                    )}
                  </>
                )}
                {!demoSite && config?.demoEnabled && (
                  <button className="text-button" disabled={demo} onClick={startDemo}>
                    {demo ? 'Opening your sample wedding…' : 'Take a little look around'}
                    <ArrowUpRight size={17} />
                  </button>
                )}
              </div>
              <div className="landing-reassurance">
                <span>
                  <Check size={15} />
                  Guests & invitations
                </span>
                <span>
                  <Check size={15} />
                  Your dream team
                </span>
                <span>
                  <Check size={15} />
                  All the little details
                </span>
              </div>
            </>
          ) : (
            <div className="auth-form">
              <button className="text-button back-link" onClick={() => setMode('landing')}>
                ← Back to the beginning
              </button>
              <div className="eyebrow">
                {joining
                  ? 'YOU’RE INVITED TO HELP'
                  : mode === 'login'
                    ? 'GOOD TO SEE YOU AGAIN'
                    : 'THE BEGINNING OF SOMETHING LOVELY'}
              </div>
              <h1>{mode === 'login' ? 'Welcome back.' : 'Your next chapter.'}</h1>
              <p>
                {mode === 'login'
                  ? 'Pick up right where you left off.'
                  : 'A little about you, then let’s make it yours.'}
              </p>
              <SaveForm
                label={mode === 'login' ? 'Sign in' : 'Create your account'}
                onSave={async (form) => {
                  setError('');
                  try {
                    await api(`/auth/${mode}`, 'POST', formValues(form));
                    await onDone();
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                {mode === 'register' && (
                  <Field label="Your name">
                    <input
                      name="name"
                      autoComplete="name"
                      placeholder="First and last name"
                      required
                      maxLength={100}
                    />
                  </Field>
                )}
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </Field>
                <Field
                  label="Password"
                  hint={mode === 'register' ? 'At least 10 characters.' : undefined}
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={10}
                    maxLength={128}
                    required
                  />
                </Field>
                {mode === 'register' && (
                  <Field label="I’m here to">
                    <select name="role" defaultValue="couple">
                      <option value="couple">Plan a wedding / help a couple</option>
                      <option value="vendor">Offer my wedding services</option>
                    </select>
                  </Field>
                )}
              </SaveForm>
              {mode === 'login' && (
                <a className="text-button" href="/forgot-password">
                  Forgot your password?
                </a>
              )}
              <p className="auth-switch">
                {mode === 'login' ? 'A new beginning?' : 'Already part of the story?'}{' '}
                <button
                  className="text-button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                >
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>
          )}
          {(error || configError) && (
            <div className="inline-error" role="alert">
              {error || configError}
            </div>
          )}
        </section>
        <section className="landing-visual" aria-label="A garden wedding celebration">
          <img
            src="/images/wedding.jpg"
            alt="A couple holding a wedding bouquet in warm evening light"
          />
          <div className="photo-shade" />
          <div className="visual-overline">
            FOR ALL THE DAYS LEADING UP TO
            <br />
            THE ONE.
          </div>
          <div className="invitation-stamp">
            <span>WITH FULL HEARTS</span>
            <span className="stamp-amp">&</span>
            <span>A BEAUTIFUL BEGINNING</span>
          </div>
          <div className="photo-caption">
            <span>
              Big feelings.
              <br />
              <em>Beautifully little details.</em>
            </span>
            <Heart size={27} strokeWidth={1} />
          </div>
          <div className="floating-note">
            <span className="note-icon">
              <Check size={19} />
            </span>
            <span>
              One less thing on your list.<small>One more moment to enjoy.</small>
            </span>
          </div>
        </section>
      </main>
      <section id="how-it-works" className="landing-features">
        <div>
          <CalendarHeart size={24} />
          <h3>A plan that feels like you.</h3>
          <p>From the first big yes to the last dance, keep every detail in its place.</p>
        </div>
        <div>
          <Heart size={24} />
          <h3>Your favourite people.</h3>
          <p>Thoughtful invitations, effortless RSVPs, and everyone accounted for.</p>
        </div>
        <div>
          <Flower2 size={24} />
          <h3>A team to bring it to life.</h3>
          <p>Find your vendors, compare their quotes, and make room for the magic.</p>
        </div>
      </section>
      <footer className="landing-footer">
        <Brand small />
        <span>For the big day. And every little thing.</span>
      </footer>
    </div>
  );
}
export function WeddingFields({ wedding }: { wedding?: any }) {
  return (
    <>
      <div className="form-row">
        <Field label="Your name">
          <input
            name="partner1"
            defaultValue={wedding?.partner1}
            placeholder="Olivia"
            maxLength={80}
            required
          />
        </Field>
        <Field label="Your partner’s name">
          <input
            name="partner2"
            defaultValue={wedding?.partner2}
            placeholder="Benjamin"
            maxLength={80}
            required
          />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Wedding date">
          <input name="date" type="date" defaultValue={wedding?.date} required />
        </Field>
        <Field label="City / location">
          <input name="city" defaultValue={wedding?.city || 'Singapore'} maxLength={150} required />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Estimated guests">
          <input
            name="guestEstimate"
            type="number"
            min="1"
            max="10000"
            defaultValue={wedding?.guestEstimate || 100}
            required
          />
        </Field>
        <Field label="Total budget">
          <input
            name="totalBudget"
            type="number"
            min="0"
            max="100000000"
            step="0.01"
            defaultValue={wedding?.totalBudget ?? 50000}
            required
          />
        </Field>
        <Field label="Currency">
          <select name="currency" defaultValue={wedding?.currency || 'SGD'}>
            {['SGD', 'USD', 'MYR', 'GBP', 'EUR', 'AUD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="A little about your day">
        <textarea
          name="notes"
          defaultValue={wedding?.notes || ''}
          placeholder="A garden celebration, our closest people, and plenty of dancing…"
          rows={3}
          maxLength={2000}
        />
      </Field>
    </>
  );
}
export function Onboarding() {
  const { mutate, data } = useApp();
  return (
    <div className="onboarding-page">
      <Brand />
      <div className="card onboarding-card">
        <div className="eyebrow">HELLO, {data.user.name.toUpperCase()}</div>
        <h1>Let’s make it yours.</h1>
        <p>Just a few details to begin. You can always change these later.</p>
        <SaveForm
          label="Create our wedding"
          onSave={(form) => {
            const values = formValues(form);
            return mutate(
              '/wedding',
              'POST',
              {
                ...values,
                totalBudget: Number(values.totalBudget),
                guestEstimate: Number(values.guestEstimate),
              },
              'Your next chapter starts here.',
            );
          }}
        >
          <WeddingFields />
        </SaveForm>
      </div>
      <p className="muted">Already have a collaborator invitation? Open that link to join.</p>
    </div>
  );
}

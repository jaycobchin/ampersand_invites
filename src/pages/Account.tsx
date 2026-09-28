import { useEffect, useState, type ReactNode } from 'react';
import { MailCheck } from 'lucide-react';
import { api, Brand, Field, SaveForm, formValues } from '../lib';
import type { User } from '../types';

function AccountFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="account-page">
      <Brand />
      <section className="account-card">
        <MailCheck size={28} strokeWidth={1.5} aria-hidden="true" />
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

export function VerifyAccount({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <AccountFrame title="Check your inbox.">
      <p>
        Confirm <strong>{user.email}</strong> to open your workspace. Follow the verification link
        in your email.
      </p>
      <p className="muted">You may need to check your spam folder. Links expire after 23 hours.</p>
      <SaveForm
        label="Resend verification email"
        onSave={async () => {
          setError('');
          try {
            setMessage((await api('/auth/resend-verification', 'POST', {})).message);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <span />
      </SaveForm>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-button"
        onClick={async () => {
          try {
            await onSignOut();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        Sign out / use another email
      </button>
    </AccountFrame>
  );
}

export function AccountLink({ path }: { path: string }) {
  // Clear the URL once captured so the secret isn't kept in browser history.
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    return value;
  });
  useEffect(() => {
    if (window.location.hash) window.history.replaceState({}, '', window.location.pathname);
  }, []);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const reset = path === '/reset-password';
  const forgotten = path === '/forgot-password';
  const validToken = /^[a-f0-9]{64}$/.test(token);
  return (
    <AccountFrame
      title={
        forgotten ? 'A fresh start.' : reset ? 'Choose a new password.' : 'Confirm your email.'
      }
    >
      {message ? (
        <p role="status">{message}</p>
      ) : forgotten || validToken ? (
        <>
          <p>
            {forgotten
              ? 'Enter the email address you used to create your account.'
              : reset
                ? 'Use at least 10 characters. Changing your password signs out your other sessions.'
                : 'Enter the password you chose when signing up to confirm this is your account. You will sign in again after verification.'}
          </p>
          <SaveForm
            label={forgotten ? 'Send reset link' : reset ? 'Save new password' : 'Verify my email'}
            onSave={async (form) => {
              setError('');
              try {
                const values = formValues(form);
                if (reset && values.password !== values.confirmPassword) {
                  setError('The passwords do not match.');
                  return;
                }
                const action = forgotten
                  ? 'forgot-password'
                  : reset
                    ? 'reset-password'
                    : 'verify-email';
                const result = await api(`/auth/${action}`, 'POST', { ...values, token });
                setMessage(result.message);
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            {forgotten && (
              <Field label="Email address">
                <input name="email" type="email" autoComplete="email" required maxLength={254} />
              </Field>
            )}
            {!forgotten && !reset && (
              <Field label="Your password">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </Field>
            )}
            {reset && (
              <>
                <Field label="New password" hint="At least 10 characters.">
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    required
                  />
                </Field>
              </>
            )}
          </SaveForm>
        </>
      ) : (
        <p role="alert">
          This link is incomplete. Open the full link from your email, or request a new one.
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="account-links">
        <a className="text-button" href="/login">
          Back to sign in
        </a>
        {reset && (
          <a className="text-button" href="/forgot-password">
            Request a new reset link
          </a>
        )}
        {!reset && !forgotten && (
          <a className="text-button" href="/forgot-password">
            Forgot your password?
          </a>
        )}
      </div>
    </AccountFrame>
  );
}

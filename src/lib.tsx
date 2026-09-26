import {
  Children,
  cloneElement,
  isValidElement,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from 'react';
import { X, ArrowRight, Check, LoaderCircle, Sparkles } from 'lucide-react';
import type { Guest, Wedding, Workspace } from './types';

export async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'Something went wrong.'), {
      status: response.status,
    });
  return data;
}
export const AppContext = createContext<{
  data: Workspace;
  reload: () => Promise<void>;
  navigate: (path: string) => void;
  mutate: (path: string, method?: string, body?: unknown, message?: string) => Promise<any>;
  notify: (message: string, error?: boolean) => void;
}>(null!);
export const useApp = () => useContext(AppContext);
export const currency = (value: number, code = 'SGD') =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
export const dateLabel = (value: string, short = false) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(short ? {} : { year: 'numeric' }),
  });
export const today = () => new Date().toISOString().slice(0, 10);
export const daysUntil = (date: string) =>
  Math.max(0, Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000));
export const guestStatus = (guest: Guest) => {
  const answers = guest.eventIds.map((id) => guest.responses[id] || 'pending');
  if (!answers.length || answers.includes('pending')) return 'pending';
  return answers.includes('attending') ? 'attending' : 'declined';
};
export const totals = (w: Wedding) => {
  const committed =
    w.budget.reduce((n, b) => n + b.committed, 0) + w.selections.reduce((n, s) => n + s.amount, 0);
  return {
    committed,
    paid: w.budget.reduce((n, b) => n + b.paid, 0),
    remaining: w.totalBudget - committed,
  };
};
export const categories = ['Venue', 'Photography', 'Videography', 'Attire', 'Florals'];
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a href="/" className={`brand ${small ? 'small' : ''}`}>
      <span className="brand-mark">&</span>
      <span>
        ampersand<span className="brand-sub">I N V I T E S</span>
      </span>
    </a>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Sparkles size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const labelId = useId(),
    hintId = `${labelId}-hint`;
  const connect = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement<{
        children?: ReactNode;
        'aria-labelledby'?: string;
        'aria-describedby'?: string;
      }>;
      if (
        typeof element.type === 'string' &&
        ['input', 'textarea', 'select'].includes(element.type)
      )
        return cloneElement(element, {
          'aria-labelledby': labelId,
          'aria-describedby': hint ? hintId : undefined,
        });
      return element.props.children
        ? cloneElement(element, { children: connect(element.props.children) })
        : element;
    });
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {connect(children)}
      {hint && <small id={hintId}>{hint}</small>}
    </label>
  );
}
export function Submit({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={17} /> : null}
      {children}
      {!busy && <ArrowRight size={16} />}
    </button>
  );
}
export function SaveForm({
  onSave,
  children,
  label = 'Save changes',
  className = '',
}: {
  onSave: (form: HTMLFormElement) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSave(e.currentTarget);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className={`form ${className}`}>
      {children}
      <div className="form-footer">
        <Submit busy={busy}>{label}</Submit>
      </div>
    </form>
  );
}
export const formValues = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function CopyLink({ path, label = 'Copy link' }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState(false);
  const url = `${window.location.origin}${path}`;
  return (
    <>
      <button
        className="button secondary"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setFallback(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : null}
        {copied ? 'Link copied' : label}
      </button>
      {fallback && (
        <input aria-label="Link to copy" readOnly value={url} onFocus={(e) => e.target.select()} />
      )}
    </>
  );
}

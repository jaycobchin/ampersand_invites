import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, RotateCcw } from 'lucide-react';
import { Modal, useApp } from './lib';
import { useDeploymentConfig } from './deployment';

export function DemoBar() {
  const { data, mutate, navigate } = useApp();
  const { config } = useDeploymentConfig();
  const [dialog, setDialog] = useState<'vendors' | 'restart' | null>(null);
  const [busy, setBusy] = useState(false);

  async function openWorkspace(role: 'couple' | 'vendor', vendorId?: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (await mutate('/auth/demo-role', 'POST', { role, vendorId })) {
        setDialog(null);
        navigate('/dashboard');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="demo-bar">
        <span>
          <span className="status-dot" />
          {data.user.role === 'vendor'
            ? `Sample workspace · ${data.vendor?.name || 'Vendor'}`
            : `Sample wedding · ${data.wedding?.partner1} & ${data.wedding?.partner2}`}
        </span>
        <div className="demo-actions">
          <button
            disabled={busy}
            onClick={() =>
              data.user.role === 'couple' ? setDialog('vendors') : openWorkspace('couple')
            }
          >
            {data.user.role === 'couple'
              ? 'Try the vendor workspace'
              : 'Back to the couple workspace'}
            <ArrowRight size={14} />
          </button>
          <button disabled={busy} onClick={() => setDialog('restart')}>
            <RotateCcw size={13} /> Restart demo
          </button>
          {config?.liveUrl && (
            <a href={`${config.liveUrl}/register`}>
              Create your real account <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
      {dialog === 'vendors' && (
        <Modal title="Explore a vendor workspace" close={() => !busy && setDialog(null)}>
          <p>Choose a sample business to see its enquiries and prepare a quote for the couple.</p>
          <div className="demo-vendors">
            {data.vendors.map((vendor) => {
              const count = data.enquiries.filter((e) => e.vendorId === vendor.id).length;
              return (
                <button
                  key={vendor.id}
                  disabled={busy}
                  aria-label={`Open ${vendor.name} workspace`}
                  onClick={() => openWorkspace('vendor', vendor.id)}
                >
                  <BriefcaseBusiness size={19} />
                  <span>
                    <strong>{vendor.name}</strong>
                    <small>
                      {vendor.category} ·{' '}
                      {count
                        ? `${count} ${count === 1 ? 'enquiry' : 'enquiries'}`
                        : 'No enquiries yet'}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {dialog === 'restart' && (
        <Modal title="Ready for another look?" close={() => !busy && setDialog(null)}>
          <p>
            Open a fresh sample wedding with the original guests, quotes, and budget. Your current
            sample stays separate, including any invitation links you shared.
          </p>
          <div className="form-footer">
            <button className="button secondary" disabled={busy} onClick={() => setDialog(null)}>
              Keep exploring
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  if (await mutate('/auth/demo', 'POST', {}, 'A fresh sample wedding is ready.')) {
                    setDialog(null);
                    navigate('/dashboard');
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RotateCcw size={15} /> {busy ? 'Opening your demo…' : 'Start a fresh demo'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

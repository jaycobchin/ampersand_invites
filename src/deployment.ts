import { useEffect, useState } from 'react';
import { api } from './lib';

export type DeploymentConfig = {
  mode: 'standard' | 'demo' | 'live';
  demoEnabled: boolean;
  registrationEnabled: boolean;
  demoUrl: string | null;
  liveUrl: string | null;
};

export function useDeploymentConfig() {
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/config')
      .then((value) => active && setConfig(value))
      .catch(() => active && setError('We couldn’t load this page. Please refresh to try again.'));
    return () => {
      active = false;
    };
  }, []);
  return { config, error };
}

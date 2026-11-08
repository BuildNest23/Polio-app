import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Chrome's "install app" prompt, so the app can show its own Install button. */
export function usePWAInstall() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    const before = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    const done = () => { setInstalled(true); setEv(null); };
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', done); };
  }, []);
  const install = async () => {
    if (!ev) return;
    await ev.prompt();
    const r = await ev.userChoice;
    if (r.outcome === 'accepted') { setInstalled(true); setEv(null); }
  };
  return { canInstall: !!ev && !installed, install };
}

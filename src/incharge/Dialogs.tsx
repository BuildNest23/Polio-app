import { useEffect, useRef } from 'react';
import { useDialog, useToasts } from './lib/state';

export function Dialogs() {
  const dlg = useDialog();
  const toasts = useToasts();
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { if (dlg && dlg.kind === 'prompt') setTimeout(() => { inp.current?.focus(); inp.current?.select(); }, 60); }, [dlg]);
  return (
    <>
      {dlg && (
        <div className={'overlay' + (dlg.kind === 'prompt' ? ' top' : '')} onClick={(e) => { if (e.target === e.currentTarget) dlg.resolve(dlg.kind === 'prompt' ? null : false); }}>
          <div className="sheet" role="dialog" aria-modal="true">
            <h3>{dlg.title}</h3>
            <p>{dlg.msg}</p>
            {dlg.kind === 'prompt' && (
              <input ref={inp} className="input" defaultValue={dlg.def} onKeyDown={(e) => { if (e.key === 'Enter') dlg.resolve((e.target as HTMLInputElement).value); }} />
            )}
            <div className="row">
              <button className="btn grow" onClick={() => dlg.resolve(dlg.kind === 'prompt' ? null : false)}>{dlg.no}</button>
              <button className={'btn grow ' + (dlg.danger ? 'danger' : 'primary')} onClick={() => dlg.resolve(dlg.kind === 'prompt' ? inp.current?.value ?? '' : true)}>{dlg.yes}</button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts">{toasts.map((t) => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}</div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useUi } from '../lib/state';
import { useT } from '../strings';

export function Dialogs() {
  const ui = useUi();
  const t = useT();
  const d = ui.dlg;
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (d && d.kind === 'prompt') { setVal(d.def || ''); setTimeout(() => ref.current?.select(), 50); } }, [d]);
  return (
    <>
      {d && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) d.resolve(d.kind === 'prompt' ? null : false); }}>
          <div className="sheet" role="dialog" aria-modal="true">
            <h3>{d.title}</h3>
            <p>{d.msg}</p>
            {d.kind === 'prompt' && (
              <input ref={ref} className="input" value={val} onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') d.resolve(val); }} />
            )}
            <div className="row">
              <button className="btn grow" onClick={() => d.resolve(d.kind === 'prompt' ? null : false)}>{d.no === 'Cancel' ? t.cancel : d.no}</button>
              <button className={'btn grow ' + (d.danger ? 'danger' : 'primary')} onClick={() => d.resolve(d.kind === 'prompt' ? val : true)}>{d.yes}</button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts">{ui.toasts.map((x) => <div key={x.id} className={'toast ' + x.type}>{x.msg}</div>)}</div>
    </>
  );
}

import { useState } from 'react';
import { COLORS, cardStyle, inputStyle, primaryBtn } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { Field } from '../components/ui.jsx';

export default function Conta({ me, authMode, onLogout }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (authMode !== 'password') {
    return (
      <div style={{ ...cardStyle, maxWidth: 440 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.titleText }}>Minha conta</div>
        <div style={{ fontSize: 13.5, color: COLORS.mutedText, marginTop: 10, lineHeight: 1.6 }}>
          O login desta conta é feito pela Microsoft (Entra ID) — a senha é gerenciada
          pela própria empresa, não por este app.
        </div>
      </div>
    );
  }

  async function submit() {
    setErr('');
    if (next.length < 8) { setErr('A nova senha precisa ter pelo menos 8 caracteres.'); return; }
    if (next !== confirm) { setErr('A confirmação não confere com a nova senha.'); return; }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setOk(true);
      setTimeout(onLogout, 1400);
    } catch (e) {
      setErr(e.message || 'Falha ao trocar a senha.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...cardStyle, maxWidth: 440 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.titleText }}>Trocar senha</div>
      <div style={{ fontSize: 13, color: COLORS.mutedText, marginTop: 6, marginBottom: 20 }}>
        Logado como <b>{me.email}</b>.
      </div>
      {ok ? (
        <div style={{ fontSize: 13.5, color: 'oklch(0.5 0.15 150)' }}>
          Senha alterada. Saindo para entrar novamente com a nova senha…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Senha atual">
            <input type="password" style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nova senha">
            <input type="password" style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha">
            <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {err && <div style={{ fontSize: 13, color: 'oklch(0.52 0.18 25)' }}>{err}</div>}
          <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={submit}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      )}
    </div>
  );
}

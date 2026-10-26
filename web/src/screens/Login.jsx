import { useState } from 'react';
import { ACCENT, COLORS, primaryBtn } from '../lib/theme.js';

export default function Login({ onLogin, version }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    if (!email || !pass) { setError('Preencha e-mail e senha.'); return; }
    setBusy(true);
    try {
      await onLogin(email, pass);
    } catch (e) {
      setError(e.message || 'Falha ao entrar.');
    } finally {
      setBusy(false);
    }
  }
  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  const input = { width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(155deg, rgba(0,0,0,0.02), rgba(0,0,0,0.36)), ${ACCENT}`, flex: 1,
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: 52, color: '#fff' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 13 }}>
          <img src="/logo.svg" alt="ControlaAí" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
          <span style={{ fontSize: 21, fontWeight: 800 }}>ControlaAí</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em' }}>Fechamento contábil<br />sob controle.</div>
          <div style={{ fontSize: 15, opacity: 0.85, marginTop: 16, lineHeight: 1.6, maxWidth: 360 }}>
            Acompanhe o andamento do ciclo, os setores que estão impactando e a previsão de fechamento — tudo em um só lugar.
          </div>
          <a href="#tv" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22,
            color: '#fff', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
            background: 'rgba(255,255,255,0.14)', padding: '10px 16px', borderRadius: 10 }}>
            Ver painel do ciclo em tela cheia →
          </a>
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.7, position: 'relative', zIndex: 1 }}>
          Grupo Exemplo · Controladoria{version && ` · v${version}`}
        </div>
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', right: -120, bottom: -120 }} />
        <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', right: 60, top: -90 }} />
      </div>
      <div style={{ width: 480, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: 340 }}>
          <img src="/logo.svg" alt="ControlaAí" style={{ height: 24, display: 'block', marginBottom: 24 }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'oklch(0.24 0.03 265)', margin: 0 }}>Entrar</h1>
          <p style={{ fontSize: 14, color: COLORS.mutedText, margin: '8px 0 28px' }}>Acesse com seu e-mail corporativo.</p>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'oklch(0.4 0.02 265)', marginBottom: 7 }}>E-mail</label>
          <input type="email" placeholder="nome.sobrenome@exemplo.com.br" style={{ ...input, marginBottom: 16 }}
            value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} onKeyDown={onKey} />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'oklch(0.4 0.02 265)', marginBottom: 7 }}>Senha</label>
          <input type="password" placeholder="••••••••" style={input}
            value={pass} onChange={(e) => { setPass(e.target.value); setError(''); }} onKeyDown={onKey} />
          {error && <div style={{ fontSize: 13, color: 'oklch(0.52 0.18 25)', marginTop: 12 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '14px 0 4px' }}>
            <span style={{ fontSize: 12.5, color: COLORS.mutedText }}>Esqueceu a senha? Peça a um Desenvolvedor para resetar em Administração.</span>
          </div>
          <button style={{ ...primaryBtn, width: '100%', padding: 13, fontSize: 15, borderRadius: 12, marginTop: 6, opacity: busy ? 0.7 : 1 }}
            onClick={submit} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          <div style={{ fontSize: 11.5, color: COLORS.mutedText, marginTop: 20, lineHeight: 1.6,
            background: COLORS.appBg, borderRadius: 12, padding: '12px 14px' }}>
            <b style={{ color: 'oklch(0.4 0.02 265)' }}>Perfis de teste</b> — senha padrão do seed:<br />
            Desenvolvedor · admin@exemplo.com.br<br />
            Gestor · marina.castro@exemplo.com.br<br />
            Usuário · bruno.alves@exemplo.com.br
          </div>
        </div>
      </div>
    </div>
  );
}

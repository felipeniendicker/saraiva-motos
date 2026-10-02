import { useState } from "react";

export default function LoginPage({ onLogin, sessionMessage = "" }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, senha);
    } catch (requestError) {
      setError(requestError.message || "Não foi possível entrar no sistema.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">SM</div>
          <div>
            <div className="eyebrow">Saraiva Motos</div>
            <h1>Acesso ao sistema</h1>
            <p>Entre com seu e-mail e senha para continuar.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required autoFocus />
          </label>
          <label>
            <span>Senha</span>
            <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="current-password" required />
          </label>
          {error || sessionMessage ? <p className="login-error" role="alert">{error || sessionMessage}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

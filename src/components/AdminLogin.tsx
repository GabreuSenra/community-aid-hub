import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export default function AdminAuth({ onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isRegister && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Ponto cadastrado!! Faça login para gerenciar seu ponto de coleta.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Email ou senha inválidos.');
      } else {
        onLogin();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            {isRegister ? (
              <UserPlus className="w-7 h-7 text-primary-foreground" />
            ) : (
              <LogIn className="w-7 h-7 text-primary-foreground" />
            )}
          </div>

          <h1 className="text-xl font-bold text-foreground">
            {isRegister ? 'Criar Conta Admin' : 'Área Administrativa'}
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Ajude JF
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {message && (
            <p className="text-sm text-green-600 font-medium">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? 'Cadastrar ponto de Coleta!' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
            setMessage('');
          }}
          className="block w-full text-center text-xs text-muted-foreground mt-4 hover:text-primary"
        >
          {isRegister
            ? 'Ja cadastrou seu ponto de coleta?'
            : 'Cadastre um ponto de coleta!'}
        </button>

        <a
          href="/"
          className="block text-center text-xs text-muted-foreground mt-2 hover:text-primary"
        >
          ← Voltar para o site público
        </a>
      </div>
    </div>
  );
}
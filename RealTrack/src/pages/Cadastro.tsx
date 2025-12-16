import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Target, ChevronRight, User } from 'lucide-react';
import { authService } from '../services/api';
import { type ApiError } from '../types/api';

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30';
const fieldLabelClass = 'text-sm font-medium text-slate-300';
const fieldWrapperClass = 'flex flex-col gap-2.5';
const formCardClass =
  'relative z-10 w-full rounded-[32px] border border-white/10 bg-[rgba(6,19,27,0.9)] p-8 shadow-[0_30px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl lg:p-10';
const primaryButtonClass =
  'mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-80';

export default function Cadastro() {
  const navigate = useNavigate();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const data = await authService.register(nomeCompleto, email, senha);
      
      if (data.token) {
        // Token gerenciado automaticamente via httpOnly cookies
        void navigate('/dashboard');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#010806] text-slate-100 lg:flex-row">
      <div className="pointer-events-none absolute -right-12 -top-20 h-[26rem] w-[26rem] rounded-full bg-emerald-500/25 blur-[180px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-[28rem] w-[28rem] rounded-full bg-emerald-600/20 blur-[180px]" aria-hidden="true" />

      {/* Left Panel - Hero */}
      <div className="relative z-10 flex flex-col justify-between px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 lg:py-20">
        <div className="pt-10 lg:pt-14">
          <div className="mb-16 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <Target className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl font-semibold text-white">Real Comando</div>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-300">Planilha Esportiva</div>
            </div>
          </div>

          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl font-semibold text-white lg:text-6xl">
              Comece sua jornada
              <span className="mt-2 block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                nas apostas esportivas
              </span>
            </h1>
            <p className="text-lg leading-relaxed text-slate-300">
              Crie sua conta e tenha acesso a ferramentas profissionais para análise e gestão.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="relative w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent blur-3xl"
            aria-hidden="true"
          />

          <div className={formCardClass}>
            <div className="mb-8">
              <h2 className="mb-2 text-2xl text-white">Criar conta</h2>
              <p className="text-slate-400">Preencha os dados para começar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={fieldWrapperClass}>
                <label htmlFor="name" className={fieldLabelClass}>
                  Apelido
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <User size={18} />
                  </span>
                  <input
                    ref={nameInputRef}
                    id="name"
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Seu apelido"
                    className={inputClass}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <label htmlFor="email" className={fieldLabelClass}>
                  Endereço de e-mail
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <Mail size={18} />
                  </span>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className={inputClass}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <label htmlFor="password" className={fieldLabelClass}>
                  Senha
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-11`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <label htmlFor="confirmPassword" className={fieldLabelClass}>
                  Confirmar senha
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    ref={confirmPasswordInputRef}
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-11`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
              )}

              <button type="submit" disabled={loading} className={`${primaryButtonClass} group`}>
                <span>{loading ? 'Criando conta...' : 'Criar conta'}</span>
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="relative my-7 flex items-center">
              <div className="h-px w-full bg-slate-800" />
              <span className="absolute bg-[rgba(6,19,27,0.95)] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                Já tem conta?
              </span>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2 text-sm text-slate-300 transition hover:text-emerald-400"
              >
                <span>Faça login na sua conta</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-600">
            <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Seus dados estão protegidos com criptografia de ponta
          </p>
        </div>
      </div>
    </div>
  );
}


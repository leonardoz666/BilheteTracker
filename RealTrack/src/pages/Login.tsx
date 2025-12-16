import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, Lock } from 'lucide-react';
import { authService } from '../services/api';
import { AuthManager } from '../lib/auth';
import { type ApiError } from '../types/api';

const heroStats = [
  { value: '24/7', label: 'Bot Suporte' },
  { value: '90%', label: 'Taxa de Sucesso' },
  { value: '5+', label: 'Usuários Ativos' }
];

const BrandMark = () => (
  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 shadow-[0_15px_30px_rgba(0,0,0,0.35)]" aria-hidden="true">
    <span className="absolute h-9 w-9 rounded-full border-2 border-emerald-300/60" />
    <span className="absolute h-5 w-5 rounded-full border-2 border-emerald-200/50" />
    <span className="absolute h-2 w-2 rounded-full bg-emerald-300" />
  </div>
);

const inputClass =
  'w-full rounded-[28px] border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-500 shadow-[0_4px_18px_rgba(7,15,25,0.12)] transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20';

const fieldLabelClass = 'text-sm font-semibold text-white/80';
const fieldWrapperClass = 'flex flex-col gap-2';
const formCardClass =
  'relative z-10 w-full rounded-[40px] border border-white/5 bg-[#031320] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.55)]';
const primaryButtonClass =
  'mt-6 flex w-full items-center justify-center gap-2 rounded-[26px] bg-emerald-500 py-3 text-base font-semibold text-white shadow-[0_18px_35px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-80';
const checkboxClass =
  'h-4 w-4 rounded border border-white/30 bg-transparent text-emerald-400 focus:ring-emerald-400 focus:ring-offset-0';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, senha);
      
      if (response.success) {
        // Tokens são gerenciados automaticamente via httpOnly cookies
        // Backend já configurou os cookies na resposta
        void navigate('/dashboard');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#01302d] via-[#033831] to-[#011a16] text-slate-100 lg:flex-row">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[25rem] w-[25rem] rounded-full bg-emerald-500/25 blur-[160px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-[24rem] w-[24rem] rounded-full bg-emerald-600/20 blur-[160px]" aria-hidden="true" />

      {/* Left Panel - Hero */}
      <div className="relative z-10 flex flex-col justify-between px-6 py-12 sm:px-10 lg:w-1/2 lg:px-20 lg:py-20">
        <div className="pt-4 lg:pt-6">
          <div className="mb-14 flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-lg font-semibold text-white">Real Comando</p>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-200">Planilha Esportiva</p>
            </div>
          </div>

          <div className="max-w-xl space-y-6">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-emerald-200">
              Plataforma oficial
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-[3.75rem]">
              Domine o jogo das
              <span className="mt-2 block bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                apostas esportivas
              </span>
            </h1>
            <p className="text-base leading-relaxed text-white/70">
              Plataforma completa de análise, gestão e otimização de resultados para potencializar seus ganhos.
            </p>
          </div>
        </div>

        <div className="hidden gap-16 pt-24 text-white/80 lg:flex">
          {heroStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="text-4xl font-semibold text-white">{stat.value}</p>
              <p className="text-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="relative w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-4 rounded-[36px] bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent blur-2xl"
            aria-hidden="true"
          />

          <div className={formCardClass}>
            <div className="mb-8">
              <h2 className="mb-2 text-3xl font-semibold text-white">Acessar conta</h2>
              <p className="text-sm text-white/60">Faça login para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className={fieldWrapperClass}>
                <label htmlFor="email" className={fieldLabelClass}>
                  Endereço de e-mail
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                  autoComplete="email"
                />
              </div>

              <div className={fieldWrapperClass}>
                <label htmlFor="password" className={fieldLabelClass}>
                  Senha
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={`${inputClass} pr-11`}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm text-white/70">
                <label className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="transition group-hover:text-white">Lembrar-me</span>
                </label>
                <Link to="/recuperar-senha" className="font-medium text-emerald-400 transition hover:text-emerald-200">
                  Esqueceu a senha?
                </Link>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={`${primaryButtonClass} group`}>
                <span>{loading ? 'Entrando...' : 'Entrar agora'}</span>
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-white/70">
              <span>Não possui uma conta? </span>
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-1 font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                Criar uma conta gratuita
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-xs text-white/60">
              <Lock className="h-4 w-4 text-emerald-300" />
              Seus dados estão protegidos com criptografia de ponta
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

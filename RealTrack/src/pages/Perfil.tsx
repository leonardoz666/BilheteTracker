import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Copy,
  Crown,
  Gift,
  Infinity as InfinityIcon,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { perfilService } from '../services/api';
import { type ApiProfileResponse } from '../types/api';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/formatters';
import { cn } from '../components/ui/utils';
import { toast } from '../utils/toast';

const sectionCardClass =
  'rounded-lg border border-white/5 bg-[#0f2d29] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm';
const dashboardCardShellClass =
  'rounded-lg border border-white/5 bg-[#0f2d29] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm';
const heroCardClass =
  'relative overflow-hidden rounded-lg border border-white/5 bg-bank-hero p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm';
const gradientCardClass = dashboardCardShellClass;
const panelClass = 'rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white';
const labelClass = 'text-2xs uppercase tracking-[0.3em] text-white/60';
const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const iconBadgeClass =
  'flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-emerald';
const planIconBadgeBaseClass =
  'flex h-14 w-14 items-center justify-center rounded-3xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]';
const gradientTitleClass = 'text-3xl font-semibold text-white';
const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-5 py-2.5 text-sm font-semibold text-brand-emerald transition hover:bg-brand-emerald/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const neutralButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-emerald/40 hover:text-brand-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const dangerButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40';

const PLAN_VISUALS: Record<string, { Icon: LucideIcon; badgeClass: string; iconClass: string }> = {
  gratuito: {
    Icon: Gift,
    badgeClass: 'bg-gradient-to-br from-[#012f28] via-[#024639] to-[#05604e]',
    iconClass: 'text-[#4df7d4]',
  },
  amador: {
    Icon: Star,
    badgeClass: 'bg-gradient-to-br from-[#0d1f60] via-[#122b83] to-[#1b3aa7]',
    iconClass: 'text-[#9fc0ff]',
  },
  profissional: {
    Icon: Crown,
    badgeClass: 'bg-gradient-to-br from-[#2d0042] via-[#440a68] to-[#5e138f]',
    iconClass: 'text-[#d8b5ff]',
  },
  default: {
    Icon: Crown,
    badgeClass: 'bg-gradient-to-br from-[#0a2d28] via-[#0f3b36] to-[#124542]',
    iconClass: 'text-white',
  },
};

const getPlanVisual = (planName?: string) => {
  if (!planName) {
    return PLAN_VISUALS.default;
  }
  const key = planName.trim().toLowerCase();
  return PLAN_VISUALS[key] ?? PLAN_VISUALS.default;
};

export default function Perfil() {
  const [profile, setProfile] = useState<ApiProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    nomeCompleto: '',
    email: '',
    fotoPerfil: '',
  });
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('realteste');
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await perfilService.getProfile();
      setProfile(data);
      setUpdateForm({
        nomeCompleto: data.nomeCompleto,
        email: data.email,
        fotoPerfil: data.fotoPerfil ?? '',
      });
      setFotoPreview(data.fotoPerfil ?? null);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    try {
      setUpdating(true);
      setError('');
      let fotoPerfil: string | File | undefined = updateForm.fotoPerfil;
      if (fotoFile) {
        fotoPerfil = fotoFile;
      }
      const data = await perfilService.updateProfile({
        ...updateForm,
        fotoPerfil,
      });
      setProfile(data);
      setUpdateForm({
        nomeCompleto: data.nomeCompleto,
        email: data.email,
      });
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: data }));
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Erro ao atualizar perfil');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.senhaAtual || !passwordForm.novaSenha || !passwordForm.confirmarSenha) {
      setPasswordError('Todos os campos são obrigatórios');
      return;
    }

    if (passwordForm.novaSenha.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    try {
      setChangingPassword(true);
      await perfilService.changePassword({
        senhaAtual: passwordForm.senhaAtual,
        novaSenha: passwordForm.novaSenha,
        confirmarSenha: passwordForm.confirmarSenha,
      });

      setPasswordSuccess(true);
      setPasswordForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setPasswordError('Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetAccount = async () => {
    try {
      setResetting(true);
      setResetError('');
      const data = await perfilService.resetAccount();
      toast.success(
        `Conta resetada com sucesso!\n\nDados removidos:\n- ${data.deleted.bancas} bancas\n- ${data.deleted.apostas} apostas\n- ${data.deleted.transacoes} transações`
      );
      setResetModalOpen(false);
      void navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      console.error('Erro ao resetar conta:', err);
      setResetError('Erro ao resetar conta');
    } finally {
      setResetting(false);
    }
  };

  const handleRedeemPromo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!promoCode.trim()) {
      setPromoError('Informe o código.');
      return;
    }

    try {
      setRedeemingPromo(true);
      setPromoError('');
      const result = await perfilService.redeemPromoCode(promoCode.trim());
      setProfile(result.profile);
      toast.success(result.message);
      setPromoModalOpen(false);
      setPromoCode('realteste');
    } catch (error: any) {
      const message =
        typeof error?.response?.data?.error === 'string'
          ? error.response.data.error
          : error?.response?.data?.message ?? 'Não foi possível aplicar o código.';
      setPromoError(message);
      toast.error(message);
    } finally {
      setRedeemingPromo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success('ID copiado para a área de transferência!'))
      .catch(() => toast.error('Erro ao copiar ID'));
  };

  const handleLinkTelegram = () => {
    if (!profile) return;
    const envBot: unknown = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
    const botUsername = typeof envBot === 'string' ? envBot : 'RealComando_bot';
    const telegramUrl = `https://t.me/${botUsername}?start=${profile.id}`;
    window.open(telegramUrl, '_blank');
  };

  const handleUnlinkTelegram = async () => {
    if (!profile) return;
    if (!window.confirm('Tem certeza que deseja desvincular sua conta do Telegram?')) {
      return;
    }

    try {
      const data = await perfilService.updateTelegram(null);
      setProfile(data);
      toast.success('Telegram desvinculado com sucesso!');
    } catch (err) {
      console.error('Erro ao desvincular Telegram:', err);
      toast.error('Erro ao desvincular Telegram');
    }
  };

  const handleOpenSupportBot = () => {
    if (!profile) return;
    const envSupportBot: unknown = import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_USERNAME;
    const supportBotUsername = typeof envSupportBot === 'string' ? envSupportBot : 'RealComandoSuporte_bot';
    const telegramUrl = `https://t.me/${supportBotUsername}?start=support_${profile.id}`;
    window.open(telegramUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6 text-white">
        <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />
        <div className={sectionCardClass}>
          <p className="text-sm text-white/60">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 text-white">
        <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />
        <div className={sectionCardClass}>
          <p className="text-sm text-danger">{error || 'Erro ao carregar perfil'}</p>
        </div>
      </div>
    );
  }

  const planVisual = getPlanVisual(profile.plano?.nome);
  const PlanIcon = planVisual.Icon;
  const normalizedPlanName = profile.plano?.nome?.trim().toLowerCase() ?? '';
  const isUnlimitedPlan = normalizedPlanName.includes('profissional') || profile.plano.limiteApostasDiarias === 0;
  const promoExpiryDate = profile.promoExpiresAt ? new Date(profile.promoExpiresAt) : null;
  const promoActive = promoExpiryDate ? promoExpiryDate.getTime() > Date.now() : false;

  return (
    <div className="space-y-8 text-white">
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />

      {error && (
        <div className={cn(sectionCardClass, 'border-danger/40 bg-danger/5 text-sm text-danger')}>{error}</div>
      )}

      <section className={heroCardClass}>
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex flex-1 items-center gap-4">
            <div className={cn(planIconBadgeBaseClass, planVisual.badgeClass)}>
              <PlanIcon className={cn('h-6 w-6', planVisual.iconClass)} />
            </div>
            <div>
              <p className={labelClass}>Plano atual</p>
              <p className={gradientTitleClass}>{profile.plano.nome}</p>
            </div>
          </div>

          <button
            type="button"
            className={cn(primaryButtonClass, 'w-auto whitespace-nowrap px-6 py-2')}
            onClick={() => {
              if (promoActive) {
                return;
              }
              setPromoError('');
              setPromoModalOpen(true);
            }}
            disabled={promoActive || redeemingPromo}
          >
            <Gift className="h-4 w-4" />
            {promoActive ? 'Plano promocional ativo' : redeemingPromo ? 'Aplicando...' : 'Liberar 7 dias grátis'}
          </button>
        </div>

        <div className="mt-6 flex flex-1 justify-center text-center text-white">
          <div className="flex w-full max-w-3xl items-center justify-between gap-10">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Limite diário</p>
              <p className="text-lg font-semibold text-white">
                {isUnlimitedPlan ? (
                  <span className="inline-flex items-center gap-1 text-white">
                    <InfinityIcon className="h-4 w-4" /> Ilimitado
                  </span>
                ) : (
                  `${profile.plano.limiteApostasDiarias} apostas`
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Renovação</p>
              <p className="text-lg font-semibold text-white">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={gradientCardClass}>
          <div className="flex items-center gap-4">
            <div className={iconBadgeClass}>
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto de perfil" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className={labelClass}>Informações pessoais</p>
              <p className={gradientTitleClass}>{profile.nomeCompleto || 'Perfil'}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <form className="space-y-4" onSubmit={(event) => void handleUpdateProfile(event)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Apelido</label>
                <input
                  type="text"
                  className={inputClass}
                  value={updateForm.nomeCompleto}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, nomeCompleto: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={updateForm.email}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Foto de perfil</label>
                <input
                  type="file"
                  accept="image/*"
                  className={inputClass}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setFotoFile(file);
                    if (file) {
                      setFotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {fotoPreview && (
                  <img src={fotoPreview} alt="Preview" className="mt-2 h-16 w-16 rounded-full object-cover" />
                )}
              </div>
              <button type="submit" className={primaryButtonClass} disabled={updating}>
                {updating ? 'Salvando...' : 'Salvar alterações'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className={gradientCardClass}>
          <div className="flex items-center gap-4">
            <div className={iconBadgeClass}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className={labelClass}>Estatísticas da conta</p>
              <div className="flex items-center gap-2">
                <p className={gradientTitleClass}>Ativo</p>
                <span className="h-3 w-3 rounded-full bg-brand-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className={panelClass}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Shield className="h-4 w-4" /> ID da conta
              </label>
              <div className="flex gap-2">
                <input type="text" readOnly className={inputClass} value={profile.id} />
                <button type="button" className={neutralButtonClass} onClick={() => copyToClipboard(profile.id)}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <InfoRow icon={Calendar} label="Membro desde" value={formatDate(profile.membroDesde)} />
              <InfoRow icon={RefreshCw} label="Última atualização" value={formatDate(profile.updatedAt)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={gradientCardClass}>
          <div className="flex items-center gap-4">
            <div className={iconBadgeClass}>
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className={labelClass}>Alterar senha</p>
              <p className={gradientTitleClass}>Segurança</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {passwordError && (
              <div className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                <AlertTriangle className="h-4 w-4" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-start gap-3 rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 p-3 text-sm text-brand-emerald">
                <CheckCircle2 className="h-4 w-4" />
                Senha alterada com sucesso!
              </div>
            )}

            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha atual</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••"
                  value={passwordForm.senhaAtual}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, senhaAtual: event.target.value }))}
                  disabled={changingPassword}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova senha</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Nova senha"
                  value={passwordForm.novaSenha}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, novaSenha: event.target.value }))}
                  disabled={changingPassword}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar nova senha</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Confirme a senha"
                  value={passwordForm.confirmarSenha}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmarSenha: event.target.value }))}
                  disabled={changingPassword}
                />
              </div>
              <button type="submit" className={primaryButtonClass} disabled={changingPassword}>
                {changingPassword ? 'Alterando...' : 'Alterar senha'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className={gradientCardClass}>
          <div className="flex items-center gap-4">
            <div className={iconBadgeClass}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className={labelClass}>Integração com Telegram</p>
              <p className={gradientTitleClass}>Bot</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="space-y-2 text-sm text-white/70">
              <p>Vincule sua conta para receber notificações e gerenciar apostas direto pelo bot.</p>
            </div>

            <button
              type="button"
              onClick={profile.telegramId ? handleUnlinkTelegram : handleLinkTelegram}
              className={cn(
                primaryButtonClass,
                'w-full border-0',
                profile.telegramId && 'border border-danger/40 bg-danger/10 text-danger hocus:bg-danger/15'
              )}
            >
              {profile.telegramId ? (
                <>
                  <X className="h-4 w-4" /> Desvincular Telegram
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" /> Vincular Telegram
                </>
              )}
            </button>

            <div className={panelClass}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <MessageCircle className="h-4 w-4" /> Status do bot
              </label>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <div className="space-y-1">
                  <p className="font-medium text-white">{profile.telegramId ? 'Conectado' : 'Aguardando vínculo'}</p>
                  <p className="text-white/60">
                    {profile.telegramId ? 'Você receberá alertas no Telegram' : 'Clique em Vincular para conectar'}
                  </p>
                </div>
                {profile.telegramUsername && (
                  <span className="rounded-2xl bg-brand-emerald/10 px-3 py-1 text-xs font-medium text-brand-emerald">
                    @{profile.telegramUsername}
                  </span>
                )}
              </div>
            </div>

            <div className={panelClass}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Bot className="h-4 w-4" /> ID no Telegram
              </label>
              <div className="flex gap-2">
                <input type="text" readOnly className={inputClass} value={profile.telegramId ?? 'Não vinculado'} />
                {profile.telegramId && (
                  <button
                    type="button"
                    className={neutralButtonClass}
                    onClick={() => copyToClipboard(profile.telegramId!)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className={panelClass}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Mail className="h-4 w-4" /> Precisa de ajuda?
              </label>
              <p className="text-sm text-white/70">Fale diretamente com o nosso time pelo bot de suporte.</p>
              <div className="mt-3">
                <button type="button" className={cn(neutralButtonClass, 'w-full')} onClick={handleOpenSupportBot}>
                  <MessageCircle className="h-4 w-4" /> Bot de suporte
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(gradientCardClass, 'border-danger/40 bg-danger/5')}>
        <div className="flex items-center gap-4">
          <div className={cn(iconBadgeClass, 'border-danger/40 text-danger')}>
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className={labelClass}>Zona de risco</p>
            <p className={gradientTitleClass}>Resetar conta</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-white/70">
            Esta ação remove todas as bancas, apostas e transações. Utilize apenas se quiser começar do zero.
          </p>
          <button type="button" className={dangerButtonClass} onClick={() => setResetModalOpen(true)}>
            <Trash2 className="h-4 w-4" /> Resetar conta
          </button>
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger">
            <p>Você perderá todo o histórico e não será possível recuperar os dados.</p>
          </div>
        </div>
      </section>

      <Modal isOpen={promoModalOpen} onClose={() => setPromoModalOpen(false)} title="Ativar plano promocional" size="sm">
        <form className="space-y-4" onSubmit={handleRedeemPromo}>
          <p className="text-sm text-white/70">
            Utilize o código <span className="font-semibold uppercase tracking-[0.3em] text-white">realteste</span> para
            liberar 7 dias do Plano Profissional.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Código promocional</label>
            <input
              type="text"
              className={inputClass}
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
            />
          </div>
          {promoError && (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">{promoError}</div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className={cn(neutralButtonClass, 'flex-1')} onClick={() => setPromoModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className={cn(primaryButtonClass, 'flex-1')} disabled={redeemingPromo}>
              {redeemingPromo ? 'Aplicando...' : 'Aplicar código'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Resetar conta" size="sm">
        <p className="text-sm text-white">
          Confirme para remover definitivamente todas as suas bancas, apostas e transações. Esta operação não pode ser
          desfeita.
        </p>
        {resetError && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{resetError}</div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className={cn(neutralButtonClass, 'flex-1')} onClick={() => setResetModalOpen(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={cn(dangerButtonClass, 'flex-1')}
            onClick={handleResetAccount}
            disabled={resetting}
          >
            {resetting ? 'Resetando...' : 'Confirmar reset'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) {
    return '—';
  }
  return formatCurrencyUtil(value);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return formatDateUtil(value);
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Icon className="h-4 w-4 text-brand-emerald" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

interface PlanMetricProps {
  label: string;
  value: ReactNode;
}

function PlanMetric({ label, value }: PlanMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
      <p className="text-2xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

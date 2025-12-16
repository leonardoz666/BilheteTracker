import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { usePerfil } from '../contexts/PerfilContext';
import Sidebar from './Sidebar';
import { subscribeToTelegramUpdate } from '../utils/telegramSync';

const SUPPORT_BOT_USERNAME = typeof import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_USERNAME === 'string' && import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_USERNAME.trim().length > 0
  ? import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_USERNAME.trim()
  : 'RealComandoSuporte_bot';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { perfil } = usePerfil();

  useEffect(() => {
    const unsubscribe = subscribeToTelegramUpdate(() => {
      window.location.reload();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleOpenTelegramTicket = () => {
    const baseUrl = `https://t.me/${SUPPORT_BOT_USERNAME}`;
    const startParam = perfil?.id ? `?start=support_${perfil.id}` : '';
    window.open(`${baseUrl}${startParam}`, '_blank', 'noopener,noreferrer');
  };

  const ticketButtonTitle = perfil
    ? 'Abrir ticket com seus dados no Telegram'
    : 'Abrir bot de ticket no Telegram';

  return (
    <div className="flex min-h-screen bg-[#041814] text-white">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
      <div className="flex flex-1 flex-col bg-gradient-to-b from-[#051f1b] via-[#051713] to-[#040f0d] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <Outlet />
        </div>
        <button
          type="button"
          onClick={handleOpenTelegramTicket}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-emerald text-white shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40 sm:bottom-8 sm:right-8"
          title={ticketButtonTitle}
          aria-label="Abrir bot de ticket no Telegram"
        >
          <MessageCircle size={20} />
          <span className="sr-only">Ticket Telegram</span>
        </button>
      </div>
    </div>
  );
};

export default Layout;

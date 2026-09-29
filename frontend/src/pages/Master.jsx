import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Crown, Eye, RefreshCw, Copy, Check, ArrowLeft, Sun, Moon, Wifi, WifiOff, Users } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { usePokerSocket } from '../hooks/usePokerSocket';
import { PokerTable } from './Room';

/**
 * Painel de Controle do Scrum Master (Master.jsx)
 * Exibe credenciais da sala em formato seguro (sem PIN na URL) e a mesa com avatares em tempo real.
 */
export function Master() {
  const { roomId } = useParams();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();

  // Recupera credenciais do state de navegação ou parâmetros de URL
  const searchParams = new URLSearchParams(location.search);
  const userName = location.state?.userName || searchParams.get('userName') || 'Scrum Master';
  const pin = location.state?.pin || searchParams.get('pin') || '0000';
  const masterToken = location.state?.masterToken || searchParams.get('masterToken') || '';

  const { isConnected, roomState, revealVotes, clearVotes } = usePokerSocket(
    roomId,
    userName,
    pin,
    masterToken
  );

  const [copied, setCopied] = useState(false);

  // Gera o texto amigável de compartilhamento SEM o PIN na URL
  const handleCopyCredentials = () => {
    const origin = window.location.origin;
    const shareableUrl = `${origin}/room/${roomId}`;
    const textToCopy = `🔗 Junte-se ao ChaosPlanning!\nSala: ${shareableUrl}\n🔑 PIN de Acesso: ${pin}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const participants = roomState.participants || [];
  const totalVotes = roomState.totalVotes || 0;
  const totalParticipants = participants.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Cabeçalho */}
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
                ChaosPlanning
              </span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Crown className="w-3 h-3 text-amber-500" />
                Painel Master
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Mestre:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{userName}</span>
            </div>
          </div>
        </div>

        {/* Status de Conexão e Toggle de Tema */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isConnected ? 'Online' : 'Conectando'}</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Card no Topo: Credenciais da Sala em Destaque (Link Limpo e Seguro) */}
      <section className="w-full max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-center sm:text-left">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ID da Sala
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {roomId}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Senha (PIN)
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 tracking-wider">
                {pin}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4 text-slate-400" />
              <span>
                <strong>{totalVotes}</strong> de <strong>{totalParticipants}</strong> votaram
              </span>
            </div>
          </div>

          {/* Botão de Compartilhar / Copiar Credenciais */}
          <button
            onClick={handleCopyCredentials}
            className={`
              w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm
              transition-all shadow-sm active:scale-95
              ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
              }
            `}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Credenciais Copiadas!' : 'Copiar Link / Credenciais'}
          </button>
        </div>
      </section>

      {/* Área Central: Mesa de Poker com Avatares em Tempo Real */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
        <PokerTable
          participants={participants}
          votesRevealed={roomState.votesRevealed}
          modes={roomState.modes}
          isMaster={true}
        />
      </main>

      {/* Rodapé do Master: Controles de Votação (Revelar / Limpar Mesa) */}
      <footer className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 sm:py-4 px-4 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
          {/* Botão Revelar Votos */}
          <button
            type="button"
            onClick={() => revealVotes(masterToken)}
            disabled={roomState.votesRevealed}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-white
              transition shadow-md active:scale-95
              ${
                roomState.votesRevealed
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25'
              }
            `}
          >
            <Eye className="w-4 h-4" />
            Revelar Votos
          </button>

          {/* Botão Limpar Mesa */}
          <button
            type="button"
            onClick={() => clearVotes(masterToken)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Limpar Mesa
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Master;

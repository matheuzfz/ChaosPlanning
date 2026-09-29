import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ArrowLeft,
  Shield,
  Crown,
  Pencil,
  X,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { usePokerSocket } from '../hooks/usePokerSocket';

// Escala estrita da regra de negócio (Fibonacci)
export const POKER_CARDS = [1, 2, 3, 5, 8, 13];

// Biblioteca de personagens temáticos (emojis)
export const AVATAR_PRESETS = ['🐱', '🎮', '🖨️', '💻', '🧙‍♂️', '🤖', '👾', '🚀'];

// Paleta de gradientes para o fundo dos avatares
const AVATAR_BG_GRADIENTS = [
  'from-indigo-500/20 to-indigo-600/30 border-indigo-400/40',
  'from-emerald-500/20 to-emerald-600/30 border-emerald-400/40',
  'from-amber-500/20 to-amber-600/30 border-amber-400/40',
  'from-rose-500/20 to-rose-600/30 border-rose-400/40',
  'from-violet-500/20 to-violet-600/30 border-violet-400/40',
  'from-cyan-500/20 to-cyan-600/30 border-cyan-400/40',
  'from-fuchsia-500/20 to-fuchsia-600/30 border-fuchsia-400/40',
  'from-blue-500/20 to-blue-600/30 border-blue-400/40',
];

export function getAvatarBgGradient(identifier = '') {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_GRADIENTS[Math.abs(hash) % AVATAR_BG_GRADIENTS.length];
}

export function getDefaultAvatar(identifier = '') {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PRESETS[Math.abs(hash) % AVATAR_PRESETS.length];
}

/**
 * Componente da Mesa de Poker com avatares de personagens distribuídos trigonometricamente.
 */
export function PokerTable({
  participants = [],
  votesRevealed = false,
  modes = [],
  currentVote = null,
  tableRef = null,
  isMaster = false,
  onCurrentAvatarClick = null,
}) {
  const count = participants.length;

  return (
    <div
      ref={tableRef}
      className={`
        relative w-full aspect-[16/9] sm:aspect-[2/1] max-w-4xl max-h-[56vh] min-h-[250px] sm:min-h-[310px]
        rounded-[65px] sm:rounded-[110px] md:rounded-[150px]
        transition-colors duration-300
        flex items-center justify-center
        /* Borda e Feltro da Mesa de Poker */
        border-[10px] sm:border-[16px] md:border-[20px] border-[#382013]
        bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800
        shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_0_60px_rgba(0,0,0,0.45)]
        dark:border-[#1a202c]
        dark:bg-gradient-to-b dark:from-[#1b2537] dark:via-[#151e2d] dark:to-[#0f172a]
        dark:shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_0_70px_rgba(0,0,0,0.65)]
      `}
    >
      {/* Linha interna decorativa tracejada */}
      <div className="absolute inset-3 sm:inset-5 md:inset-7 rounded-[45px] sm:rounded-[85px] md:rounded-[125px] border border-dashed border-white/20 pointer-events-none" />

      {/* Avatares dos Jogadores espalhados nas bordas via trigonometria */}
      {participants.map((player, index) => {
        const angle = count === 1 ? Math.PI / 2 : (2 * Math.PI * index) / count - Math.PI / 2;
        const rx = 44;
        const ry = 41;
        const left = 50 + rx * Math.cos(angle);
        const top = 50 + ry * Math.sin(angle);

        const hasVoted = Boolean(player.has_voted || (currentVote !== null && player.isCurrent));
        const voteValue = player.vote ?? (player.isCurrent ? currentVote : null);
        const avatarEmoji = player.avatar || getDefaultAvatar(player.user_id || player.user_name);

        return (
          <div
            key={player.user_id || index}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-20 flex flex-col items-center select-none"
          >
            <div className="relative group">
              {/* Círculo do Avatar com EMOJI CENTRALIZADO */}
              <button
                type="button"
                onClick={() => {
                  if (player.isCurrent && onCurrentAvatarClick) {
                    onCurrentAvatarClick();
                  }
                }}
                disabled={!player.isCurrent}
                className={`
                  w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-full
                  bg-gradient-to-tr ${getAvatarBgGradient(player.user_name || String(index))}
                  bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
                  border-2 sm:border-3 border-white dark:border-slate-700
                  shadow-lg flex items-center justify-center
                  text-2xl sm:text-3xl md:text-3.5xl
                  transition-all duration-200
                  ${
                    player.isCurrent
                      ? 'cursor-pointer hover:scale-115 hover:ring-4 hover:ring-emerald-400 active:scale-95'
                      : 'cursor-default'
                  }
                `}
                title={player.isCurrent ? 'Clique para trocar seu avatar' : player.user_name}
              >
                <span className="filter drop-shadow-sm leading-none">{avatarEmoji}</span>
              </button>

              {/* Dica para o usuário atual trocar o avatar */}
              {player.isCurrent && (
                <div
                  onClick={() => onCurrentAvatarClick && onCurrentAvatarClick()}
                  className="absolute -bottom-1 -left-1 bg-emerald-500 text-white p-1 rounded-full shadow-md cursor-pointer hover:scale-110 transition"
                  title="Trocar avatar"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Coroa do Scrum Master */}
              {player.is_master && (
                <div className="absolute -top-2.5 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-md pointer-events-none">
                  <Crown className="w-3 h-3" />
                </div>
              )}

              {/* Carta Pequena ao lado do avatar quando o jogador votou */}
              <AnimatePresence>
                {hasVoted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 6, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    className="absolute -top-2 -right-4 sm:-right-5 z-30 pointer-events-none"
                  >
                    {!votesRevealed ? (
                      /* Verso da carta de baralho */
                      <div
                        className="
                          w-5 h-7 sm:w-6 sm:h-9 rounded-[4px]
                          bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-950
                          border-[1.5px] border-white shadow-md flex items-center justify-center
                        "
                        title="Voto registrado!"
                      >
                        <div className="w-3.5 h-5 sm:w-4 sm:h-6 rounded-[2px] border border-dashed border-white/40 flex items-center justify-center">
                          <span className="text-[8px] text-white/70">♠</span>
                        </div>
                      </div>
                    ) : (
                      /* Frente da carta revelada com o valor */
                      <div
                        className="
                          w-6 h-8 sm:w-7 sm:h-10 rounded-[5px]
                          bg-[#fdfbf7] border border-slate-300 dark:border-slate-600
                          shadow-xl flex items-center justify-center
                          text-slate-900 font-black font-mono text-xs sm:text-sm
                        "
                        title={`Voto: ${voteValue}`}
                      >
                        {voteValue ?? '?'}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nome do Jogador */}
            <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-900/80 text-white backdrop-blur-sm shadow max-w-[85px] sm:max-w-[105px] truncate">
              {player.user_name}
            </span>
          </div>
        );
      })}

      {/* Centro da Mesa: Status, Logo ou Resultados da Rodada */}
      <div className="text-center z-10 px-4 max-w-xs sm:max-w-sm pointer-events-none">
        {votesRevealed ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 text-white shadow-2xl pointer-events-auto"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Votos Revelados
            </span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-xs sm:text-sm text-white/80 font-medium">Moda:</span>
              <div className="flex gap-1.5">
                {modes && modes.length > 0 ? (
                  modes.map((val) => (
                    <span
                      key={val}
                      className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black font-mono text-base sm:text-lg shadow"
                    >
                      {val}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-mono text-white/70">Nenhum voto</span>
                )}
              </div>
            </div>
            {modes && modes.length > 1 && (
              <p className="text-[10px] text-amber-200/90 mt-1 font-medium">
                Empate estatístico na frequência máxima!
              </p>
            )}
          </motion.div>
        ) : (
          <div>
            <div className="inline-flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20 mb-1.5 sm:mb-2 shadow-inner">
              <Shield className="w-5 h-5 sm:w-7 sm:h-7 text-white/80" />
            </div>
            <h2 className="text-white/95 font-extrabold text-sm sm:text-lg md:text-xl tracking-wider uppercase drop-shadow">
              ChaosPlanning
            </h2>
            <p className="text-white/70 text-[11px] sm:text-xs font-medium mt-0.5">
              {currentVote !== null ? `Seu voto atual: ${currentVote}` : 'Selecione sua carta no deck abaixo'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Página principal da Mesa de Poker para os Jogadores (Room.jsx)
 */
export function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();

  // Recupera credenciais iniciais
  const searchParams = new URLSearchParams(location.search);
  const initialUserName =
    location.state?.userName ||
    searchParams.get('userName') ||
    sessionStorage.getItem('chaosplanning_user_name') ||
    'Jogador';
  const pin = location.state?.pin || searchParams.get('pin') || '0000';

  // Estados locais para edição inline de nickname e avatar
  const [currentUserName, setCurrentUserName] = useState(initialUserName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(initialUserName);

  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return sessionStorage.getItem('chaosplanning_avatar') || AVATAR_PRESETS[0];
  });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Hook de conexão WebSocket
  const { isConnected, roomState, userId, sendVote, sendProfileUpdate } = usePokerSocket(
    roomId,
    currentUserName,
    pin
  );

  const [selectedCard, setSelectedCard] = useState(null);
  const [flyingCard, setFlyingCard] = useState(null);
  const [copied, setCopied] = useState(false);

  const tableRef = useRef(null);
  const nameInputRef = useRef(null);

  // Foco automático ao entrar no modo de edição inline de nome
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Reseta seleção de voto se a mesa foi limpa pelo Master
  useEffect(() => {
    if (!roomState.votesRevealed && roomState.totalVotes === 0) {
      setSelectedCard(null);
    }
  }, [roomState.votesRevealed, roomState.totalVotes]);

  /**
   * Salva a edição inline de nickname e transmite update_profile via WebSocket
   */
  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== currentUserName) {
      setCurrentUserName(trimmed);
      sessionStorage.setItem('chaosplanning_user_name', trimmed);
      sendProfileUpdate(trimmed, currentAvatar);
    } else {
      setTempName(currentUserName);
    }
    setIsEditingName(false);
  };

  /**
   * Seleciona um novo avatar emoji e transmite update_profile via WebSocket
   */
  const handleSelectAvatar = (emoji) => {
    setCurrentAvatar(emoji);
    sessionStorage.setItem('chaosplanning_avatar', emoji);
    sendProfileUpdate(currentUserName, emoji);
    setIsAvatarModalOpen(false);
  };

  /**
   * Clique na carta: dispara a animação de arremesso da carta até o centro da mesa
   * e envia o voto via WebSocket.
   */
  const handleCardClick = (value, event) => {
    const btnRect = event.currentTarget.getBoundingClientRect();
    const startX = btnRect.left + btnRect.width / 2;
    const startY = btnRect.top + btnRect.height / 2;

    const tableRect = tableRef.current?.getBoundingClientRect();
    const targetX = tableRect ? tableRect.left + tableRect.width / 2 : window.innerWidth / 2;
    const targetY = tableRect ? tableRect.top + tableRect.height / 2 : window.innerHeight / 2;

    setFlyingCard({
      id: Date.now(),
      value,
      startX,
      startY,
      targetX,
      targetY,
    });

    setSelectedCard(value);
    sendVote(value);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Garante que a lista de participantes exiba o usuário atual com seu avatar e nome reativos
  const participants = (() => {
    if (roomState.participants && roomState.participants.length > 0) {
      return roomState.participants.map((p) => {
        const isCurrent = p.user_id === userId;
        return {
          ...p,
          isCurrent,
          user_name: isCurrent ? currentUserName : p.user_name,
          avatar: isCurrent ? currentAvatar : p.avatar,
        };
      });
    }
    return [
      {
        user_id: userId,
        user_name: currentUserName,
        avatar: currentAvatar,
        has_voted: selectedCard !== null,
        vote: selectedCard,
        is_master: false,
        isCurrent: true,
      },
    ];
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Carta Voadora em Framer Motion com z-index superior para evitar cortes visuais */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.id}
            initial={{
              left: flyingCard.startX,
              top: flyingCard.startY,
              x: '-50%',
              y: '-50%',
              scale: 0.9,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              left: flyingCard.targetX,
              top: flyingCard.targetY,
              x: '-50%',
              y: '-50%',
              scale: [0.9, 1.25, 1.05],
              rotate: [0, -18, 12, 0],
              opacity: [1, 1, 0.95],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => {
              setTimeout(() => setFlyingCard(null), 150);
            }}
            className="fixed z-50 pointer-events-none"
          >
            <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-[#fdfbf7] border-2 border-amber-400 shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between p-1.5 font-mono select-none">
              <span className="text-[10px] font-bold text-slate-900 leading-none">
                {flyingCard.value}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 text-center font-serif">
                {flyingCard.value}
              </span>
              <span className="text-[10px] font-bold text-slate-900 leading-none self-end rotate-180">
                {flyingCard.value}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal / Popover de Seleção de Avatar (Biblioteca de Personagens) */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Escolha seu Personagem
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 my-3">
                Selecione o avatar que irá representá-lo na mesa de votação:
              </p>

              {/* Grid dos Emojis Solicitados: 🐱, 🎮, 🖨️, 💻, 🧙‍♂️, 🤖, 👾, 🚀 */}
              <div className="grid grid-cols-4 gap-3 py-2">
                {AVATAR_PRESETS.map((emoji) => {
                  const isSelected = currentAvatar === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectAvatar(emoji)}
                      className={`
                        w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center
                        text-3xl sm:text-3.5xl transition-all duration-150 select-none
                        ${
                          isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 ring-4 ring-emerald-500 scale-105 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-110 shadow-sm'
                        }
                      `}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Mesa
              </span>
            </div>

            {/* Edição Inline do Nickname do Jogador */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Jogador:</span>
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setTempName(currentUserName);
                        setIsEditingName(false);
                      }
                    }}
                    onBlur={handleSaveName}
                    maxLength={25}
                    className="px-2 py-0.5 rounded-md border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Confirmar nome"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempName(currentUserName);
                    setIsEditingName(true);
                  }}
                  className="group flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Clique para editar seu nickname"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentUserName}
                  </span>
                  <Pencil className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 transition" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informações da Sala & Toggle de Tema */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={copyRoomId}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            title="Clique para copiar o ID da sala"
          >
            <span className="text-slate-500 dark:text-slate-400">ID:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{roomId}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>

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

      {/* Área Central: Mesa de Poker com Avatares em Emojis */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
        <PokerTable
          participants={participants}
          votesRevealed={roomState.votesRevealed}
          modes={roomState.modes}
          currentVote={selectedCard}
          tableRef={tableRef}
          onCurrentAvatarClick={() => setIsAvatarModalOpen(true)}
        />
      </main>

      {/* Deck de Cartas de Baralho Reais (sem overflow-hidden para não cortar a carta selecionada) */}
      <footer className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-3 pb-5 px-3 sm:px-6 z-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Deck de Votação (Fibonacci)
          </span>

          <div className="flex items-end justify-center gap-2.5 sm:gap-4 md:gap-5 pt-3 pb-1">
            {POKER_CARDS.map((value) => {
              const isSelected = selectedCard === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={(e) => handleCardClick(value, e)}
                  className={`
                    group relative flex flex-col justify-between
                    w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28
                    p-1.5 sm:p-2.5 rounded-xl select-none
                    bg-[#fdfbf7] text-slate-900
                    border border-slate-300 dark:border-slate-400
                    transition-all duration-200 ease-out
                    ${
                      isSelected
                        ? '-translate-y-5 sm:-translate-y-6 shadow-[0_15px_30px_rgba(245,158,11,0.35)] ring-4 ring-amber-400 scale-105 z-30'
                        : 'shadow-md hover:-translate-y-2 hover:shadow-xl hover:border-slate-400'
                    }
                  `}
                >
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[11px] sm:text-xs font-black font-mono text-slate-800">
                      {value}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-500">♠</span>
                  </div>

                  <span className="text-xl sm:text-3xl md:text-4xl font-black font-serif text-slate-900 tracking-tight text-center">
                    {value}
                  </span>

                  <div className="flex flex-col items-start leading-none self-end rotate-180">
                    <span className="text-[11px] sm:text-xs font-black font-mono text-slate-800">
                      {value}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-500">♠</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Room;

import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Eye,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { usePokerSocket } from '../hooks/usePokerSocket';

// Escala estrita da regra de negócio (Fibonacci)
export const POKER_CARDS = [1, 2, 3, 5, 8, 13];

// Formata a média: inteiro sem casas decimais; quebrado com no máximo uma casa
export function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Opções de arremesso de itens de caos (ChaosPlanning)
export const CHAOS_ITEMS = [
  { emoji: '🧻', label: 'Papel' },
  { emoji: '🪑', label: 'Cadeira' },
  { emoji: '🎯', label: 'Dardo' },
  { emoji: '💻', label: 'Laptop' },
];

/**
 * Menu flutuante (popover) para selecionar um item para arremessar
 */
export function ItemThrowPopover({ targetName, onSelect, onClose }) {
  return (
    <div
      className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {CHAOS_ITEMS.map(({ emoji, label }) => (
        <button
          key={emoji}
          type="button"
          title={`Atirar ${label} em ${targetName}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-lg sm:text-xl bg-slate-800/80 hover:bg-slate-700 dark:hover:bg-slate-600 hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/**
 * Componente do objeto em voo animado através de transições CSS com rotação
 */
export function FlyingItem({ item, onComplete }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Força reflow no próximo frame para disparar a transição CSS
    const rafId = requestAnimationFrame(() => {
      setActive(true);
    });

    // Remove o item após a duração da animação (800ms) para limpar a DOM
    const timer = setTimeout(() => {
      onComplete(item.id);
    }, 800);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [item.id, onComplete]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${active ? item.endX : item.startX}px`,
        top: `${active ? item.endY : item.startY}px`,
        transform: `translate(-50%, -50%) rotate(${active ? 720 : 0}deg) scale(${active ? 1.3 : 0.8})`,
        transition: 'all 0.8s ease-in-out',
        pointerEvents: 'none',
        zIndex: 50,
      }}
      className="text-3xl sm:text-4xl filter drop-shadow-xl select-none"
    >
      {item.emoji}
    </div>
  );
}

/**
 * Componente da Mesa de Poker com participantes distribuídos trigonometricamente ao redor da mesa.
 * Inclui motor de arremesso de itens voláteis (Chaos Engine) e menu popover ao clicar nos avatares.
 */
export function PokerTable({
  participants = [],
  votesRevealed = false,
  modes = [],
  currentVote = null,
  tableRef = null,
  isMaster = false,
  currentUserName = '',
  onThrowItem = null,
  lastMessage = null,
}) {
  const count = participants.length;
  const internalTableRef = useRef(null);
  const activeTableRef = tableRef || internalTableRef;

  // Estado para o popover ativo (qual jogador foi clicado)
  const [activePopover, setActivePopover] = useState(null);

  // Estado temporário para gerir os objetos em voo
  const [flyingItems, setFlyingItems] = useState([]);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    if (!activePopover) return;
    const handleGlobalClick = () => setActivePopover(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activePopover]);

  // Remove o item do estado flyingItems após o término da animação (800ms)
  const handleRemoveFlyingItem = useCallback((id) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Captura coordenadas e adiciona novo item ao estado flyingItems
  const triggerThrow = useCallback(
    (msg) => {
      const source = msg.source || msg.from_user_name;
      const target = msg.target || msg.target_user_name;
      const item = msg.item || '💻';

      if (!source || !target) return;

      const sourceEl = document.getElementById(`avatar-${source}`);
      const targetEl = document.getElementById(`avatar-${target}`);
      const tableEl = activeTableRef.current;

      if (!tableEl) return;
      const tableRect = tableEl.getBoundingClientRect();

      let startX = tableRect.width / 2;
      let startY = tableRect.height / 2;
      let endX = tableRect.width / 2;
      let endY = tableRect.height / 2;

      if (sourceEl) {
        const sRect = sourceEl.getBoundingClientRect();
        startX = sRect.left + sRect.width / 2 - tableRect.left;
        startY = sRect.top + sRect.height / 2 - tableRect.top;
      }

      if (targetEl) {
        const tRect = targetEl.getBoundingClientRect();
        endX = tRect.left + tRect.width / 2 - tableRect.left;
        endY = tRect.top + tRect.height / 2 - tableRect.top;
      }

      const newItem = {
        id: Date.now() + Math.random(),
        emoji: item,
        startX,
        startY,
        endX,
        endY,
      };

      setFlyingItems((prev) => [...prev, newItem]);
    },
    [activeTableRef]
  );

  // Reage a eventos throw_item recebidos do WebSocket
  useEffect(() => {
    if (
      lastMessage &&
      (lastMessage.type === 'throw_item' || lastMessage.event === 'throw_item')
    ) {
      triggerThrow(lastMessage);
    }
  }, [lastMessage, triggerThrow]);

  // Ouve eventos customizados da window (chaos_throw_item) para facilidade de integração e testes
  useEffect(() => {
    const handleChaosEvent = (e) => {
      if (e.detail) {
        triggerThrow(e.detail);
      }
    };
    window.addEventListener('chaos_throw_item', handleChaosEvent);
    return () => window.removeEventListener('chaos_throw_item', handleChaosEvent);
  }, [triggerThrow]);

  // Ao clicar num item, fecha o menu e envia o evento throw_item via WebSocket
  const handleItemSelect = (emoji, targetPlayerName) => {
    setActivePopover(null);
    if (onThrowItem) {
      onThrowItem({
        type: 'throw_item',
        source: currentUserName,
        target: targetPlayerName,
        item: emoji,
      });
    }
  };

  // Média dos votos revelados: ignora votos não numéricos ('?', null etc.)
  const numericVotes = participants
    .map((p) => p.vote)
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length
      : null;

  // Agrupa os nomes dos jogadores pela carta escolhida: { 5: ['Matheus', 'João'], 8: ['Carol'] }
  const votesByCard = participants.reduce((acc, p) => {
    if (p.vote !== null && p.vote !== undefined) {
      (acc[p.vote] = acc[p.vote] || []).push(p.user_name);
    }
    return acc;
  }, {});
  const groupedVotes = Object.entries(votesByCard).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    <div
      ref={activeTableRef}
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

      {/* Objetos em voo (Chaos Engine) */}
      {flyingItems.map((item) => (
        <FlyingItem
          key={item.id}
          item={item}
          onComplete={handleRemoveFlyingItem}
        />
      ))}

      {/* Participantes espalhados nas bordas via trigonometria */}
      {participants.map((player, index) => {
        const angle = count === 1 ? Math.PI / 2 : (2 * Math.PI * index) / count - Math.PI / 2;
        const rx = 44;
        const ry = 41;
        const left = 50 + rx * Math.cos(angle);
        const top = 50 + ry * Math.sin(angle);

        const hasVoted = Boolean(player.has_voted || (currentVote !== null && player.isCurrent));
        const isReady = hasVoted && !votesRevealed;
        const voteValue = player.vote ?? (player.isCurrent ? currentVote : null);

        // Verificação se o jogador em questão é Scrum Master
        const isScrumMaster = Boolean(player.is_master || (player.isCurrent && isMaster));
        const playerName = player.name || player.user_name || `player-${index}`;
        const isSelf = Boolean(
          player.isCurrent || (currentUserName && playerName === currentUserName)
        );

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
            {/* Popover flutuante para escolha do item de arremesso */}
            {activePopover === playerName && (
              <ItemThrowPopover
                targetName={playerName}
                onSelect={(emoji) => handleItemSelect(emoji, playerName)}
                onClose={() => setActivePopover(null)}
              />
            )}

            {/* Div principal do avatar com atributo id para localização no DOM */}
            <div
              id={`avatar-${player.name || player.user_name}`}
              onClick={(e) => {
                e.stopPropagation();
                // Exibe menu flutuante quando o utilizador clicar no avatar de outro jogador
                if (!isSelf) {
                  setActivePopover((prev) => (prev === playerName ? null : playerName));
                }
              }}
              className={`
                relative group
                ${!isSelf ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : 'cursor-default'}
              `}
              title={
                !isSelf
                  ? `Clique para atirar um item em ${playerName}`
                  : isScrumMaster
                  ? `${playerName} (Scrum Master)`
                  : playerName
              }
            >
              {/* Círculo do Avatar com fundo sólido neutro e ícone padronizado por papel */}
              <div
                className={`
                  w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-full
                  bg-gray-700 text-white
                  border-2 sm:border-3 border-gray-600 dark:border-gray-500
                  shadow-lg flex items-center justify-center
                  text-2xl sm:text-3xl md:text-3.5xl
                  transition-all duration-200
                  ${
                    isReady
                      ? 'ring-4 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]'
                      : ''
                  }
                `}
              >
                <span className="filter drop-shadow-sm leading-none select-none">
                  {isScrumMaster ? '👑' : '👤'}
                </span>
              </div>

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
              {playerName}
            </span>

            {/* Badge de status: já votou (cartas ainda ocultas) */}
            {isReady && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500 text-white shadow-md whitespace-nowrap"
              >
                ✅ Pronto
              </motion.span>
            )}
          </div>
        );
      })}

      {/* Centro da Mesa: Status, Logo ou Resultados da Rodada */}
      <div className="text-center z-10 px-4 max-w-xs sm:max-w-md pointer-events-none">
        {votesRevealed ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 text-white shadow-2xl pointer-events-auto"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Votos Revelados
            </span>

            {/* Média em destaque */}
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-xs sm:text-sm text-white/80 font-medium">Média:</span>
              <span className="px-3 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-black font-mono text-xl sm:text-2xl shadow">
                {average !== null ? formatAverage(average) : '—'}
              </span>
            </div>

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

            {/* Quem votou em quê: lista vertical agrupada por carta */}
            {groupedVotes.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-col gap-1.5 w-full max-h-48 overflow-y-auto px-2">
                {groupedVotes.map(([card, names]) => (
                  <div
                    key={card}
                    className="text-xs text-white/90 flex items-center justify-between gap-3 bg-white/10 dark:bg-black/20 rounded-lg px-2.5 py-1.5 backdrop-blur-sm"
                  >
                    <span className="font-black font-mono text-amber-300 shrink-0">Carta {card}:</span>
                    <span className="font-medium text-right truncate">{names.join(', ')}</span>
                  </div>
                ))}
              </div>
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
  const { toggleTheme, isDark } = useTheme();

  // Scrum Master: o master_token é guardado na sessão de quem criou a sala
  const masterToken = sessionStorage.getItem(`chaosplanning_master_${roomId}`) || '';
  const isMaster = Boolean(masterToken);

  // Apelido salvo (criador da sala ou convidado que já entrou); vazio => pede o apelido
  const initialUserName = sessionStorage.getItem('chaosplanning_user_name') || '';
  const [joinName, setJoinName] = useState('');

  // Estados locais para edição inline de nickname e avatar
  const [currentUserName, setCurrentUserName] = useState(initialUserName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(initialUserName);

  // Hook de conexão WebSocket (só conecta depois de haver um apelido)
  const {
    isConnected,
    connectionError,
    roomState,
    userId,
    sendVote,
    sendProfileUpdate,
    revealVotes,
    clearVotes,
    resetVotes,
    lastMessage,
    socketRef,
  } = usePokerSocket(roomId, currentUserName, masterToken);

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
      sendProfileUpdate(trimmed);
    } else {
      setTempName(currentUserName);
    }
    setIsEditingName(false);
  };

  /**
   * Clique na carta: dispara a animação de arremesso da carta até o centro da mesa
   * e envia o voto via WebSocket.
   */
  const handleCardClick = (value, event) => {
    // Mesa virada: não é mais permitido trocar o voto
    if (roomState.votesRevealed) return;

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

  // Convidado informa apenas o apelido para entrar na mesa
  const handleJoin = (e) => {
    e.preventDefault();
    const name = joinName.trim();
    if (!name) return;
    sessionStorage.setItem('chaosplanning_user_name', name);
    setCurrentUserName(name);
    setTempName(name);
  };

  // Copia o link direto da sala para o Scrum Master compartilhar com a equipe
  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/sala/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Garante que a lista de participantes exiba o usuário atual de forma reativa
  const participants = (() => {
    if (roomState.participants && roomState.participants.length > 0) {
      return roomState.participants.map((p) => {
        const isCurrent = p.user_id === userId;
        return {
          ...p,
          isCurrent,
          user_name: isCurrent ? currentUserName : p.user_name,
        };
      });
    }
    return [
      {
        user_id: userId,
        user_name: currentUserName,
        has_voted: selectedCard !== null,
        vote: selectedCard,
        is_master: isMaster,
        isCurrent: true,
      },
    ];
  })();

  // Sem apelido salvo: pede apenas o nome antes de entrar na mesa
  if (!currentUserName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <form
          onSubmit={handleJoin}
          className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
        >
          <div className="text-center">
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              ChaosPlanning
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Você foi convidado para uma mesa. Como quer ser chamado?
            </p>
          </div>
          <input
            type="text"
            autoFocus
            required
            maxLength={25}
            placeholder="Seu apelido"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition active:scale-[0.98]"
          >
            Entrar na Mesa
          </button>
        </form>
      </div>
    );
  }

  // Sala inexistente / já encerrada (todos saíram)
  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <p className="text-sm font-semibold">{connectionError}</p>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
        >
          Criar nova sala
        </Link>
      </div>
    );
  }

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
          {isMaster && (
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition"
              title="Copiar o link da sala para enviar à equipe"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link copiado!' : 'Copiar Link'}</span>
            </button>
          )}

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
          isMaster={isMaster}
          currentUserName={currentUserName}
          onThrowItem={(throwData) => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify(throwData));
            }
          }}
          lastMessage={lastMessage}
        />
      </main>

      {/* Deck de Cartas de Baralho Reais (sem overflow-hidden para não cortar a carta selecionada) */}
      <footer className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-3 pb-5 px-3 sm:px-6 z-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Controles exclusivos do Scrum Master */}
          {isMaster && (
            <div className="w-full max-w-xl flex items-center justify-center gap-3 mb-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Users className="w-4 h-4" />
                <span>{roomState.totalVotes}/{roomState.totalParticipants}</span>
              </div>
              <button
                type="button"
                onClick={() => revealVotes(masterToken)}
                disabled={roomState.votesRevealed}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition shadow-md active:scale-95 ${
                  roomState.votesRevealed
                    ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                Revelar Cartas
              </button>
              <button
                type="button"
                onClick={() => clearVotes(masterToken)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition shadow-sm active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Nova Rodada
              </button>
              <button
                type="button"
                onClick={() => resetVotes(masterToken)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 transition shadow-sm active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar Votação
              </button>
            </div>
          )}
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Deck de Votação (Fibonacci)
          </span>

          <div className="flex items-end justify-center gap-2.5 sm:gap-4 md:gap-5 pt-3 pb-1">
            {POKER_CARDS.map((value) => {
              const isSelected = selectedCard === value;
              const isLocked = roomState.votesRevealed;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isLocked}
                  onClick={isLocked ? undefined : (e) => handleCardClick(value, e)}
                  className={`
                    group relative flex flex-col justify-between
                    w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28
                    p-1.5 sm:p-2.5 rounded-xl select-none
                    text-slate-900
                    border border-slate-300 dark:border-slate-400
                    transition-all duration-200 ease-out
                    ${
                      isLocked
                        ? 'bg-slate-300 dark:bg-slate-600 opacity-50 grayscale cursor-not-allowed'
                        : 'bg-[#fdfbf7]'
                    }
                    ${
                      isSelected
                        ? '-translate-y-5 sm:-translate-y-6 shadow-[0_15px_30px_rgba(245,158,11,0.35)] ring-4 ring-amber-400 scale-105 z-30'
                        : isLocked
                          ? 'shadow-none'
                          : 'shadow-md hover:-translate-y-2 hover:shadow-xl hover:border-slate-400'
                    }
                  `}
                  title={isLocked ? 'Votos revelados: aguarde a próxima rodada' : undefined}
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

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook de comunicação em tempo real com o backend via WebSocket nativo.
 *
 * @param {string} roomId - Identificador da sala
 * @param {string} userName - Nome do participante
 * @param {string} pin - PIN numérico de segurança da sala
 * @param {string} [masterToken] - Token confidencial de Scrum Master (opcional)
 */
export function usePokerSocket(roomId, userName, pin, masterToken = null) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [roomState, setRoomState] = useState({
    roomId: roomId || '',
    votesRevealed: false,
    totalParticipants: 0,
    totalVotes: 0,
    participants: [],
    modes: [],
  });

  // Obtém ou gera um user_id persistente na sessão do navegador
  const getUserId = useCallback(() => {
    let id = sessionStorage.getItem('chaosplanning_user_id') || sessionStorage.getItem('scrumbrawl_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('chaosplanning_user_id', id);
    }
    return id;
  }, []);

  const userId = getUserId();

  useEffect(() => {
    if (!roomId || !userName || !pin) {
      return;
    }

    const encodedName = encodeURIComponent(userName);
    const tokenQuery = masterToken ? `&master_token=${encodeURIComponent(masterToken)}` : '';
    const wsUrl = `ws://localhost:8000/ws/${roomId}?user_id=${userId}&user_name=${encodedName}&pin=${pin}${tokenQuery}`;

    console.log(`[usePokerSocket] Conectando a ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`[usePokerSocket] Conexão WebSocket estabelecida na sala '${roomId}'.`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[usePokerSocket] Mensagem recebida do servidor:', data);
        setLastMessage(data);

        // Atualiza estado reativo da sala se a mensagem incluir room_state
        if (data.room_state) {
          setRoomState({
            roomId: data.room_state.room_id,
            votesRevealed: Boolean(data.room_state.votes_revealed),
            totalParticipants: data.room_state.total_participants || 0,
            totalVotes: data.room_state.total_votes || 0,
            participants: data.room_state.participants || [],
            modes: data.room_state.modes || [],
          });
        }
      } catch (err) {
        console.log('[usePokerSocket] Mensagem bruta recebida:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('[usePokerSocket] Erro na conexão WebSocket:', error);
    };

    ws.onclose = (event) => {
      console.log(`[usePokerSocket] Conexão WebSocket encerrada. Código: ${event.code}`);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [roomId, userName, pin, masterToken, userId]);

  /**
   * Envia o voto do jogador para a sala.
   * @param {number} value - Voto na escala: 1, 2, 3, 5, 8 ou 13
   */
  const sendVote = useCallback((value) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'vote',
        vote: Number(value),
      };
      console.log('[usePokerSocket] Enviando voto:', payload);
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[usePokerSocket] Não foi possível enviar voto: WebSocket desconectado.');
    }
  }, []);

  /**
   * Envia a atualização do perfil do usuário (nome e/ou avatar emoji).
   * @param {string} newName - Novo nickname do participante
   * @param {string} newAvatar - Emoji do avatar selecionado
   */
  const sendProfileUpdate = useCallback((newName, newAvatar) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'update_profile',
        user_name: newName,
        avatar: newAvatar,
      };
      console.log('[usePokerSocket] Enviando atualização de perfil:', payload);
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[usePokerSocket] Não foi possível atualizar perfil: WebSocket desconectado.');
    }
  }, []);

  /**
   * Envia o evento de arremesso de item no usuário alvo.
   * @param {string} target - ID do usuário de destino
   * @param {string} item - Identificador do item
   */
  const throwItem = useCallback((target, item) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'throw_item',
        target_user_id: target,
        item: item,
      };
      console.log('[usePokerSocket] Arremessando item:', payload);
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[usePokerSocket] Não foi possível arremessar item: WebSocket desconectado.');
    }
  }, []);

  /**
   * Solicita revelação dos votos (ação exclusiva do Scrum Master).
   */
  const revealVotes = useCallback((token) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'reveal',
        master_token: token || masterToken || '',
      };
      console.log('[usePokerSocket] Revelando votos:', payload);
      socketRef.current.send(JSON.stringify(payload));
    }
  }, [masterToken]);

  /**
   * Solicita limpeza dos votos da mesa (ação exclusiva do Scrum Master).
   */
  const clearVotes = useCallback((token) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'clear',
        master_token: token || masterToken || '',
      };
      console.log('[usePokerSocket] Limpando votos da mesa:', payload);
      socketRef.current.send(JSON.stringify(payload));
    }
  }, [masterToken]);

  return {
    isConnected,
    lastMessage,
    roomState,
    userId,
    sendVote,
    sendProfileUpdate,
    throwItem,
    revealVotes,
    clearVotes,
    socketRef,
  };
}

export default usePokerSocket;

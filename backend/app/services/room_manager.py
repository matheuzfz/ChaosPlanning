from collections import Counter
from dataclasses import dataclass
import re
import secrets
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, status
from pydantic import BaseModel, Field, field_validator

# Escala permitida para votação (Fibonacci simplificado)
ALLOWED_VOTES: Set[int] = {1, 2, 3, 5, 8, 13}


class InvalidVoteError(ValueError):
    """Exceção levantada quando um voto não pertence à escala permitida."""
    pass


class InvalidPinError(ValueError):
    """Exceção levantada quando o PIN informado não tem de 4 a 6 dígitos numéricos."""
    pass


class RoomNotFoundError(KeyError):
    """Exceção levantada quando uma sala não é encontrada."""
    pass


class UnauthorizedActionError(PermissionError):
    """Exceção levantada quando uma ação restrita é requisitada sem o master_token correto."""
    pass


def validate_pin(pin: str) -> str:
    """
    Valida se o PIN informado consiste estritamente em uma sequência
    de 4 a 6 dígitos numéricos.
    """
    if not isinstance(pin, str) or not re.fullmatch(r"\d{4,6}", pin):
        raise InvalidPinError("O PIN deve conter de 4 a 6 dígitos numéricos.")
    return pin


def validate_vote(vote: int) -> int:
    """
    Valida se o valor de voto pertence estritamente à escala permitida: 1, 2, 3, 5, 8 e 13.
    """
    if not isinstance(vote, int) or isinstance(vote, bool):
        raise InvalidVoteError("O voto deve ser um número inteiro.")
    if vote not in ALLOWED_VOTES:
        raise InvalidVoteError(
            f"Voto {vote} inválido. A escala permitida é: {sorted(ALLOWED_VOTES)}."
        )
    return vote


def calculate_mode(votes: List[int]) -> List[int]:
    """
    Calcula a moda estatística (valor ou valores mais frequentes) de uma lista de votos.
    Em caso de empates na maior frequência, retorna todos os valores empatados em ordem crescente.
    Se a lista for vazia, retorna uma lista vazia.
    """
    if not votes:
        return []

    counts = Counter(votes)
    max_frequency = max(counts.values())
    modes = [val for val, count in counts.items() if count == max_frequency]
    return sorted(modes)


# Modelos Pydantic para validação de dados
class CreateRoomRequest(BaseModel):
    pin: Optional[str] = Field(
        default=None,
        description="PIN numérico de segurança (4 a 6 dígitos). Se não informado, é gerado automaticamente.",
    )

    @field_validator("pin")
    @classmethod
    def check_pin(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            return validate_pin(value)
        return value


class CreateRoomResponse(BaseModel):
    room_id: str
    pin: str
    master_token: str


class WebSocketActionPayload(BaseModel):
    action: str
    vote: Optional[int] = None
    master_token: Optional[str] = None
    target_user_id: Optional[str] = None
    item: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None


@dataclass
class Participant:
    user_id: str
    user_name: str
    websocket: Optional[WebSocket] = None
    is_master: bool = False
    vote: Optional[int] = None

    def to_dict(self, reveal_vote: bool = False) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "user_name": self.user_name,
            "is_master": self.is_master,
            "has_voted": self.vote is not None,
            "vote": self.vote if reveal_vote else None,
        }


class Room:
    """
    Representa uma sala de Planning Poker efêmera mantida em memória.
    """

    def __init__(self, room_id: str, pin: str, master_token: str):
        self.room_id: str = room_id
        self.pin: str = validate_pin(pin)
        self.master_token: str = master_token
        self.participants: Dict[str, Participant] = {}
        self.votes_revealed: bool = False

    def add_participant(self, participant: Participant) -> None:
        self.participants[participant.user_id] = participant

    def remove_participant(self, user_id: str) -> Optional[Participant]:
        return self.participants.pop(user_id, None)

    def get_participant(self, user_id: str) -> Optional[Participant]:
        return self.participants.get(user_id)

    def cast_vote(self, user_id: str, vote: int) -> int:
        """Registra o voto de um usuário participante após validação estrita."""
        if user_id not in self.participants:
            raise KeyError(f"Usuário '{user_id}' não está presente na sala.")
        
        valid_vote = validate_vote(vote)
        self.participants[user_id].vote = valid_vote
        return valid_vote

    def reveal_votes(self, token: str) -> Dict[str, Any]:
        """
        Revela os votos computados e calcula a moda.
        Ação exclusiva para o portador do master_token.
        """
        if token != self.master_token:
            raise UnauthorizedActionError("Apenas o portador do master_token pode revelar os votos.")

        self.votes_revealed = True
        submitted_votes = [
            p.vote for p in self.participants.values() if p.vote is not None
        ]
        modes = calculate_mode(submitted_votes)

        return {
            "modes": modes,
            "total_votes": len(submitted_votes),
            "votes": {
                p.user_id: p.vote for p in self.participants.values() if p.vote is not None
            },
        }

    def clear_votes(self, token: str) -> None:
        """
        Limpa todos os votos da mesa para iniciar uma nova rodada.
        Ação exclusiva para o portador do master_token.
        """
        if token != self.master_token:
            raise UnauthorizedActionError("Apenas o portador do master_token pode limpar a mesa.")

        for participant in self.participants.values():
            participant.vote = None
        self.votes_revealed = False

    def get_state(self) -> Dict[str, Any]:
        """Retorna o estado serializável da sala para os clientes."""
        submitted_votes = [
            p.vote for p in self.participants.values() if p.vote is not None
        ]
        state: Dict[str, Any] = {
            "room_id": self.room_id,
            "votes_revealed": self.votes_revealed,
            "total_participants": len(self.participants),
            "total_votes": len(submitted_votes),
            "participants": [
                p.to_dict(reveal_vote=self.votes_revealed)
                for p in self.participants.values()
            ],
        }
        if self.votes_revealed:
            state["modes"] = calculate_mode(submitted_votes)
        return state


class RoomManager:
    """
    Gerenciador singleton de salas e conexões WebSocket em memória.
    """

    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create_room(self, pin: Optional[str] = None, room_id: Optional[str] = None) -> Room:
        """
        Cria uma nova sala gerando um PIN seguro caso não informado,
        além de um master_token secreto.
        """
        if pin is None:
            # PIN numérico aleatório de 6 dígitos formatado
            pin = f"{secrets.randbelow(1_000_000):06d}"
        else:
            validate_pin(pin)

        if room_id is None:
            room_id = secrets.token_hex(4)

        master_token = secrets.token_urlsafe(32)
        room = Room(room_id=room_id, pin=pin, master_token=master_token)
        self.rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> Room:
        room = self.rooms.get(room_id)
        if not room:
            raise RoomNotFoundError(f"Sala '{room_id}' não encontrada.")
        return room

    async def connect_user(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
        user_name: str,
        pin: str,
        master_token: Optional[str] = None,
    ) -> Participant:
        """
        Autentica o PIN da sala, estabelece conexão WebSocket e registra o usuário.
        """
        room = self.get_room(room_id)

        if room.pin != pin:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="PIN de segurança incorreto.",
            )
            raise InvalidPinError("PIN de segurança incorreto.")

        await websocket.accept()

        is_master = bool(master_token and master_token == room.master_token)
        participant = Participant(
            user_id=user_id,
            user_name=user_name,
            websocket=websocket,
            is_master=is_master,
        )
        room.add_participant(participant)

        # Envia estado inicial ao participante recém-conectado
        await websocket.send_json({
            "event": "connected",
            "user_id": user_id,
            "is_master": is_master,
            "room_state": room.get_state(),
        })

        # Notifica os demais participantes sobre a entrada
        await self.broadcast(
            room_id=room_id,
            message={
                "event": "user_joined",
                "user": participant.to_dict(reveal_vote=room.votes_revealed),
                "room_state": room.get_state(),
            },
            exclude_user_id=user_id,
        )

        return participant

    async def disconnect_user(self, room_id: str, user_id: str) -> None:
        """Remove o usuário e notifica os restantes."""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            participant = room.remove_participant(user_id)
            if participant:
                await self.broadcast(
                    room_id=room_id,
                    message={
                        "event": "user_left",
                        "user_id": user_id,
                        "user_name": participant.user_name,
                        "room_state": room.get_state(),
                    },
                )

    async def broadcast(
        self,
        room_id: str,
        message: Dict[str, Any],
        exclude_user_id: Optional[str] = None,
    ) -> None:
        """Envia mensagem serializada para todos os participantes conectados na sala."""
        room = self.get_room(room_id)
        broken_connections: List[str] = []

        for p in list(room.participants.values()):
            if exclude_user_id and p.user_id == exclude_user_id:
                continue
            if p.websocket:
                try:
                    await p.websocket.send_json(message)
                except Exception:
                    broken_connections.append(p.user_id)

        for broken_user_id in broken_connections:
            await self.disconnect_user(room_id, broken_user_id)

    async def cast_vote(self, room_id: str, user_id: str, vote: int) -> None:
        """Registra o voto e transmite a atualização de estado (sem revelar valor)."""
        room = self.get_room(room_id)
        room.cast_vote(user_id, vote)
        await self.broadcast(
            room_id=room_id,
            message={
                "event": "vote_cast",
                "user_id": user_id,
                "has_voted": True,
                "room_state": room.get_state(),
            },
        )

    async def reveal_votes(self, room_id: str, master_token: str) -> Dict[str, Any]:
        """Revela os votos para todos os participantes na sala e publica a moda calculada."""
        room = self.get_room(room_id)
        results = room.reveal_votes(master_token)
        await self.broadcast(
            room_id=room_id,
            message={
                "event": "votes_revealed",
                "results": results,
                "room_state": room.get_state(),
            },
        )
        return results

    async def clear_votes(self, room_id: str, master_token: str) -> None:
        """Limpa a mesa e notifica os clientes para uma nova rodada de votação."""
        room = self.get_room(room_id)
        room.clear_votes(master_token)
        await self.broadcast(
            room_id=room_id,
            message={
                "event": "votes_cleared",
                "room_state": room.get_state(),
            },
        )

    async def throw_item(
        self,
        room_id: str,
        from_user_id: str,
        target_user_id: str,
        item: str,
    ) -> Dict[str, Any]:
        """
        Roteia o evento customizado 'throw_item', onde o usuário A arremessa um item no usuário B.
        """
        room = self.get_room(room_id)
        sender = room.get_participant(from_user_id)
        target = room.get_participant(target_user_id)

        if not sender:
            raise KeyError(f"Usuário remetente '{from_user_id}' não encontrado na sala.")
        if not target:
            raise KeyError(f"Usuário destinatário '{target_user_id}' não encontrado na sala.")

        event_payload = {
            "event": "throw_item",
            "from_user_id": sender.user_id,
            "from_user_name": sender.user_name,
            "target_user_id": target.user_id,
            "target_user_name": target.user_name,
            "item": item,
        }
        await self.broadcast(room_id=room_id, message=event_payload)
        return event_payload

    async def route_custom_event(
        self,
        room_id: str,
        from_user_id: str,
        event_name: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Roteador genérico para eventos customizados da sala.
        """
        room = self.get_room(room_id)
        sender = room.get_participant(from_user_id)
        if not sender:
            raise KeyError(f"Usuário '{from_user_id}' não encontrado.")

        payload = {
            "event": event_name,
            "from_user_id": sender.user_id,
            "from_user_name": sender.user_name,
            "data": data,
        }
        await self.broadcast(room_id=room_id, message=payload)
        return payload

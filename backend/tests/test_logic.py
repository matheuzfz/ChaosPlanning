import pytest

try:
    from app.services.room_manager import (
        ALLOWED_VOTES,
        InvalidPinError,
        InvalidVoteError,
        Participant,
        Room,
        RoomManager,
        UnauthorizedActionError,
        calculate_mode,
        validate_pin,
        validate_vote,
    )
except ModuleNotFoundError:
    from backend.app.services.room_manager import (  # type: ignore
        ALLOWED_VOTES,
        InvalidPinError,
        InvalidVoteError,
        Participant,
        Room,
        RoomManager,
        UnauthorizedActionError,
        calculate_mode,
        validate_pin,
        validate_vote,
    )



# =====================================================================
# Testes do cálculo estatístico da moda (calculate_mode)
# =====================================================================

def test_calculate_mode_empty_list():
    """Valida se uma lista vazia de votos retorna lista vazia."""
    assert calculate_mode([]) == []


def test_calculate_mode_single_vote():
    """Valida a moda quando apenas um voto foi registrado."""
    assert calculate_mode([5]) == [5]


def test_calculate_mode_unique_mode():
    """Valida se a função identifica a moda única com maior frequência."""
    # 3 aparece duas vezes; os demais, uma vez
    assert calculate_mode([1, 2, 3, 3, 5]) == [3]
    # 8 aparece três vezes; 13 aparece duas vezes
    assert calculate_mode([8, 13, 8, 8, 13]) == [8]


def test_calculate_mode_bimodal_tie():
    """Valida o tratamento de empates com duas modas (bimodal)."""
    # 1 e 2 aparecem duas vezes cada; 5 aparece uma vez
    assert calculate_mode([1, 1, 2, 2, 5]) == [1, 2]
    # Ordem dos votos na entrada não deve afetar a lista ordenada de saída
    assert calculate_mode([5, 8, 5, 8, 3]) == [5, 8]


def test_calculate_mode_multimodal_tie():
    """Valida o tratamento de empates quando todos os votos possuem a mesma frequência."""
    all_scale_votes = [1, 2, 3, 5, 8, 13]
    assert calculate_mode(all_scale_votes) == [1, 2, 3, 5, 8, 13]


def test_calculate_mode_triple_tie_with_lower_frequencies():
    """Valida o desempate considerando apenas a frequência máxima."""
    # 3, 5 e 8 aparecem duas vezes; 1 e 13 aparecem uma vez
    votes = [3, 1, 5, 8, 3, 5, 8, 13]
    assert calculate_mode(votes) == [3, 5, 8]


# =====================================================================
# Testes de validação de escala de votos (1, 2, 3, 5, 8, 13)
# =====================================================================

def test_valid_votes_accepted():
    """Garante que todos os votos estritamente na escala Fibonacci permitida são aceitos."""
    expected_allowed = {1, 2, 3, 5, 8, 13}
    assert ALLOWED_VOTES == expected_allowed

    for valid_vote in expected_allowed:
        assert validate_vote(valid_vote) == valid_vote


@pytest.mark.parametrize("invalid_vote", [0, 4, 6, 7, 9, 10, 11, 12, 14, 20, 100, -1, -5])
def test_invalid_integer_votes_rejected(invalid_vote: int):
    """Garante que qualquer número inteiro fora da escala (1, 2, 3, 5, 8, 13) é rejeitado."""
    with pytest.raises(InvalidVoteError) as exc_info:
        validate_vote(invalid_vote)
    assert f"Voto {invalid_vote} inválido" in str(exc_info.value)


@pytest.mark.parametrize("invalid_type_vote", ["5", 5.0, None, True, False, []])
def test_invalid_types_rejected(invalid_type_vote):
    """Garante que tipos diferentes de int ou booleanos são rejeitados."""
    with pytest.raises(InvalidVoteError):
        validate_vote(invalid_type_vote)  # type: ignore


def test_room_cast_vote_rejects_out_of_scale():
    """Valida se a sala rejeita o registro de um voto fora da escala."""
    room = Room(room_id="room-123", pin="1234", master_token="secret-token")
    user = Participant(user_id="user-1", user_name="Alice")
    room.add_participant(user)

    # Voto válido
    room.cast_vote("user-1", 5)
    assert user.vote == 5

    # Voto inválido (fora da escala)
    with pytest.raises(InvalidVoteError):
        room.cast_vote("user-1", 4)

    # O voto deve permanecer o anterior válido
    assert user.vote == 5


# =====================================================================
# Testes de regras de negócio: Master Token e Limpeza / Revelação
# =====================================================================

def test_master_token_security_and_reveal():
    """Valida se apenas o portador do master_token pode revelar votos e se a moda é computada."""
    room = Room(room_id="room-poker", pin="9876", master_token="correct-master-token")
    alice = Participant(user_id="alice", user_name="Alice")
    bob = Participant(user_id="bob", user_name="Bob")
    charlie = Participant(user_id="charlie", user_name="Charlie")

    room.add_participant(alice)
    room.add_participant(bob)
    room.add_participant(charlie)

    room.cast_vote("alice", 5)
    room.cast_vote("bob", 5)
    room.cast_vote("charlie", 8)

    # Tentativa de revelação com token incorreto
    with pytest.raises(UnauthorizedActionError):
        room.reveal_votes(token="wrong-token")

    assert room.votes_revealed is False

    # Revelação com master_token correto
    results = room.reveal_votes(token="correct-master-token")
    assert room.votes_revealed is True
    assert results["total_votes"] == 3
    assert results["modes"] == [5]
    assert results["votes"] == {"alice": 5, "bob": 5, "charlie": 8}


def test_master_token_clear_votes():
    """Valida se apenas o mestre pode limpar os votos e reiniciar a mesa."""
    room = Room(room_id="room-poker", pin="9876", master_token="correct-master-token")
    alice = Participant(user_id="alice", user_name="Alice")
    room.add_participant(alice)
    room.cast_vote("alice", 13)

    # Tentativa com token incorreto
    with pytest.raises(UnauthorizedActionError):
        room.clear_votes(token="wrong-token")

    assert alice.vote == 13

    # Limpeza com master_token correto
    room.clear_votes(token="correct-master-token")
    assert alice.vote is None
    assert room.votes_revealed is False


# =====================================================================
# Testes de validação de PIN de segurança (4 a 6 dígitos)
# =====================================================================

@pytest.mark.parametrize("valid_pin", ["1234", "0000", "99999", "123456", "054321"])
def test_valid_pins(valid_pin: str):
    """Garante a validação de PINs com 4, 5 ou 6 dígitos numéricos."""
    assert validate_pin(valid_pin) == valid_pin


@pytest.mark.parametrize("invalid_pin", ["123", "1234567", "abcd", "12a4", "12 34", "", "12345678"])
def test_invalid_pins(invalid_pin: str):
    """Garante a rejeição de PINs fora do padrão (tamanho != 4..6 ou caracteres não numéricos)."""
    with pytest.raises(InvalidPinError):
        validate_pin(invalid_pin)


# =====================================================================
# Testes do RoomManager
# =====================================================================

def test_room_manager_create_room():
    """Valida a criação de sala, geração automática de PIN e master_token seguro."""
    manager = RoomManager()
    room = manager.create_room()

    assert len(room.pin) in (4, 5, 6)
    assert room.pin.isdigit()
    assert len(room.master_token) > 20
    assert manager.get_room(room.room_id) == room


# =====================================================================
# Testes de roteamento de eventos customizados (throw_item)
# =====================================================================

@pytest.mark.anyio
async def test_throw_item_event_routing():
    """Valida o roteamento do evento throw_item entre dois usuários."""
    manager = RoomManager()
    room = manager.create_room(pin="1234")
    alice = Participant(user_id="user-a", user_name="Alice")
    bob = Participant(user_id="user-b", user_name="Bob")
    room.add_participant(alice)
    room.add_participant(bob)

    event = await manager.throw_item(
        room_id=room.room_id,
        from_user_id="user-a",
        target_user_id="user-b",
        item="tomato",
    )
    assert event["event"] == "throw_item"
    assert event["from_user_id"] == "user-a"
    assert event["from_user_name"] == "Alice"
    assert event["target_user_id"] == "user-b"
    assert event["target_user_name"] == "Bob"
    assert event["item"] == "tomato"


@pytest.mark.anyio
async def test_throw_item_target_not_found():
    """Valida que o evento falha se o usuário de destino não estiver na sala."""
    manager = RoomManager()
    room = manager.create_room(pin="1234")
    alice = Participant(user_id="user-a", user_name="Alice")
    room.add_participant(alice)

    with pytest.raises(KeyError):
        await manager.throw_item(
            room_id=room.room_id,
            from_user_id="user-a",
            target_user_id="ghost",
            item="banana",
        )


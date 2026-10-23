from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

try:
    from app.services.room_manager import (
        CreateRoomResponse,
        InvalidVoteError,
        RoomManager,
        RoomNotFoundError,
        UnauthorizedActionError,
        WebSocketActionPayload,
    )
except ModuleNotFoundError:
    from backend.app.services.room_manager import (  # type: ignore
        CreateRoomResponse,
        InvalidVoteError,
        RoomManager,
        RoomNotFoundError,
        UnauthorizedActionError,
        WebSocketActionPayload,
    )


room_manager = RoomManager()

app = FastAPI(
    title="ScrumBrawl API",
    description="Servidor em tempo real para Planning Poker ScrumBrawl utilizando WebSockets e estado em memória.",
    version="1.0.0",
)

# Habilita CORS para futura integração com o frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Endpoint de verificação de integridade do serviço."""
    return {"status": "ok", "app": "ScrumBrawl"}


@app.post(
    "/api/rooms",
    response_model=CreateRoomResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rooms"],
)
async def create_room() -> CreateRoomResponse:
    """
    Cria uma nova sala de Planning Poker com ID único curto.
    Retorna o identificador da sala e o master_token confidencial do Scrum Master.
    """
    room = room_manager.create_room()
    return CreateRoomResponse(
        room_id=room.room_id,
        master_token=room.master_token,
    )


@app.get("/api/rooms/{room_id}", tags=["Rooms"])
async def get_room_state(room_id: str) -> Dict[str, Any]:
    """Retorna o estado público atual da sala."""
    try:
        room = room_manager.get_room(room_id)
        return room.get_state()
    except RoomNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sala '{room_id}' não encontrada.",
        )


@app.websocket("/ws/{room_id}")
async def websocket_room_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str = Query(..., description="ID identificador único do usuário"),
    user_name: str = Query(..., description="Nome de exibição do usuário"),
    master_token: Optional[str] = Query(default=None, description="Token de mestre da sala (opcional)"),
) -> None:
    """
    Ponto de conexão WebSocket para participantes da sala de Planning Poker.
    Suporta ações de voto, revelação, limpeza e eventos customizados (como throw_item).
    """
    try:
        await room_manager.connect_user(
            websocket=websocket,
            room_id=room_id,
            user_id=user_id,
            user_name=user_name,
            master_token=master_token,
        )
    except RoomNotFoundError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Sala não encontrada.")
        return
    except Exception as exc:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(exc))
        return

    try:
        while True:
            data = await websocket.receive_json()
            try:
                payload = WebSocketActionPayload.model_validate(data)
                action = payload.action

                if action == "vote":
                    if payload.vote is None:
                        raise ValueError("O campo 'vote' é obrigatório para registrar voto.")
                    await room_manager.cast_vote(
                        room_id=room_id,
                        user_id=user_id,
                        vote=payload.vote,
                    )

                elif action == "reveal":
                    effective_token = payload.master_token or master_token or ""
                    await room_manager.reveal_votes(
                        room_id=room_id,
                        master_token=effective_token,
                    )

                elif action == "clear":
                    effective_token = payload.master_token or master_token or ""
                    await room_manager.clear_votes(
                        room_id=room_id,
                        master_token=effective_token,
                    )

                elif action == "throw_item":
                    if not payload.target_user_id or not payload.item:
                        raise ValueError(
                            "Os campos 'target_user_id' e 'item' são obrigatórios para a ação 'throw_item'."
                        )
                    await room_manager.throw_item(
                        room_id=room_id,
                        from_user_id=user_id,
                        target_user_id=payload.target_user_id,
                        item=payload.item,
                    )

                elif action == "update_profile":
                    await room_manager.update_profile(
                        room_id=room_id,
                        user_id=user_id,
                        user_name=payload.user_name,
                        avatar=payload.avatar,
                    )

                elif action == "custom_event":
                    event_name = (payload.custom_data or {}).get("name", "custom_event")
                    await room_manager.route_custom_event(
                        room_id=room_id,
                        from_user_id=user_id,
                        event_name=event_name,
                        data=payload.custom_data or {},
                    )

                else:
                    await websocket.send_json({
                        "event": "error",
                        "message": f"Ação não reconhecida: '{action}'.",
                    })

            except (ValidationError, ValueError, KeyError) as err:
                await websocket.send_json({"event": "error", "message": str(err)})
            except UnauthorizedActionError as err:
                await websocket.send_json({
                    "event": "error",
                    "message": str(err),
                    "unauthorized": True,
                })
            except Exception as err:
                await websocket.send_json({
                    "event": "error",
                    "message": f"Erro interno ao processar ação: {str(err)}",
                })

    except WebSocketDisconnect:
        await room_manager.disconnect_user(room_id=room_id, user_id=user_id, websocket=websocket)


# ---------------------------------------------------------------------------
# Frontend estático (build do React) + fallback SPA
# O diretório 'static' só existe na imagem Docker (ou após copiar o build).
# ---------------------------------------------------------------------------
STATIC_DIR = Path("static")

if STATIC_DIR.is_dir():

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        """Serve arquivos do build quando existirem; caso contrário devolve o index.html (React Router)."""
        if full_path.startswith(("api/", "ws/")):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        base = STATIC_DIR.resolve()
        candidate = (base / full_path).resolve()
        if candidate.is_file() and base in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(base / "index.html")

    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

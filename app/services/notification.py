from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.admin_connections: list[WebSocket] = []
        self.customer_connections: dict[int, list[WebSocket]] = defaultdict(list)
        self.worker_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect_admin(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.admin_connections.append(websocket)

    async def connect_customer(self, customer_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.customer_connections[customer_id].append(websocket)

    async def connect_worker(self, worker_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.worker_connections[worker_id].append(websocket)

    def disconnect_admin(self, websocket: WebSocket) -> None:
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    def disconnect_customer(self, customer_id: int, websocket: WebSocket) -> None:
        if websocket in self.customer_connections[customer_id]:
            self.customer_connections[customer_id].remove(websocket)

    def disconnect_worker(self, worker_id: int, websocket: WebSocket) -> None:
        if websocket in self.worker_connections[worker_id]:
            self.worker_connections[worker_id].remove(websocket)

    async def broadcast_admin(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.admin_connections:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_admin(ws)

    async def notify_customer(self, customer_id: int, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.customer_connections[customer_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_customer(customer_id, ws)

    async def notify_worker(self, worker_id: int, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.worker_connections[worker_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_worker(worker_id, ws)


connection_manager = ConnectionManager()


async def send_high_priority_alert(user_id: int, message: str) -> dict[str, str]:
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials, messaging  # type: ignore

        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.ApplicationDefault())
        return {"status": "configured", "message": message, "user_id": str(user_id)}
    except Exception:
        return {"status": "simulated", "message": message, "user_id": str(user_id)}

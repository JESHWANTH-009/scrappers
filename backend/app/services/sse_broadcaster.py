import asyncio
import json
from typing import AsyncGenerator, Dict, List
from app.models.schemas import CrawlEvent

class SSEBroadcaster:
    def __init__(self):
        # Maps job_id to list of asyncio.Queue
        self._listeners: Dict[str, List[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, job_id: str) -> AsyncGenerator[str, None]:
        """Subscribes to live SSE events for a specific job."""
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            if job_id not in self._listeners:
                self._listeners[job_id] = []
            self._listeners[job_id].append(queue)

        try:
            # Send initial keepalive / connection notice
            yield f"event: connected\ndata: {json.dumps({'job_id': job_id, 'message': 'SSE stream established'})}\n\n"
            while True:
                # Wait for next event or heartbeat
                try:
                    event: CrawlEvent = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: {event.event_type}\ndata: {json.dumps(event.data)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep HTTP connection alive
                    yield ": ping\n\n"
        finally:
            async with self._lock:
                if job_id in self._listeners:
                    if queue in self._listeners[job_id]:
                        self._listeners[job_id].remove(queue)
                    if not self._listeners[job_id]:
                        del self._listeners[job_id]

    async def broadcast(self, job_id: str, event_type: str, data: dict):
        """Broadcasts an event to all active listeners for the job."""
        event = CrawlEvent(event_type=event_type, job_id=job_id, data=data)
        async with self._lock:
            queues = self._listeners.get(job_id, []).copy()

        for q in queues:
            try:
                q.put_nowait(event)
            except Exception:
                pass

sse_broadcaster = SSEBroadcaster()

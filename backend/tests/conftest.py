import pytest
import pytest_asyncio
from app.services.job_store import job_store

@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    await job_store.init_db()
    yield

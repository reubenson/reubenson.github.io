"""
Local FastAPI server — exposes plot.py to the webapp over HTTP.

Endpoints:
    POST /plot          body: job JSON  →  {"job_id": "<uuid>"}
    GET  /status/<id>   →  {"state": "running|done|error", "log": [...]}
    POST /stop          →  aborts the current job (raises KeyboardInterrupt in worker)

Run:
    uvicorn server:app --reload --port 8765

The webapp (11ty dev server on :8080) calls this at http://localhost:8765.
CORS is open to localhost only.
"""

import io
import sys
import threading
import uuid
from contextlib import redirect_stdout, redirect_stderr

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import plot as plotter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# In-memory job registry — fine for a single-user local tool.
_jobs: dict[str, dict] = {}
_current_thread: threading.Thread | None = None


def _run_job(job_id: str, job_dict: dict, dry_run: bool):
    buf = io.StringIO()
    _jobs[job_id]["state"] = "running"
    original_load = plotter.load_job
    try:
        # plot() expects a file path; we inject the dict via a monkey-patch
        # on load_job so we never touch the filesystem.
        plotter.load_job = lambda _path: job_dict
        with redirect_stdout(buf), redirect_stderr(buf):
            plotter.plot("_inline_", dry_run=dry_run)
        _jobs[job_id]["state"] = "done"
    except BaseException as exc:
        # Catch SystemExit (from sys.exit() calls in plot.py) in addition to
        # regular exceptions so the job state is always updated.
        _jobs[job_id]["state"] = "error"
        buf.write(f"\nERROR: {type(exc).__name__}: {exc}")
    finally:
        plotter.load_job = original_load
        _jobs[job_id]["log"] = buf.getvalue().splitlines()


@app.post("/plot")
async def start_plot(body: dict, dry_run: bool = False):
    global _current_thread
    if _current_thread and _current_thread.is_alive():
        raise HTTPException(409, "A job is already running")

    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"state": "queued", "log": []}
    _current_thread = threading.Thread(
        target=_run_job, args=(job_id, body, dry_run), daemon=True
    )
    _current_thread.start()
    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Unknown job")
    return _jobs[job_id]


@app.post("/stop")
async def stop():
    """Best-effort abort: raises KeyboardInterrupt in the worker thread."""
    if _current_thread and _current_thread.is_alive():
        import ctypes
        ctypes.pythonapi.PyThreadState_SetAsyncExc(
            ctypes.c_ulong(_current_thread.ident),
            ctypes.py_object(KeyboardInterrupt),
        )
        return {"status": "stop signal sent"}
    return {"status": "no job running"}

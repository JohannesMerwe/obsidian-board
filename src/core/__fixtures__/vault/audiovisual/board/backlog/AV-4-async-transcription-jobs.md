# AV-4 — Async transcription jobs

**Status:** Backlog — drafted 2026-08-26 (surfaced holding a 2.3 min HTTP request open)
**Repo:** `pangolin-audiovisual`, `pangolin-queue`
**Area:** `app/api/transcribe` — request/response model

---

## Context

`/api/transcribe` is synchronous: the client holds the connection open for the whole
inference. On 2026-08-26 a 14m20s recording held the request for **2.3 minutes** and
returned 200 — it works, but the model does not scale in the obvious directions:

- An hour-long meeting is ~10 min on `whisper-base` — past most proxy and browser
  idle timeouts, and unpleasant even when it succeeds
- Raising the model tier ([AV-2](AV-2-configurable-model-tier.md)) multiplies that
- A batch sweep ([AV-1](AV-1-plaud-ingest-pipeline.md)) serialises behind one
  in-flight request with no visibility into progress
- A dropped connection loses the whole run — nothing is resumable

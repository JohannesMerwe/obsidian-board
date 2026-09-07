# audiovisual — Board

> Card ids: `AV-N` — until 2026-09-07 these were `SERV-N` under `services/`; same numbers, renamed when audiovisual became a product project. One card per file; move the file between `backlog/ · wip/ ·
> done/{year}/` as it progresses, then update this table — and run
> `owe board check` has no successor yet (keel D-19).
> Created 2026-08-11. First cards added 2026-08-26 from the `pangolin-audiovisual`
> run — see [`../INDEX.md`](../INDEX.md) for the thesis they share.

## WIP

| Doc | Summary | Updated |
|---|---|---|
| _none_ | — | — |

## Backlog

| Doc | Summary | Updated |
|---|---|---|
| [AV-6-source-agnostic-ingest](backlog/AV-6-source-agnostic-ingest.md) | **Architectural.** The recorder is an implementation detail — mics are commodity and the value sits in the transcription platform. Define one normalised record + adapter interface so any audio source works (Plaud, phone memo, laptop mic, room array, Zoom export), with Plaud demoted to the first adapter. Multi-channel input designed in from the start: channel-per-speaker is the cheapest speaker attribution there is | 2026-08-26 |

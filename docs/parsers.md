# Document parsers

Uploaded materials are parsed into elements (text, titles, tables, images with
their page coordinates) before they are chunked and embedded. Kiwi can use one
of two parsers, selected with `PARSER` in `kiwi/.env`:

| `PARSER` | Service | Needs |
|---|---|---|
| `xberg` (default) | [Xberg](https://github.com/xberg-io/xberg) | `XBERG_API_URL` |
| `unstructured` | [Unstructured API](https://github.com/Unstructured-IO/unstructured-api) | `UNSTRUCTURED_API_URL` |

Xberg is the default: `kiwi/compose.yml` runs it, `.env.example` points at it,
and the backend uses it when `PARSER` is not set. The backend refuses to start
if the URL for the chosen parser is missing.

## Xberg

One image of about 1.1 GB with the layout, table and OCR models baked in. It
starts with the rest of the stack (`docker compose up -d`, from `kiwi/`).

```bash
PARSER=xberg
XBERG_API_URL=http://localhost:8002
```

`XBERG_PORT` changes the host port. If the backend itself runs inside the
compose network, use `http://xberg:8000` instead.

Optional settings, defaults shown:

| Variable | Default | Where | Meaning |
|---|---|---|---|
| `XBERG_CPUS` | `4` | compose | CPU limit for the container |
| `XBERG_MAX_CONCURRENT` | `4` | compose | Parallel extractions; keep equal to `XBERG_CPUS` |
| `XBERG_MEMORY` | `6g` | compose | Memory limit |
| `XBERG_JOB_TIMEOUT_SECS` | `1200` | compose | Server-side limit per extraction |
| `XBERG_EXTRACTION_TIMEOUT_SECS` | `1200` | `kiwi/.env` | Time limit Kiwi sends with each extraction; Kiwi gives up 30 s after it. Keep `XBERG_JOB_TIMEOUT_SECS` no higher |
| `XBERG_MAX_CHARACTERS` | `1024` | `kiwi/.env` | Maximum chunk size |
| `XBERG_CHUNK_OVERLAP` | `128` | `kiwi/.env` | Overlap between chunks |

Things to know:

- The image is pinned to `1.2.3`, which is also the minimum. Annotation
  highlights need the per-page coordinate frames that older versions don't
  report; without them highlights silently disappear.
- The `xberg-cache` volume must stay a named volume. Docker seeds it from the
  models inside the image; a bind mount hides them and forces a download.
- The Xberg API has no authentication. The compose file binds it to
  127.0.0.1; never publish it or put it behind a public proxy.
- Each extraction loads its models into memory. Raising
  `XBERG_MAX_CONCURRENT` above the CPU limit runs the container out of memory
  rather than making it faster.

## Unstructured

A larger image. The `unstructured` service is in `kiwi/compose.yml`, commented
out. Uncomment it, run `docker compose up -d`, and point Kiwi at it:

```bash
PARSER=unstructured
UNSTRUCTURED_API_URL=http://localhost:9500
```

You can then stop Xberg with `docker compose stop xberg`, or comment it out
too.

## Switching parsers

Changing `PARSER` affects new uploads only. Existing documents keep the
elements they were parsed into; reprocess a document to parse it again with the
new parser. Reprocessing gives its elements new ids, so annotations made on
the old elements do not carry over. To go back, set the previous `PARSER` and
restart the backend.

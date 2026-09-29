# Object storage

Kiwi keeps uploaded files (course PDFs, images) in an S3-compatible bucket,
through `kiwi/src/common/storage/storage.service.ts`.

## Configuration

| Variable | Meaning |
|---|---|
| `OSS_VENDOR` | `rustfs` or `minio`: self-hosted, uses `OSS_ENDPOINT` with path-style URLs. Anything else (e.g. `s3`): AWS S3, `OSS_ENDPOINT` ignored. |
| `OSS_ENDPOINT` | Self-hosted only. Also the host in every signed URL, so it must be reachable **from users' browsers**, not just from the app. |
| `OSS_BUCKET`, `OSS_REGION` | Bucket name and region (`us-east-1` for self-hosted). |
| `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET` | Credentials; for RustFS/MinIO these are the server's root keys. |

`minio` and `rustfs` behave identically in the code. `minio` stays accepted
because existing deployments' `.env` files say so; it works against a RustFS
server too.

Locally, `docker compose up -d` (from `kiwi/`) starts RustFS, and the one-shot
`oss-init` service creates the `kiwi` bucket and its CORS policy (see
[kiwi/README.md](../kiwi/README.md#local-object-storage)).

## CORS is required

The frontend fetches files straight from signed URLs (the PDF viewer uses
`fetch` with `Range` requests), and the bucket is on a different origin from the
frontend. The browser therefore needs CORS headers on those responses.

- **MinIO** sends CORS headers by default, so this was never configured.
- **RustFS** sends none until the bucket has a CORS policy. Without it, files
  still download fine with curl or from Node, but in the browser every PDF fails
  with *"No 'Access-Control-Allow-Origin' header"* (seen as `206` +
  `net::ERR_FAILED`).

The policy Kiwi uses (the signed URL is the access control, so any origin is
allowed; the browser only reads):

```json
{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],
  "ExposeHeaders":["Content-Range","Accept-Ranges","Content-Length","Content-Type","Content-Disposition","ETag","Last-Modified"],
  "MaxAgeSeconds":3600}]}
```

Apply it with `aws s3api put-bucket-cors --bucket <bucket> --cors-configuration '<json>'`
and check it with `get-bucket-cors`.

**Test like a browser.** A storage check is only meaningful with an `Origin`
header: a preflight (`OPTIONS` with `Access-Control-Request-Method: GET` and
`Access-Control-Request-Headers: range`) and a signed `GET` with `Range`. Expect
`206`, `Access-Control-Allow-Origin`, and `Content-Range` in
`Access-Control-Expose-Headers`.

## Local dev: bringing files over from MinIO

Switching to RustFS leaves the old `oss-data` volume untouched. Once
`docker compose up -d` has replaced the MinIO container (never run two MinIO
servers on one volume), start the old MinIO on another port and copy bucket to
bucket. The volume keeps its compose-project prefix, `kiwi_oss-data` when you
run compose from `kiwi/`; `docker volume ls` shows the exact name.

```bash
docker run -d --rm --name minio-old -p 127.0.0.1:19000:9000 -v kiwi_oss-data:/data \
  -e MINIO_ACCESS_KEY=kiwi -e MINIO_SECRET_KEY=kiwikiwi \
  minio/minio:RELEASE.2024-12-18T13-15-44Z server /data
docker run --rm rclone/rclone:1.71 copy --metadata \
  ':s3,provider=Minio,endpoint="http://host.docker.internal:19000",access_key_id=kiwi,secret_access_key=kiwikiwi:kiwi' \
  ':s3,provider=Other,endpoint="http://host.docker.internal:9000",access_key_id=kiwi,secret_access_key=kiwikiwi,force_path_style=true:kiwi'
docker stop minio-old
```

## Moving a self-hosted deployment from MinIO to RustFS

Run RustFS next to MinIO, copy, test, then switch the proxy. MinIO keeps its
data throughout, so rollback is a one-line proxy change.

1. **Back up** the deployment's compose files and proxy config.
2. **Start RustFS alongside MinIO** on the same Docker network, with its own
   volume, the **same keys the app uses** (`RUSTFS_ACCESS_KEY` /
   `RUSTFS_SECRET_KEY`), `RUSTFS_VOLUMES=/data`, the console off, and no
   published ports. Take the keys from the app's environment rather than
   copying them into files; in compose, interpolate `${OSS_ACCESS_KEY_ID}` /
   `${OSS_ACCESS_KEY_SECRET}` from `.env`.
3. **Copy the bucket** with `rclone copy --metadata old:<bucket> new:<bucket>`
   (S3 remotes pointed at `http://minio:9000` and `http://rustfs:9000`). Copy
   bucket to bucket: object keys have no extensions, so going through a local
   folder loses each object's `Content-Type`.
4. **Verify the copy**: `rclone check old: new: --download` (byte compare; plain
   `check` can't hash multipart objects) and compare `MimeType`s from
   `rclone lsjson -R`.
5. **Apply the CORS policy** above to the RustFS bucket.
6. **Test RustFS before any traffic reaches it**, from inside the app container
   with the app's keys: write / read / delete; a signed URL for the public host
   sent to RustFS with that `Host` header (what the proxy will send); the
   browser-style CORS checks above; and that a tampered signature, anonymous
   access and a wrong key all get `403`.
7. **Switch the proxy** for the storage hostname from MinIO to RustFS (for Caddy:
   `reverse_proxy rustfs:9000` with `header_up Host {host}`, then
   `caddy reload`). If the app's `OSS_ENDPOINT` is that public hostname, this one
   line moves both the app and signed URLs.
8. **Catch up**: run the `rclone copy` again for anything uploaded to MinIO
   between step 3 and the switch.
9. **Check in a real browser** that a PDF opens, then keep MinIO stopped but not
   deleted for a while. Rollback: point the proxy back at MinIO and copy
   anything uploaded to RustFS since the switch back with `rclone copy`.

`OSS_VENDOR` can stay `minio` after the move.

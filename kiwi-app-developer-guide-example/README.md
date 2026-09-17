# Kiwi App examples

Documentation and a working example for developers building Kiwi Apps. A Kiwi
App is a web page you host yourself that Kiwi shows in an iframe.

| File | What it is |
| --- | --- |
| [KIWI_APP_DEVELOPER_GUIDE.md](./KIWI_APP_DEVELOPER_GUIDE.md) | The main guide: concepts, registration, bridge protocol, scopes and troubleshooting. |
| [hello-kiwi-app/](./hello-kiwi-app/) | An example app in a single HTML file, plus `register.sh`. |
| [kiwi-app-sdk/kiwi-app-sdk.js](./kiwi-app-sdk/kiwi-app-sdk.js) | A copy of the SDK's single-file build, which the example loads. |
| [AGENTS.md](./AGENTS.md) | Rules for coding agents working in this folder. |
| [SDK README](../kiwi-app-sdk/README.md) | The `@maps-research/kiwi-app-sdk` API. |
| [BRIDGE-OPS.md](../kiwi-app-sdk/BRIDGE-OPS.md) | The data ops an app can call. |

To run the example without a Kiwi backend, run these commands from the
repository root:

```bash
cd kiwi-app-developer-guide-example
python3 -m http.server 8000
# open http://localhost:8000/hello-kiwi-app/
```

To run the example inside Kiwi, see
[hello-kiwi-app/README.md](./hello-kiwi-app/README.md).

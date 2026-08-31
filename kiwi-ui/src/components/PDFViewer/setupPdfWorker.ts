import { pdfjs } from "react-pdf";
// Vite resolves this `?url` import to the bundled worker asset URL at build
// time, pointing react-pdf's pdf.js (v5) at its MATCHING worker. This avoids the
// version-mismatch / "fake worker" fallback that occurs with bare-specifier
// `new URL(..., import.meta.url)` resolution under Vite.
// Explicitly target react-pdf's NESTED pdfjs-dist (v5): the hoisted top-level
// `pdfjs-dist` is v3 (used by the legacy @react-pdf-viewer screens), and loading
// its worker against react-pdf's v5 engine causes a version-mismatch failure.
import workerUrl from "react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url";

// NOTE: separate from the legacy `/assets/pdf.worker.min.js` (pdfjs v3) used by
// the remaining @react-pdf-viewer screens.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

import { pdfjs } from "react-pdf";
// Vite resolves the worker from React PDF's own dependency, keeping the
// rendering engine and bundled worker on exactly the same version.
import workerUrl from "/@react-pdf-worker?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

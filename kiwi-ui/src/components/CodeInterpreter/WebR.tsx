import { WebR } from 'webr';

// Pin WebR version to match package.json dependency for deterministic builds
const WEBR_VERSION = '0.6.0'; // Keep this in sync with package.json webr version

let webrInstance: WebR | null = null;
let webrReady = false;
let initPromise: Promise<WebR> | null = null;

const initWebR = async () => {
  if (webrInstance && webrReady) {
    return webrInstance;
  }
  
  // Prevent multiple simultaneous initializations
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      webrInstance = new WebR({
        baseUrl: `https://cdn.jsdelivr.net/npm/webr@${WEBR_VERSION}/dist/`,
      });
      await webrInstance.init();
      // Keep first-time loading visible slightly longer (helps UX on slow starts)
      await new Promise((res) => setTimeout(res, 1000));
      webrReady = true;
      return webrInstance;
    } catch (error) {
      console.error("Failed to initialize WebR:", error);
      webrInstance = null;
      webrReady = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

const runRCode = async (
  code: string,
  fileName: string = "",
  fileContent: string = "",
  fileBuffer: ArrayBuffer = new ArrayBuffer(0),
  newFileNames: string[] = [],
  newFileBuffers: ArrayBuffer[] = []
) => {
  try {
    // prevent attempts to install or load large/unsupported packages in browser
    if (/install\.packages\s*\(/.test(code) || /library\s*\(\s*ggplot2/.test(code)) {
      // you could extend this list with other heavy packages
      return {
        results: "",
        error: "Couldn't load that package. R in the browser includes base packages only. Use base R functions instead.",
        stdoutLines: [],
        stderr: "package support limited",
        images: [],
        modifiedFileContent: fileContent,
        modifiedFileBuffer: fileBuffer,
        modifiedFileNames: newFileNames,
        modifiedFileBuffers: newFileBuffers,
      };
    }

    // Initialize WebR if not already done
    if (!webrInstance || !webrReady) {
      await initWebR();
    }

    if (!webrInstance) {
      throw new Error("WebR instance not available");
    }

    const images: string[] = [];
    let results = "";
    let error = "";
    const stdoutLines: string[] = [];
    const variables: Array<{ name: string; preview: string }> = [];

    try {
      // Create unique paths for plot and stdout on the WebR filesystem from JS
      const plotPath = `/tmp/plot_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
      const outPath = `/tmp/out_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
      const varPath = `/tmp/vars_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
      const varPreviewPath = `/tmp/varpreview_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;

      // Execute user code capturing both regular output and messages into a text file
      // using a manual connection/sink; also open a PNG device for plots.
      // After execution we will write variable names and previews to varPath/varPreviewPath.
      const wrappedCode = `
# clear previous variables so each run starts fresh
rm(list = ls())

out_con <- file('${outPath}', open = 'wt')
sink(out_con)
sink(out_con, type = 'message')

png('${plotPath}', width = 640, height = 480, res = 72)
try({
${code}
}, silent = FALSE)
dev.off()

# capture variable list and previews, excluding our own helper names
vars <- setdiff(ls(), c('out_con','vars'))
        if(length(vars)>0) {
  writeLines(vars, '${varPath}')
  for(nm in vars) {
    obj <- tryCatch(get(nm), error = function(e) NULL)
    info <- character(0)
    if(!is.null(obj)) {
      info <- tryCatch({
        if(is.data.frame(obj) || is.matrix(obj)) {
          capture.output(head(obj, 5))
        } else if (is.atomic(obj) || is.list(obj)) {
          capture.output(print(head(obj, 5)))
        } else {
          capture.output(str(obj))
        }
      }, error = function(e) capture.output(class(obj)))
    } else {
      info <- capture.output('<<unavailable>>')
    }
    cat(paste0('VAR:',nm), file='${varPreviewPath}', sep='\n', append=TRUE)
    if(length(info) > 0) cat(info, file='${varPreviewPath}', sep='\n', append=TRUE)
    cat('\n', file='${varPreviewPath}', append=TRUE)
  }
} else {
  writeLines(character(0), '${varPath}')
}

# restore sinks and close connection
sink(type = 'message')
sink()
close(out_con)
`;

      await webrInstance.evalR(wrappedCode);
      results = "Code executed successfully";

      // Try to read the generated PNG file
      try {
        const uint8Array = await webrInstance.FS.readFile(plotPath);
        if (uint8Array && uint8Array.length > 0) {
          // Convert to Base64
          const pngBytes = Uint8Array.from(uint8Array);
          const blob = new Blob([pngBytes], { type: 'image/png' });
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          images.push(base64);
        }
      } catch (fileError) {
        console.error("Failed to read plot file:", fileError);
      }

      // Try to read captured stdout/messages
      try {
        const outUint8 = await webrInstance.FS.readFile(outPath);
        if (outUint8 && outUint8.length > 0) {
          const outText = new TextDecoder().decode(outUint8);
          // Normalize line endings and split
          const lines = outText.replace(/\r\n/g, "\n").split('\n');
          for (const ln of lines) {
            if (ln.trim().length > 0) stdoutLines.push(ln);
          }
        }
      } catch (outErr) {
        // not fatal; leave stdoutLines empty
      }

      // Read variable names and previews written by the R block
      try {
        const namesUint8 = await webrInstance.FS.readFile(varPath);
        const namesStr = new TextDecoder().decode(namesUint8);
        const names = namesStr.split('\n').filter((n) => n.trim());
        for (const nm of names) {
          variables.push({ name: nm, preview: '' });
        }
        // read preview file if it exists
        try {
          const prevUint8 = await webrInstance.FS.readFile(varPreviewPath);
          const prevText = new TextDecoder().decode(prevUint8);
          const lines = prevText.split('\n');
          let curr: string | null = null;
          for (const ln of lines) {
            if (ln.startsWith('VAR:')) {
              curr = ln.slice(4);
            } else if (curr !== null) {
              const idx = variables.findIndex((v) => v.name === curr);
              if (idx !== -1) {
                variables[idx].preview += ln + '\n';
              }
            }
          }
        } catch {}
      } catch (varErr) {
        // ignore
      }
    } catch (evalError) {
      error = evalError instanceof Error ? evalError.message : String(evalError);
      stdoutLines.push(error);
      console.error("Error executing R code:", error);
    }

    return {
      results,
      error,
      stdoutLines,
      stderr: error,
      images,
      variables,
      modifiedFileContent: fileContent,
      modifiedFileBuffer: fileBuffer,
      modifiedFileNames: newFileNames,
      modifiedFileBuffers: newFileBuffers,
    };
  } catch (error) {
    console.error("Error running R code:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      results: "",
      error: errorMsg,
      stdoutLines: [errorMsg],
      stderr: errorMsg,
      images: [],
      modifiedFileContent: fileContent,
      modifiedFileBuffer: fileBuffer,
      modifiedFileNames: newFileNames,
      modifiedFileBuffers: newFileBuffers,
    };
  }
};

export { runRCode, initWebR };

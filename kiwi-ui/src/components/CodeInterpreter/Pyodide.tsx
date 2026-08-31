const pyodideWorker = new Worker("/assets/pyodide.worker.js");
const jsWorker = new Worker("/assets/js.worker.js");

const callbacks: {
  [key in "python" | "js"]: { [id: number]: (result: any) => void };
} = {
  python: {},
  js: {},
};

pyodideWorker.onmessage = (event) => {
  const { id, ...data } = event.data;
  const onSuccess = callbacks["python"][id];
  delete callbacks["python"][id];
  onSuccess(data);
};

jsWorker.onmessage = (event) => {
  const { id, ...data } = event.data;
  console.log("jsWorker.onmessage data", id, data);
  const onSuccess = callbacks["js"][id];
  delete callbacks["js"][id];
  onSuccess(data);
};

const workerRunPythonCode = (() => {
  let id = 0; // identify a Promise

  // let file = "file";
  return (
    code: string,
    fileName: string,
    fileContent: string,
    fileBuffer: ArrayBuffer,
    newFileNames: string[],
    newFileBuffers: ArrayBuffer[]
  ) => {
    // the id could be generated more carefully
    id = (id + 1) % Number.MAX_SAFE_INTEGER;
    return new Promise((onSuccess) => {
      callbacks["python"][id] = onSuccess;
      pyodideWorker.postMessage({
        code,
        id,
        fileName,
        fileContent,
        fileBuffer,
        newFileNames,
        newFileBuffers,
      });
    });
  };
})();

const workerRunJsCode = (() => {
  let id = 0; // identify a Promise
  return (code: string) => {
    // the id could be generated more carefully
    id = (id + 1) % Number.MAX_SAFE_INTEGER;
    return new Promise((onSuccess) => {
      callbacks["js"][id] = onSuccess;
      jsWorker.postMessage({
        code,
        id,
      });
    });
  };
})();

const runPythonCode = async (
  code: string,
  fileName: string,
  fileContent: string,
  fileBuffer: ArrayBuffer,
  newFileNames: string[],
  newFileBuffers: ArrayBuffer[]
) => {
  try {
    const result = (await workerRunPythonCode(
      code,
      fileName,
      fileContent,
      fileBuffer,
      newFileNames,
      newFileBuffers
    )) as {
      results: string;
      error: string;
      stdoutLines: string[];
      stderr: string;
      modifiedFileContent: string;
      modifiedFileBuffer: ArrayBuffer;
      modifiedFileNames: string[];
      modifiedFileBuffers: ArrayBuffer[];
    };
    const {
      results,
      error,
      stdoutLines,
      stderr,
      modifiedFileContent,
      modifiedFileBuffer,
      modifiedFileNames,
      modifiedFileBuffers,
    } = result;
    console.log("The result of pyodide", modifiedFileContent);
    if (error) {
      return {
        error,
        stdoutLines,
        stderr,
        modifiedFileContent,
        modifiedFileBuffer,
        modifiedFileNames,
        modifiedFileBuffers,
      };
    } else {
      // console.log("The stdoutLines",stdoutLines)
      return {
        results,
        stdoutLines,
        stderr,
        modifiedFileContent,
        modifiedFileBuffer,
        modifiedFileNames,
        modifiedFileBuffers,
      };
    }
  } catch (error) {
    console.error("Error running Python code:", error);
  }
};

/// A new function to write a file

// const filedit = async (code: string,fileName:string,fileContent:string,fileBuffer:ArrayBuffer,newFileNames:string[],newFileBuffers:ArrayBuffer[]) => {
//   try {
//     const result = (await workerRunPythonCode(
//       code,fileName, fileContent,fileBuffer,newFileNames,newFileBuffers
//     )) as {
//       results: string;
//       error: string;
//       stdoutLines: string[];
//       stderr: string;
//       modifiedFileContent: string;
//       modifiedFileBuffer: ArrayBuffer;
//       modifiedFileNames: string[];
//       modifiedFileBuffers: ArrayBuffer[];
//     };
//     const { results, error, stdoutLines, stderr,modifiedFileContent,modifiedFileBuffer,modifiedFileNames,modifiedFileBuffers } = result;
//     console.log("The result of pyodide",modifiedFileContent)
//     if (error) {
//       return { error, stdoutLines, stderr,modifiedFileContent,modifiedFileBuffer,modifiedFileNames,modifiedFileBuffers };
//     } else {
//       // console.log("The stdoutLines",stdoutLines)
//       return { results, stdoutLines, stderr ,modifiedFileContent,modifiedFileBuffer,modifiedFileNames,modifiedFileBuffers};
//     }
//   } catch (error) {
//     console.error("Error running Python code:", error);
//   }
// };

const runJavascriptCode = async (code: string) => {
  try {
    const { results, error } = (await workerRunJsCode(code)) as {
      results: any;
      error: any;
    };
    if (results) {
      return results;
    }
    if (error) {
      return error;
    }
  } catch (error) {
    console.error("Error running Javascript code:", error);
  }
};

export { runPythonCode, runJavascriptCode };

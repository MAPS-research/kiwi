// webworker.js

// Override console.log
// const originalConsoleLog = console.log;

self.onmessage = async (event) => {
  const { id, code } = event.data;

  console.log = (...args) => {
    // Send the logged messages back to the main thread
    self.postMessage({
      results: args.map((arg) => arg.toString()),
      id,
      type: "result",
    });
    // Optionally, call the original console.log if you still want to see logs in the worker's console
    // originalConsoleLog.apply(console, args);
  };

  try {
    // Wrap the user code to capture its result or any direct output
    const wrappedJsCode = `
      (async function() {
        ${code}
      })()
    `;

    // Execute the wrapped JavaScript code
    const result = await eval(wrappedJsCode);

    // If the executed code has a result (not undefined), send it back
    if (result !== undefined) {
      self.postMessage({ results: result.toString(), id, type: "result" });
    }
  } catch (error) {
    // If there's an error, post back the error message
    self.postMessage({ error: error.message, id, type: "error" });
  }
};

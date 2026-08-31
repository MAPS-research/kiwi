// webworker.js

importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let stdout = "";
let stdoutLines = [];
let stderr = "";
let modifiedFileContent = "";
let modifiedFileBuffer = new Uint8Array(0);
// Let modifiedFileContent also be a buffer

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide({
    // handle stdout and stderr here
    
    stdout: (text) => (stdoutLines.push(text)),
    // It is possible that the result is not one line, so we need to store it in an array,
    // and then join it when we send it back to the main thread
    stderr: (text) => (stderr += text),
    

  });
  // await self.pyodide.loadPackage(["numpy", "pytz"]);

  // load file system

  let mountdir = "/mnt12";
  self.pyodide.FS.mkdir(mountdir);
  self.pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, { root: "." }, mountdir);

}
let pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  // make sure loading is done
  await pyodideReadyPromise;
  // Don't bother yet with this line, suppose our API is built in such a way:
  const { id, code, flag, fileName,fileContent, fileBuffer, newFileNames, newFileBuffers} = event.data;
  // The flag should show wether to run the code or write.




  // Here we need a file here -- support files 




  // Here we've got the id and code
  // console.log("This is the file content:",fileContent)
  // console.log("This is the file name:",fileName)
  // // console.log("This is the file content:",fileStream)
  // console.log("This is the file Buffer:",fileBuffer)
  // console.log("This is the file Buffer length:",fileBuffer.byteLength)

  // console.log("This is the New fileNames:",newFileNames)
  // console.log("This is the New fileBuffers:",newFileBuffers)
  

  // if (fileName != ""){
  //   pyodide.FS.writeFile(fileName, fileContent, { encoding: "utf8" });
  // }

  if (fileName != ""){
    

    // pyodide.FS.writeFile(fileName, fileBuffer, { encoding: "binary" });

// Open the file for writing
  var stream = pyodide.FS.open(fileName, 'w+');

  // Write data to the file
  pyodide.FS.write(stream, fileBuffer, 0, fileBuffer.byteLength, 0);

  // Close the file
  pyodide.FS.close(stream);

  console.log("is it a view?",ArrayBuffer.isView(fileBuffer));


  
  }


    

  if (newFileNames.length > 0) {
      // Loop through each new file
      for (let i = 0; i < newFileNames.length; i++) {
          const fileNamei = newFileNames[i];
          const fileBufferi = newFileBuffers[i];
  
          // Open the file for writing
          var stream = pyodide.FS.open(fileNamei, 'w+');
          // console.log("is it a view?",ArrayBuffer.isView(fileBufferi));

          // Write data to the file
          pyodide.FS.write(stream, fileBufferi, 0, fileBufferi.byteLength, 0);
  
          // Close the file
          pyodide.FS.close(stream);
  
          // console.log("File written:", fileNamei);
          // console.log("Is it a view?", ArrayBuffer.isView(fileBufferi));
      }
  
  
  }



  // Now is the easy part, the one that is similar to working in the main thread:


  try {
    await self.pyodide.loadPackagesFromImports(code);


    let results = await self.pyodide.runPythonAsync(code);



    // console.log("This is the results from the pyodide",results);
    // console.log("This is the outputlines from the pyodide",stdoutLines);

    var modifiedFileNames = pyodide.FS.readdir(".");
    if (fileName != ""){
    // modifiedFileContent = await pyodide.FS.readFile(fileName, { encoding: "utf8" });
    

    // Now, open the file for reading
    stream = pyodide.FS.open(fileName, 'r');

    var new_fileInfo = pyodide.FS.stat(fileName);
    var new_fileSize = new_fileInfo.size;
    // console.log("The new file size is ", fileSize)

    // Create a buffer to read the data into
    // var modifiedFileBuffer = new Uint8Array(fileBuffer.byteLength);

    // var bytesRead = pyodide.FS.read(stream, null, 0, 0, 0); // Get the size of the file

    var modifiedFileBuffer = new Uint8Array(new_fileSize);

    // Here it should be a size of new file. currently using an arbitarily large one


    
      // This should be the size after modification -- but how do we know the size?

  
    // Read data from the file
    var bytesRead = pyodide.FS.read(stream, modifiedFileBuffer, 0, new_fileSize, 0);
    // var bytesRead = pyodide.FS.read(stream, modifiedFileBuffer, 0, 162334, 0);
    // Close the file


 
    pyodide.FS.close(stream);


 
  

  }

  
  if (newFileNames != []){
    // modifiedFileContent = await pyodide.FS.readFile(fileName, { encoding: "utf8" });


    // var modifiedFileBuffers = [{
    //   filename:
    //   content
    // }];
    var modifiedFileBuffers =[];
    modifiedFileNames = pyodide.FS.readdir(".").slice(2);
    console.log("The modified file names are!!!!!",modifiedFileNames);



    for (let i = 0; i < modifiedFileNames.length; i++) {
      const fileName = modifiedFileNames[i];
  
      // Open the file for reading
      const stream = pyodide.FS.open(fileName, 'r');
  
      // Get file information, including size
      const fileInfo = pyodide.FS.stat(fileName);
      const fileSize = fileInfo.size;
  
      // Create a buffer to read the data into
      var modifiedFileBuffer1 = new Uint8Array(fileSize);
  
      // Read data from the file
      const bytesRead = pyodide.FS.read(stream, modifiedFileBuffer1, 0, fileSize, 0);
  
      // Close the file
      pyodide.FS.close(stream);
      console.log("The buffer for",newFileNames[i],"is",modifiedFileBuffer1)

      modifiedFileBuffers.push(modifiedFileBuffer1);
      // Now you have the file data in modifiedFileBuffer, you can do whatever you need with it
      console.log("Read file:", fileName);
      console.log("File size:", fileSize);
  }
  
  console.log("(multi-file)The modified file buffers are",modifiedFileBuffers)
 
  
  // var modifiedFileBuffer = pyodide.FS.readFile(fileName, { encoding: 'binary' });
  // console.log("Hopefully it would be a right Arraybuffer",modifiedFileBuffer)
  }


    // console.log("File content:",modifiedFileContent);
    // It is very likely that it is not a string

    // Assuming you have some mechanism to communicate with the main thread,
    // you can send the file content to trigger the download.
    // self.postMessage({ fileContent });
    // Adjust the delay as needed


    // self.pyodide.FS.syncfs(true, (err) => console.log(err));
 
    // -- How to use this call back
    // How to run this?

    
    //console.log("File content:",modifiedFileContent);
    self.postMessage({ results, id, stdoutLines, stderr,modifiedFileContent,modifiedFileBuffer,modifiedFileNames,  modifiedFileBuffers});

 
  } catch (error) {
    self.postMessage({ error: error.message, id, stdoutLines, stderr,modifiedFileContent,modifiedFileBuffer,modifiedFileNames,modifiedFileBuffers});
  } finally {
    stdoutLines = [];
    stderr = "";
    // modified_file = "";
    // results ="";
  }
};

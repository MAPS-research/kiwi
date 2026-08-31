export const validatePythonFile = (fileContent: string): { isValid: boolean, message: string } => {
    // Check if the file contains a valid Python function definition
    const functionRegex = /def\s+\w+\s*\(.*\)\s*:/;
    if (!functionRegex.test(fileContent)) {
        console.error("The file does not contain a valid Python function definition.");
        return {
            isValid: false,
            message: "The file does not contain a valid Python function definition."
        };
    }

    // // Check if the file contains a main entry point
    // const mainEntryPointRegex = /if\s+__name__\s*==\s*['"]__main__['"]\s*:/;
    // if (!mainEntryPointRegex.test(fileContent)) {
    //     console.error("The file does not contain a main entry point.");
    //     return false;
    // }

    // check if the file contains three classes: class Model(nn.Module)
    const classRegex = /class\s+(Model)\s*\(.*\)\s*:/;
    if (!classRegex.test(fileContent)) {
        return {
            isValid: false,
            message: "The file does not contain the required classes: Model."
        };
    }

    // check if the file contains three functions: encode, decode, preprocess
    for (const func of ["decode", "encode"]) {
        const funcRegex = new RegExp(`def\\s+(${func})\\s*\\(\\s*self.*\\)\\s*:`);
        if (!funcRegex.test(fileContent)) {
            return {
                isValid: false,
                message: `The file does not contain the required functions: ${func}.`
            };
        }
    }
    
    // check the file does not contain any file I/O operations, no "import os" or "import sys"
    const importRegex = /import\s+(os|sys)/;
    const importRegex2 = /import\s+.*from\s+(os|sys)/;
    const fileIORegex = /open\s*\(.*\)/;
    if (fileIORegex.test(fileContent) || importRegex.test(fileContent) || importRegex2.test(fileContent)) {
        return {
            isValid: false,
            message: "The file contains file I/O operations."
        };
    }

    return {
        isValid: true,
        message: "The file is a valid Python file."
    };
};

export default validatePythonFile;

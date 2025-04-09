import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import * as path from 'path';
require('dotenv').config();

export function activate(context: vscode.ExtensionContext) {
    require('dotenv').config({ path: path.join(context.extensionPath, '.env') });
    
    // Verify API key exists
    if (!process.env.TOGETHER_API_KEY) {
        vscode.window.showErrorMessage(
            "Together API key is missing. Please set TOGETHER_API_KEY in your .env file",
            "Open Settings"
        ).then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', 'Together API');
            }
        });
        return;
    }

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(beaker) Analyze C++";
    statusBarItem.tooltip = "Analyze C++ Code";
    statusBarItem.command = "extension.analyzeCode";
    statusBarItem.show();

    let disposable = vscode.commands.registerCommand('extension.analyzeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        const code = document.getText();
        const filePath = document.fileName;

        const statusMessage = vscode.window.setStatusBarMessage('Analyzing code...');

        try {
            const outputPath = path.join(path.dirname(filePath), 'a.out');
            
            // Compile the code
            const { error, stderr } = await new Promise<{ error: Error | null, stderr: string }>((resolve) => {
                exec(`g++ "${filePath}" -o "${outputPath}"`, (error, stdout, stderr) => {
                    resolve({ error, stderr });
                });
            });

            statusMessage.dispose();
            vscode.window.showInformationMessage('Analysis complete.');

            const panel = vscode.window.createWebviewPanel(
                'analysisResult',
                'Analysis Result',
                vscode.ViewColumn.One,
                { 
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const errorMsg = cleanErrorMessage(stderr || (error ? error.message : ''));
            const sanitizedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            if (error || stderr) {
                // Show compilation error view
                panel.webview.html = getWebviewContent(
                    'Compilation Failed',
                    errorMsg,
                    sanitizedCode,
                    '',
                    true
                );

                // Handle webview messages
                panel.webview.onDidReceiveMessage(async (message) => {
                    if (message.command === 'fixedCode') {
                        try {
                            const fixedCode = await getFixedCodeFromScript(context, code, errorMsg);
                            
                            if (fixedCode && !fixedCode.includes('Failed to retrieve')) {
                                panel.webview.postMessage({
                                    command: 'updateFixedCode',
                                    code: fixedCode
                                });
                            } else {
                                vscode.window.showErrorMessage('Failed to get fixed code from API');
                            }
                        } catch (err) {
                            let errorMessage = 'Unknown error occurred';
                            if (err instanceof Error) {
                                errorMessage = err.message;
                            } else if (typeof err === 'string') {
                                errorMessage = err;
                            }
                            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
                        }
                    }
                    else if (message.command === 'getFixSteps') {
                        try {
                            const fixSteps = await getFixStepsFromScript(context, code, errorMsg);
                            panel.webview.postMessage({
                                command: 'updateFixSteps',
                                steps: fixSteps
                            });
                        } catch (err) {
                            let errorMessage = 'Unknown error occurred';
                            if (err instanceof Error) {
                                errorMessage = err.message;
                            } else if (typeof err === 'string') {
                                errorMessage = err;
                            }
                            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
                        }
                    }
                    else if (message.command === 'getErrorExplanation') {
                        try {
                            const explanation = await getErrorExplanationFromScript(context, code, errorMsg);
                            panel.webview.postMessage({
                                command: 'updateExplanation',
                                explanation: explanation
                            });
                        } catch (err) {
                            let errorMessage = 'Unknown error occurred';
                            if (err instanceof Error) {
                                errorMessage = err.message;
                            } else if (typeof err === 'string') {
                                errorMessage = err;
                            }
                            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
                        }
                    }
                });
            } else {
                // Run the compiled program
                const { error: runError, stdout, stderr: runStderr } = await new Promise<{ 
                    error: Error | null, 
                    stdout: string, 
                    stderr: string 
                }>((resolve) => {
                    exec(`"${outputPath}"`, (error, stdout, stderr) => {
                        resolve({ error, stdout, stderr });
                    });
                });

                const runErrorMsg = cleanErrorMessage(runStderr || (runError ? runError.message : ''));
                const showRuntimeErrors = runErrorMsg && runErrorMsg !== 'Unknown error occurred';
                panel.webview.html = getWebviewContent(
                    'Successful Compilation',
                    stdout || 'No output',
                    '',
                    showRuntimeErrors ? runErrorMsg : '',
                    false
                );
            }
        } catch (err) {
            statusMessage.dispose();
            let errorMessage = 'An unexpected error occurred';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
        }
    });

    context.subscriptions.push(disposable);
}

// async function getFixedCodeFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const scriptPath = path.join(context.extensionPath, 'out', 'fixedcode.js');
        
//         const child = spawn('node', [scriptPath], {
//             stdio: ['pipe', 'pipe', 'pipe'],
//             env: {
//                 ...process.env,
//                 NODE_PATH: path.join(context.extensionPath, 'node_modules')
//             }
//         });

//         const inputData = JSON.stringify({ code, error: errorMsg });
//         child.stdin.write(inputData);
//         child.stdin.end();

//         let result = '';
//         let errorOutput = '';

//         child.stdout.on('data', (data) => {
//             result += data.toString();
//         });

//         child.stderr.on('data', (data) => {
//             errorOutput += data.toString();
//         });

//         child.on('close', (code) => {
//             if (code === 0) {
//                 if (result.includes('Failed') || result.includes('Error')) {
//                     reject(new Error(result));
//                 } else {
//                     const cleanedResult = result.split('\n')
//                         .filter(line => !line.includes('Sending request to Together API') && 
//                                         !line.includes('Successfully received fixed code'))
//                         .join('\n')
//                         .trim();
//                     resolve(cleanedResult);
//                 }
//             } else {
//                 reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
//             }
//         });

//         child.on('error', (err) => {
//             reject(err);
//         });
//     });
// }
async function getFixedCodeFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(context.extensionPath, 'out', 'fixedcode.js');
        
        const child = spawn('node', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_PATH: path.join(context.extensionPath, 'node_modules')
            }
        });

        const inputData = JSON.stringify({ code, error: errorMsg });
        child.stdin.write(inputData);
        child.stdin.end();

        let result = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            result += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(result);
            } else {
                reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}
async function getFixStepsFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(context.extensionPath, 'out', 'indexfixxy.js');
        
        const child = spawn('node', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_PATH: path.join(context.extensionPath, 'node_modules')
            }
        });

        const inputData = JSON.stringify({ code, error: errorMsg });
        child.stdin.write(inputData);
        child.stdin.end();

        let result = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            result += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(result);
            } else {
                reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function getErrorExplanationFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(context.extensionPath, 'out', 'index2.js');
        
        const child = spawn('node', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_PATH: path.join(context.extensionPath, 'node_modules')
            }
        });

        const inputData = JSON.stringify({ code, error: errorMsg });
        child.stdin.write(inputData);
        child.stdin.end();

        let result = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            result += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(result);
            } else {
                reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

function cleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return "Unknown error occurred";
    return errorMessage
        .replace(/\/.?(\/|\\)(.?\.cpp):/g, '')
        .replace(/\n+/g, '\n')
        .trim();
}

// function getWebviewContent(
//     title: string,
//     message: string,
//     code: string = '',
//     errorMsg: string = '',
//     showButtons: boolean = true,
//     fixedCode: string = '',
//     fixSteps: string = '',
//     explanation: string = ''
// ): string {
//     return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>C++ Analysis</title>
//         <style>
//             body {
//                 font-family: var(--vscode-font-family);
//                 padding: 20px;
//                 color: var(--vscode-editor-foreground);
//                 background: var(--vscode-editor-background);
//             }
//             h2 {
//                 color: ${title.includes('Failed') ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed)'};
//                 margin-top: 0;
//             }
//             pre {
//                 background: var(--vscode-textCodeBlock-background);
//                 padding: 12px;
//                 border-radius: 4px;
//                 overflow-x: auto;
//                 white-space: pre-wrap;
//                 position: relative;
//             }
//             button {
//                 background: var(--vscode-button-background);
//                 color: var(--vscode-button-foreground);
//                 border: none;
//                 padding: 8px 16px;
//                 margin: 10px 10px 0 0;
//                 border-radius: 2px;
//                 cursor: pointer;
//             }
//             button:hover {
//                 background: var(--vscode-button-hoverBackground);
//             }
//             .code-block {
//                 margin-bottom: 20px;
//             }
//             #fixedCodeContainer, #fixStepsContainer, #explanationContainer {
//                 margin-top: 20px;
//                 display: none;
//             }
//             .copy-btn {
//                 position: absolute;
//                 top: 5px;
//                 right: 5px;
//                 padding: 4px 8px;
//                 font-size: 12px;
//                 background: var(--vscode-button-secondaryBackground);
//                 color: var(--vscode-button-secondaryForeground);
//             }
//             .copy-btn:hover {
//                 background: var(--vscode-button-secondaryHoverBackground);
//             }
//             .code-wrapper {
//                 position: relative;
//             }
//             .fix-steps, .explanation {
//                 background: var(--vscode-textCodeBlock-background);
//                 padding: 12px;
//                 border-radius: 4px;
//                 white-space: pre-wrap;
//             }
//             .steps-title, .explanation-title {
//                 margin-bottom: 8px;
//                 font-weight: bold;
//             }
//             .button-group {
//                 margin-bottom: 20px;
//             }
//         </style>
//     </head>
//     <body>
//         <h2>${title}</h2>
        
//         ${message ? `
//         <div class="code-block">
//             <h3>${title.includes('Failed') ? 'Error Message' : 'Output'}</h3>
//             <pre>${message}</pre>
//         </div>` : ''}
        
//         ${code ? `
//         <div class="code-block">
//             <h3>${showButtons ? 'Original Code' : 'Code'}</h3>
//             <div class="code-wrapper">
//                 <pre>${code}</pre>
//             </div>
//         </div>` : ''}
        
//         ${errorMsg && errorMsg !== 'Unknown error occurred' ? `
//         <div class="code-block">
//             <h3>Runtime Errors</h3>
//             <pre>${errorMsg}</pre>
//         </div>` : ''}

//         ${showButtons ? `
//         <div class="button-group">
//             <button id="fixedCodeBtn">Get Fixed Code</button>
//             <button id="fixStepsBtn">How to Fix?</button>
//             <button id="explainBtn">Explain Errors</button>
//         </div>
        
//         <div id="fixedCodeContainer" class="code-block">
//             <h3>Fixed Code</h3>
//             <div class="code-wrapper">
//                 <pre id="fixedCodePre">${fixedCode}</pre>
//                 <button class="copy-btn" id="copyFixedCodeBtn" title="Copy to clipboard">
//                     $(clippy) Copy
//                 </button>
//             </div>
//         </div>
        
//         <div id="fixStepsContainer" class="code-block">
//             <h3>Fix Steps</h3>
//             <div class="fix-steps" id="fixStepsPre">${fixSteps}</div>
//         </div>
        
//         <div id="explanationContainer" class="code-block">
//             <h3>Error Explanation</h3>
//             <div class="explanation" id="explanationPre">${explanation}</div>
//         </div>
        
//         <script>
//             const vscode = acquireVsCodeApi();
            
//             document.getElementById('fixedCodeBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'fixedCode' });
//             });
            
//             document.getElementById('fixStepsBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'getFixSteps' });
//             });

//             document.getElementById('explainBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'getErrorExplanation' });
//             });

//             document.getElementById('copyFixedCodeBtn')?.addEventListener('click', () => {
//                 const code = document.getElementById('fixedCodePre')?.textContent;
//                 if (code) {
//                     navigator.clipboard.writeText(code).then(() => {
//                         const btn = document.getElementById('copyFixedCodeBtn');
//                         if (btn) {
//                             btn.textContent = 'Copied!';
//                             setTimeout(() => {
//                                 btn.textContent = '$(clippy) Copy';
//                             }, 2000);
//                         }
//                     });
//                 }
//             });

//             window.addEventListener('message', event => {
//                 const message = event.data;
//                 if (message.command === 'updateFixedCode') {
//                     const container = document.getElementById('fixedCodeContainer');
//                     const pre = document.getElementById('fixedCodePre');
//                     const copyBtn = document.getElementById('copyFixedCodeBtn');
//                     if (container && pre && copyBtn) {
//                         pre.textContent = message.code;
//                         container.style.display = 'block';
//                         copyBtn.style.display = 'block';
//                     }
//                 }
//                 else if (message.command === 'updateFixSteps') {
//                     const container = document.getElementById('fixStepsContainer');
//                     const pre = document.getElementById('fixStepsPre');
//                     if (container && pre) {
//                         pre.textContent = message.steps;
//                         container.style.display = 'block';
//                     }
//                 }
//                 else if (message.command === 'updateExplanation') {
//                     const container = document.getElementById('explanationContainer');
//                     const pre = document.getElementById('explanationPre');
//                     if (container && pre) {
//                         pre.textContent = message.explanation;
//                         container.style.display = 'block';
//                     }
//                 }
//             });
//         </script>
//         ` : ''}
//     </body>
//     </html>`;
// }
function getWebviewContent(
    title: string,
    message: string,
    code: string = '',
    errorMsg: string = '',
    showButtons: boolean = true,
    fixedCode: string = '',
    fixSteps: string = '',
    explanation: string = ''
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>C++ Analysis</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/cpp.min.js"></script>
<script>hljs.highlightAll();</script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
            }
            h2 {
                color: ${title.includes('Failed') ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed)'};
                margin-top: 0;
            }
            pre {
                background: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 4px;
                overflow-x: auto;
                white-space: pre-wrap;
                position: relative;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                margin: 10px 10px 0 0;
                border-radius: 2px;
                cursor: pointer;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .code-block {
                margin-bottom: 20px;
            }
            #fixedCodeContainer, #fixStepsContainer, #explanationContainer {
                margin-top: 20px;
                display: none;
            }
            .copy-btn {
                position: absolute;
                top: 5px;
                right: 5px;
                padding: 4px 8px;
                font-size: 12px;
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .copy-btn:hover {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            .code-wrapper {
                position: relative;
            }
            .fix-steps, .explanation {
                background: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 4px;
                white-space: pre-wrap;
            }
            .steps-title, .explanation-title {
                margin-bottom: 8px;
                font-weight: bold;
            }
            .button-group {
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <h2>${title}</h2>
        
        ${message ? `
        <div class="code-block">
            <h3>${title.includes('Failed') ? 'Error Message' : 'Output'}</h3>
            <pre>${message}</pre>
        </div>` : ''}
        
        ${code ? `
        <div class="code-block">
            <h3>${showButtons ? 'Original Code' : 'Code'}</h3>
            <div class="code-wrapper">
                <pre><code class="language-cpp">${code}</code></pre>

            </div>
        </div>` : ''}
        
        ${errorMsg && errorMsg !== 'Unknown error occurred' ? `
        <div class="code-block">
            <h3>Runtime Errors</h3>
            <pre>${errorMsg}</pre>
        </div>` : ''}

        ${showButtons ? `
        <div class="button-group">
            <button id="explainBtn">Explain Errors</button>
            <button id="fixStepsBtn">How to Fix?</button>
            <button id="fixedCodeBtn">Get Fixed Code</button>
            
            
        </div>
        
        <div id="fixedCodeContainer" class="code-block">
            <h3>Fixed Code</h3>
            <div class="code-wrapper">
               <pre><code id="fixedCodePre" class="language-cpp">${fixedCode}</code></pre>

                <button class="copy-btn" id="copyFixedCodeBtn" title="Copy to clipboard">
                    $(clippy) Copy
                </button>
            </div>
        </div>
        
        <div id="fixStepsContainer" class="code-block">
            <h3>Fix Steps</h3>
           <div class="fix-steps" id="fixStepsPre"></div>

        </div>
        
        <div id="explanationContainer" class="code-block">
            <h3>Error Explanation</h3>
            <div class="explanation" id="explanationPre"></div>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('fixedCodeBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'fixedCode' });
            });
            
            document.getElementById('fixStepsBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'getFixSteps' });
            });

            document.getElementById('explainBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'getErrorExplanation' });
            });

            document.getElementById('copyFixedCodeBtn')?.addEventListener('click', () => {
                const code = document.getElementById('fixedCodePre')?.textContent;
                if (code) {
                    navigator.clipboard.writeText(code).then(() => {
                        const btn = document.getElementById('copyFixedCodeBtn');
                        if (btn) {
                            btn.textContent = 'Copied!';
                            setTimeout(() => {
                                btn.textContent = '$(clippy) Copy';
                            }, 2000);
                        }
                    });
                }
            });

            window.addEventListener('message', event => {
                const message = event.data;
               if (message.command === 'updateFixedCode') {
    const container = document.getElementById('fixedCodeContainer');
    const pre = document.getElementById('fixedCodePre');
    const copyBtn = document.getElementById('copyFixedCodeBtn');

    if (container && pre && copyBtn) {
        const escapedCode = message.code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        pre.innerHTML = '<code class="language-cpp">' + escapedCode + '</code>';
        hljs.highlightElement(pre.querySelector('code'));

        container.style.display = 'block';
        copyBtn.style.display = 'block';
    }
}

                else if (message.command === 'updateFixSteps') {
                    const container = document.getElementById('fixStepsContainer');
                    const pre = document.getElementById('fixStepsPre');
                    if (container && pre) {
                       pre.innerHTML = marked.parse(message.steps);
                       container.style.display = 'block';

                    }
                }
                else if (message.command === 'updateExplanation') {
                    const container = document.getElementById('explanationContainer');
                    const pre = document.getElementById('explanationPre');
                    if (container && pre) {
                        explanationPre.innerHTML = marked.parse(message.explanation);

                        container.style.display = 'block';
                    }
                }
            });
        </script>
        ` : ''}
    </body>
    </html>`;
}
export function deactivate() {}















// import * as vscode from 'vscode';
// import { exec, spawn } from 'child_process';
// import * as path from 'path';
// require('dotenv').config();

// export function activate(context: vscode.ExtensionContext) {
//     require('dotenv').config({ path: path.join(context.extensionPath, '.env') });
    
//     // Verify API key exists
//     if (!process.env.TOGETHER_API_KEY) {
//         vscode.window.showErrorMessage(
//             "Together API key is missing. Please set TOGETHER_API_KEY in your .env file",
//             "Open Settings"
//         ).then(selection => {
//             if (selection === "Open Settings") {
//                 vscode.commands.executeCommand('workbench.action.openSettings', 'Together API');
//             }
//         });
//         return;
//     }

//     const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
//     statusBarItem.text = "$(beaker) Analyze C++";
//     statusBarItem.tooltip = "Analyze C++ Code";
//     statusBarItem.command = "extension.analyzeCode";
//     statusBarItem.show();

//     let disposable = vscode.commands.registerCommand('extension.analyzeCode', async () => {
//         const editor = vscode.window.activeTextEditor;
//         if (!editor) {
//             vscode.window.showErrorMessage('No active editor found');
//             return;
//         }

//         const document = editor.document;
//         const code = document.getText();
//         const filePath = document.fileName;

//         const statusMessage = vscode.window.setStatusBarMessage('Analyzing code...');

//         try {
//             const outputPath = path.join(path.dirname(filePath), 'a.out');
            
//             // Compile the code
//             const { error, stderr } = await new Promise<{ error: Error | null, stderr: string }>((resolve) => {
//                 exec(`g++ "${filePath}" -o "${outputPath}"`, (error, stdout, stderr) => {
//                     resolve({ error, stderr });
//                 });
//             });

//             statusMessage.dispose();
//             vscode.window.showInformationMessage('Analysis complete.');

//             const panel = vscode.window.createWebviewPanel(
//                 'analysisResult',
//                 'Analysis Result',
//                 vscode.ViewColumn.One,
//                 { 
//                     enableScripts: true,
//                     retainContextWhenHidden: true
//                 }
//             );

//             const errorMsg = cleanErrorMessage(stderr || (error ? error.message : ''));
//             const sanitizedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

//             if (error || stderr) {
//                 // Show compilation error view
//                 panel.webview.html = getWebviewContent(
//                     'Compilation Failed',
//                     errorMsg,
//                     sanitizedCode,
//                     '',
//                     true
//                 );

//                 // Handle webview messages
//                 panel.webview.onDidReceiveMessage(async (message) => {
//                     if (message.command === 'fixedCode') {
//                         try {
//                             const fixedCode = await getFixedCodeFromScript(context, code, errorMsg);
                            
//                             if (fixedCode && !fixedCode.includes('Failed to retrieve')) {
//                                 panel.webview.postMessage({
//                                     command: 'updateFixedCode',
//                                     code: fixedCode
//                                 });
//                             } else {
//                                 vscode.window.showErrorMessage('Failed to get fixed code from API');
//                             }
//                         } catch (err) {
//                             let errorMessage = 'Unknown error occurred';
//                             if (err instanceof Error) {
//                                 errorMessage = err.message;
//                             } else if (typeof err === 'string') {
//                                 errorMessage = err;
//                             }
//                             vscode.window.showErrorMessage(`Error: ${errorMessage}`);
//                         }
//                     }
//                     else if (message.command === 'getFixSteps') {
//                         try {
//                             const fixSteps = await getFixStepsFromScript(context, code, errorMsg);
//                             panel.webview.postMessage({
//                                 command: 'updateFixSteps',
//                                 steps: fixSteps
//                             });
//                         } catch (err) {
//                             let errorMessage = 'Unknown error occurred';
//                             if (err instanceof Error) {
//                                 errorMessage = err.message;
//                             } else if (typeof err === 'string') {
//                                 errorMessage = err;
//                             }
//                             vscode.window.showErrorMessage(`Error: ${errorMessage}`);
//                         }
//                     }
//                     else if (message.command === 'getErrorExplanation') {
//                         try {
//                             const explanation = await getErrorExplanationFromScript(context, code, errorMsg);
//                             panel.webview.postMessage({
//                                 command: 'updateExplanation',
//                                 explanation: explanation
//                             });
//                         } catch (err) {
//                             let errorMessage = 'Unknown error occurred';
//                             if (err instanceof Error) {
//                                 errorMessage = err.message;
//                             } else if (typeof err === 'string') {
//                                 errorMessage = err;
//                             }
//                             vscode.window.showErrorMessage(`Error: ${errorMessage}`);
//                         }
//                     }
//                 });
//             } else {
//                 // Run the compiled program
//                 const { error: runError, stdout, stderr: runStderr } = await new Promise<{ 
//                     error: Error | null, 
//                     stdout: string, 
//                     stderr: string 
//                 }>((resolve) => {
//                     exec(`"${outputPath}"`, (error, stdout, stderr) => {
//                         resolve({ error, stdout, stderr });
//                     });
//                 });

//                 const runErrorMsg = cleanErrorMessage(runStderr || (runError ? runError.message : ''));
//                 const showRuntimeErrors = runErrorMsg && runErrorMsg !== 'Unknown error occurred';
//                 panel.webview.html = getWebviewContent(
//                     'Successful Compilation',
//                     stdout || 'No output',
//                     '',
//                     showRuntimeErrors ? runErrorMsg : '',
//                     false
//                 );
//             }
//         } catch (err) {
//             statusMessage.dispose();
//             let errorMessage = 'An unexpected error occurred';
//             if (err instanceof Error) {
//                 errorMessage = err.message;
//             }
//             vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
//         }
//     });

//     context.subscriptions.push(disposable);
// }

// async function getFixedCodeFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const scriptPath = path.join(context.extensionPath, 'out', 'fixedcode.js');
        
//         const child = spawn('node', [scriptPath], {
//             stdio: ['pipe', 'pipe', 'pipe'],
//             env: {
//                 ...process.env,
//                 NODE_PATH: path.join(context.extensionPath, 'node_modules')
//             }
//         });

//         const inputData = JSON.stringify({ code, error: errorMsg });
//         child.stdin.write(inputData);
//         child.stdin.end();

//         let result = '';
//         let errorOutput = '';

//         child.stdout.on('data', (data) => {
//             result += data.toString();
//         });

//         child.stderr.on('data', (data) => {
//             errorOutput += data.toString();
//         });

//         child.on('close', (code) => {
//             if (code === 0) {
//                 if (result.includes('Failed') || result.includes('Error')) {
//                     reject(new Error(result));
//                 } else {
//                     const cleanedResult = result.split('\n')
//                         .filter(line => !line.includes('Sending request to Together API') && 
//                                         !line.includes('Successfully received fixed code'))
//                         .join('\n')
//                         .trim();
//                     resolve(cleanedResult);
//                 }
//             } else {
//                 reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
//             }
//         });

//         child.on('error', (err) => {
//             reject(err);
//         });
//     });
// }

// async function getFixStepsFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const scriptPath = path.join(context.extensionPath, 'out', 'indexfixxy.js');
        
//         const child = spawn('node', [scriptPath], {
//             stdio: ['pipe', 'pipe', 'pipe'],
//             env: {
//                 ...process.env,
//                 NODE_PATH: path.join(context.extensionPath, 'node_modules')
//             }
//         });

//         const inputData = JSON.stringify({ code, error: errorMsg });
//         child.stdin.write(inputData);
//         child.stdin.end();

//         let result = '';
//         let errorOutput = '';

//         child.stdout.on('data', (data) => {
//             result += data.toString();
//         });

//         child.stderr.on('data', (data) => {
//             errorOutput += data.toString();
//         });

//         child.on('close', (code) => {
//             if (code === 0) {
//                 resolve(result);
//             } else {
//                 reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
//             }
//         });

//         child.on('error', (err) => {
//             reject(err);
//         });
//     });
// }

// async function getErrorExplanationFromScript(context: vscode.ExtensionContext, code: string, errorMsg: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const scriptPath = path.join(context.extensionPath, 'out', 'index2.js');
        
//         const child = spawn('node', [scriptPath], {
//             stdio: ['pipe', 'pipe', 'pipe'],
//             env: {
//                 ...process.env,
//                 NODE_PATH: path.join(context.extensionPath, 'node_modules')
//             }
//         });

//         const inputData = JSON.stringify({ code, error: errorMsg });
//         child.stdin.write(inputData);
//         child.stdin.end();

//         let result = '';
//         let errorOutput = '';

//         child.stdout.on('data', (data) => {
//             result += data.toString();
//         });

//         child.stderr.on('data', (data) => {
//             errorOutput += data.toString();
//         });

//         child.on('close', (code) => {
//             if (code === 0) {
//                 resolve(result);
//             } else {
//                 reject(new Error(`Script failed: ${errorOutput || 'Unknown error'}`));
//             }
//         });

//         child.on('error', (err) => {
//             reject(err);
//         });
//     });
// }

// function cleanErrorMessage(errorMessage: string): string {
//     if (!errorMessage) return "Unknown error occurred";
//     return errorMessage
//         .replace(/\/.?(\/|\\)(.?\.cpp):/g, '')
//         .replace(/\n+/g, '\n')
//         .trim();
// }

// function getWebviewContent(
//     title: string,
//     message: string,
//     code: string = '',
//     errorMsg: string = '',
//     showButtons: boolean = true,
//     fixedCode: string = '',
//     fixSteps: string = '',
//     explanation: string = ''
// ): string {
//     return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>C++ Analysis</title>
//         <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
// <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/cpp.min.js"></script>
// <script>hljs.highlightAll();</script>
// <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

//         <style>
//             body {
//                 font-family: var(--vscode-font-family);
//                 padding: 20px;
//                 color: var(--vscode-editor-foreground);
//                 background: var(--vscode-editor-background);
//             }
//             h2 {
//                 color: ${title.includes('Failed') ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed)'};
//                 margin-top: 0;
//             }
//             pre {
//                 background: var(--vscode-textCodeBlock-background);
//                 padding: 12px;
//                 border-radius: 4px;
//                 overflow-x: auto;
//                 white-space: pre-wrap;
//                 position: relative;
//             }
//             button {
//                 background: var(--vscode-button-background);
//                 color: var(--vscode-button-foreground);
//                 border: none;
//                 padding: 8px 16px;
//                 margin: 10px 10px 0 0;
//                 border-radius: 2px;
//                 cursor: pointer;
//             }
//             button:hover {
//                 background: var(--vscode-button-hoverBackground);
//             }
//             .code-block {
//                 margin-bottom: 20px;
//             }
//             #fixedCodeContainer, #fixStepsContainer, #explanationContainer {
//                 margin-top: 20px;
//                 display: none;
//             }
//             .copy-btn {
//                 position: absolute;
//                 top: 5px;
//                 right: 5px;
//                 padding: 4px 8px;
//                 font-size: 12px;
//                 background: var(--vscode-button-secondaryBackground);
//                 color: var(--vscode-button-secondaryForeground);
//             }
//             .copy-btn:hover {
//                 background: var(--vscode-button-secondaryHoverBackground);
//             }
//             .code-wrapper {
//                 position: relative;
//             }
//             .fix-steps, .explanation {
//                 background: var(--vscode-textCodeBlock-background);
//                 padding: 12px;
//                 border-radius: 4px;
//                 white-space: pre-wrap;
//             }
//             .steps-title, .explanation-title {
//                 margin-bottom: 8px;
//                 font-weight: bold;
//             }
//             .button-group {
//                 margin-bottom: 20px;
//             }
//         </style>
//     </head>
//     <body>
//         <h2>${title}</h2>
        
//         ${message ? `
//         <div class="code-block">
//             <h3>${title.includes('Failed') ? 'Error Message' : 'Output'}</h3>
//             <pre>${message}</pre>
//         </div>` : ''}
        
//         ${code ? `
//         <div class="code-block">
//             <h3>${showButtons ? 'Original Code' : 'Code'}</h3>
//             <div class="code-wrapper">
//                 <pre><code class="language-cpp">${code}</code></pre>

//             </div>
//         </div>` : ''}
        
//         ${errorMsg && errorMsg !== 'Unknown error occurred' ? `
//         <div class="code-block">
//             <h3>Runtime Errors</h3>
//             <pre>${errorMsg}</pre>
//         </div>` : ''}

//         ${showButtons ? `
//         <div class="button-group">
//             <button id="fixedCodeBtn">Get Fixed Code</button>
//             <button id="fixStepsBtn">How to Fix?</button>
//             <button id="explainBtn">Explain Errors</button>
//         </div>
        
//         <div id="fixedCodeContainer" class="code-block">
//             <h3>Fixed Code</h3>
//             <div class="code-wrapper">
//                <pre><code id="fixedCodePre" class="language-cpp">${fixedCode}</code></pre>

//                 <button class="copy-btn" id="copyFixedCodeBtn" title="Copy to clipboard">
//                     $(clippy) Copy
//                 </button>
//             </div>
//         </div>
        
//         <div id="fixStepsContainer" class="code-block">
//             <h3>Fix Steps</h3>
//            <div class="fix-steps" id="fixStepsPre"></div>

//         </div>
        
//         <div id="explanationContainer" class="code-block">
//             <h3>Error Explanation</h3>
//             <div class="explanation" id="explanationPre"></div>
//         </div>
        
//         <script>
//             const vscode = acquireVsCodeApi();
            
//             document.getElementById('fixedCodeBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'fixedCode' });
//             });
            
//             document.getElementById('fixStepsBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'getFixSteps' });
//             });

//             document.getElementById('explainBtn').addEventListener('click', () => {
//                 vscode.postMessage({ command: 'getErrorExplanation' });
//             });

//             document.getElementById('copyFixedCodeBtn')?.addEventListener('click', () => {
//                 const code = document.getElementById('fixedCodePre')?.textContent;
//                 if (code) {
//                     navigator.clipboard.writeText(code).then(() => {
//                         const btn = document.getElementById('copyFixedCodeBtn');
//                         if (btn) {
//                             btn.textContent = 'Copied!';
//                             setTimeout(() => {
//                                 btn.textContent = '$(clippy) Copy';
//                             }, 2000);
//                         }
//                     });
//                 }
//             });

//             window.addEventListener('message', event => {
//                 const message = event.data;
//                 if (message.command === 'updateFixedCode') {
//                     const container = document.getElementById('fixedCodeContainer');
//                     const pre = document.getElementById('fixedCodePre');
//                     const copyBtn = document.getElementById('copyFixedCodeBtn');
//                     if (container && pre && copyBtn) {
//                        pre.innerHTML = '<code class="language-cpp">' + message.code + '</code>';
// hljs.highlightElement(pre.querySelector('code'));

//                         container.style.display = 'block';
//                         copyBtn.style.display = 'block';
//                     }
//                 }
//                 else if (message.command === 'updateFixSteps') {
//                     const container = document.getElementById('fixStepsContainer');
//                     const pre = document.getElementById('fixStepsPre');
//                     if (container && pre) {
//                        pre.innerHTML = marked.parse(message.steps);
//                        container.style.display = 'block';

//                     }
//                 }
//                 else if (message.command === 'updateExplanation') {
//                     const container = document.getElementById('explanationContainer');
//                     const pre = document.getElementById('explanationPre');
//                     if (container && pre) {
//                         explanationPre.innerHTML = marked.parse(message.explanation);

//                         container.style.display = 'block';
//                     }
//                 }
//             });
//         </script>
//         ` : ''}
//     </body>
//     </html>`;
// }

// export function deactivate() {}
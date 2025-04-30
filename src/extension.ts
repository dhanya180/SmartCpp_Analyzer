import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { getDependencyGraphWebviewContent } from './dependencyGraph';
import { registerSnippetCommands } from './Snippets/commands'; // Ensure this file exists

require('dotenv').config();

export function activate(context: vscode.ExtensionContext) {
    // Register snippet commands and buttons
    const snippetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    snippetButton.text = "$(code) Snippets";
    snippetButton.tooltip = "Snippet Operations";
    snippetButton.command = "snippetTagger.showSnippetQuickPick";
    snippetButton.show();
    context.subscriptions.push(snippetButton);

    registerSnippetCommands(context);
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

    // C++ Analyzer status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    statusBarItem.text = "$(beaker) Analyze C++";
    statusBarItem.tooltip = "Analyze C++ Code";
    statusBarItem.command = "extension.analyzeCode";
    statusBarItem.show();

    // Register the C++ code analyzer command
    let analyzeCommand = vscode.commands.registerCommand('extension.analyzeCode', async () => {
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
                    true,
                    'Error Message'
                );

                // Handle webview messages
                panel.webview.onDidReceiveMessage(async (message) => {
                    if (message.command === 'openFile') {
                        const filePath = message.filePath;
                        const fileUri = vscode.Uri.file(filePath);
                        vscode.workspace.openTextDocument(fileUri).then(doc => {
                          vscode.window.showTextDocument(doc);
                        });
                    }
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

                let runErrorMsg = cleanErrorMessage(runStderr || (runError ? runError.message : ''));
                const hasRuntimeErrors = runErrorMsg !== 'No errors detected';
                if (hasRuntimeErrors) {
                    const gdbOutput = await new Promise<string>((resolve) => {
                        exec(`gdb -batch -ex "run" -ex "bt full" --args "${outputPath}"`, (error, stdout, stderr) => {
                            resolve(stdout || stderr);
                        });
                    });
                    
                    // Combine the original error message with GDB output
                    runErrorMsg = `${runErrorMsg}\n\nGDB Backtrace:\n${gdbOutput}`;
                }
                panel.webview.html = getWebviewContent(
                    'Successful Compilation',
                    hasRuntimeErrors ? runErrorMsg : stdout || 'No output',
                    sanitizedCode,
                    hasRuntimeErrors ? runErrorMsg : '',
                    hasRuntimeErrors,
                    hasRuntimeErrors ? 'Runtime Error' : 'Program Output'
                );

                // Handle webview messages for runtime errors
                if (hasRuntimeErrors) {
                    panel.webview.onDidReceiveMessage(async (message) => {
                        if (message.command === 'fixedCode') {
                            try {
                                const fixedCode = await getFixedCodeFromScript(context, code, runErrorMsg);
                                
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
                                const fixSteps = await getFixStepsFromScript(context, code, runErrorMsg);
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
                                const explanation = await getErrorExplanationFromScript(context, code, runErrorMsg);
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
                }
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

    // Register dependency graph command
    let depCommand = vscode.commands.registerCommand('extension.showDependencyGraph', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Open a C++ file to view its dependency graph.');
            return;
        }
    
        const currentFile = editor.document.fileName;
        const folder = path.dirname(currentFile);
    
        const cppFiles = await vscode.workspace.findFiles('**/*.cpp');
        const hFiles = await vscode.workspace.findFiles('**/*.h');
    
        const files = [...cppFiles, ...hFiles].map(uri => uri.fsPath);
    
        const dependencyMap: { [key: string]: string[] } = {};
    
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const includes = content
                    .split('\n')
                    .filter(line => line.startsWith('#include "') || line.startsWith('#include <'))
                    .map(line => line.match(/["<](.*?)[">]/)?.[1])
                    .filter(Boolean) as string[];
        
                dependencyMap[file] = includes;
            } catch (err) {
                console.error(`Error reading file ${file}: ${err}`);
            }
        }
    
        const panel = vscode.window.createWebviewPanel(
            'dependencyGraph',
            'C++ File Dependency Graph',
            vscode.ViewColumn.Two,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
    
        // Register message handler for the panel
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'openFile') {
                const filePath = message.filePath;
                const fileUri = vscode.Uri.file(filePath);
                vscode.workspace.openTextDocument(fileUri)
                    .then((doc) => {
                        vscode.window.showTextDocument(doc);
                    })
                    .then(undefined, (err) => {
                        if (err instanceof Error) {
                            console.error('Failed to open document:', err.message);
                        } else {
                            console.error('Failed to open document:', err);
                        }
                    });
            }
        });
    
        panel.webview.html = await getDependencyGraphWebviewContent(dependencyMap);
    });

    // Add command for class dependency analysis using network visualization
    
    
    // Status bar item for dependency graph
    const depGraphButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    depGraphButton.text = "$(references) Show Dependencies";
    depGraphButton.tooltip = "Show C++ File Dependencies";
    depGraphButton.command = "extension.showDependencyGraph";
    depGraphButton.show();
    
    

    context.subscriptions.push(analyzeCommand, depCommand, depGraphButton);
}

// Network webview content is only used for class dependencies, not file dependencies
function getNetworkWebviewContent(graph: { nodes: any[]; edges: any[] }): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Class Dependency Graph</title>
    <script type="text/javascript" src="https://unpkg.com/vis-network@9.1.2/dist/vis-network.min.js"></script>
    <link href="https://unpkg.com/vis-network@9.1.2/styles/vis-network.min.css" rel="stylesheet" />
    <style>
        #mynetwork {
            width: 100%;
            height: 90vh;
            border: 1px solid lightgray;
        }
    </style>
</head>
<body>
    <h3>Class Dependency Graph</h3>
    <div id="mynetwork"></div>
    <script>
        const nodes = ${JSON.stringify(graph.nodes)};
        const edges = ${JSON.stringify(graph.edges)};
        const container = document.getElementById('mynetwork');
        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            layout: {
                hierarchical: {
                    direction: "UD",
                    sortMethod: "directed"
                }
            },
            edges: {
                arrows: { to: { enabled: true } }
            }
        };
        new vis.Network(container, data, options);
    </script>
</body>
</html>`;
}

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

function parseIncludes(filePath: string, visited = new Set<string>()): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    if (visited.has(filePath)) return graph;
    visited.add(filePath);

    if (!fs.existsSync(filePath)) return graph;

    const content = fs.readFileSync(filePath, 'utf-8');
    const includes = content.match(/^#include\s*["<](.*)[">]/gm) || [];
    const dir = path.dirname(filePath);
    const children: string[] = [];

    includes.forEach(line => {
        const match = line.match(/#include\s*["<](.*)[">]/);
        if (match) {
            const included = match[1];
            const fullPath = path.resolve(dir, included);
            children.push(fullPath);
            const subGraph = parseIncludes(fullPath, visited);
            subGraph.forEach((v, k) => graph.set(k, v));
        }
    });

    graph.set(filePath, children);
    return graph;
}

function cleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return "No errors detected";
    return errorMessage
        .replace(/\/.?(\/|\\)(.?\.cpp):/g, '')
        .replace(/\n+/g, '\n')
        .trim();
}

function getWebviewContent(
    title: string,
    message: string,
    code: string = '',
    errorMsg: string = '',
    showButtons: boolean = false,
    outputTitle: string = 'Output'
): string {
    const isRuntimeError = outputTitle === 'Runtime Error';
    // Only show errorMsg in runtime errors section if it's different from the main message
    const showSeparateErrorSection = errorMsg && errorMsg !== message && errorMsg !== 'No errors detected';
    
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
            <h3>${outputTitle}</h3>
            <pre>${message}</pre>
        </div>` : ''}
        
        ${code ? `
        <div class="code-block">
            <h3>${showButtons ? 'Original Code' : 'Code'}</h3>
            <div class="code-wrapper">
                <pre><code class="language-cpp">${code}</code></pre>
            </div>
        </div>` : ''}
        
        ${showSeparateErrorSection ? `
        <div class="code-block">
            <h3>Runtime Errors</h3>
            <pre>${errorMsg}</pre>
        </div>` : ''}

        ${showButtons ? `
        <div class="button-group">
            <button id="fixedCodeBtn">Get Fixed Code</button>
            <button id="fixStepsBtn">How to Fix?</button>
            <button id="explainBtn">Explain Errors</button>
        </div>
        
        <div id="fixedCodeContainer" class="code-block">
            <h3>Fixed Code</h3>
            <div class="code-wrapper">
               <pre><code id="fixedCodePre" class="language-cpp"></code></pre>
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
                        pre.innerHTML = escapedCode;
                        hljs.highlightElement(pre);

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
                        pre.innerHTML = marked.parse(message.explanation);
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
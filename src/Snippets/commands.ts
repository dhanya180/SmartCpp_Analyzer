import * as vscode from 'vscode';
import { loadStore, saveStore } from './store';
import { showSnippetPreview } from './previewscreen';

export function registerSnippetCommands(ctx: vscode.ExtensionContext) {
    // Save Snippet Command
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.saveSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showErrorMessage('No code selected. Please highlight the code you want to save.');
            return;
        }

        const tag = await vscode.window.showInputBox({ 
            prompt: 'Enter a tag for this snippet',
            placeHolder: 'e.g., "array-utils" or "error-handling"'
        });
        if (!tag) return;

        const store = loadStore(ctx);
        (store[tag] = store[tag] || []).push(selection);
        await saveStore(ctx, store);
        vscode.window.showInformationMessage(`💾 Snippet saved under "${tag}"`);
    }));

    // Insert Snippet Command
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.insertSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const store = loadStore(ctx);
        const tags = Object.keys(store);
        if (!tags.length) {
            vscode.window.showInformationMessage('No snippets saved yet. Save your first snippet using "Save Current Selection".');
            return;
        }

        const tag = await vscode.window.showQuickPick(tags, { 
            placeHolder: 'Select a tag or start typing to search...',
            title: 'Insert Snippet'
        });
        if (!tag) return;

        const snippets = store[tag];
        const snippet = snippets.length === 1 
            ? snippets[0] 
            : await vscode.window.showQuickPick(snippets, { 
                placeHolder: `Select a snippet from "${tag}"`,
                title: 'Available Snippets'
            });
        
        if (!snippet) return;

        await editor.edit(edit => {
            edit.insert(editor.selection.active, snippet);
        });
        vscode.window.showInformationMessage(`✓ Inserted snippet from "${tag}"`);
    }));

    // Preview Command (Manager)
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.showPreview', () => {
        showSnippetPreview(ctx);
    }));

    // Unified Command Dropdown
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.showSnippetQuickPick', async () => {
        const store = loadStore(ctx);
        const hasSnippets = Object.keys(store).length > 0;

        const options = [
            { 
                label: '$(save) Save Current Selection', 
                description: 'Save highlighted code as a new snippet',
                command: 'snippetTagger.saveSnippet',
                alwaysShow: true
            },
            ...(hasSnippets ? [
                { 
                    label: '$(arrow-down) Insert Snippet', 
                    description: 'Paste a saved snippet into your code',
                    command: 'snippetTagger.insertSnippet' 
                },
                { 
                    label: '$(list-flat) Manage Snippets', 
                    description: 'View/edit/delete saved snippets',
                    command: 'snippetTagger.showPreview' 
                }
            ] : [])
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select a snippet action',
            title: 'Snippet Tagger',
            ignoreFocusOut: true
        });

        if (selected) {
            await vscode.commands.executeCommand(selected.command);
        }
    }));
}
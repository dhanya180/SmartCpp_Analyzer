// Importing necessary VS Code APIs
import * as vscode from 'vscode';
// Importing functions to load and save snippet data
import { loadStore, saveStore } from './store';
// Importing function to show the snippet management UI
import { showSnippetPreview } from './previewscreen';
/**
 * Registers all commands related to the Snippet Tagger extension.
 * These include saving, inserting, managing, and a quick pick command hub.
 * @param ctx - The extension context used to register commands and manage state
 */
export function registerSnippetCommands(ctx: vscode.ExtensionContext) {
    // Save Snippet Command
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.saveSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        // Gets selected text from the editor
        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showErrorMessage('No code selected. Please highlight the code you want to save.');
            return;
        }
        // Ask user to enter a tag for the snippet
        const tag = await vscode.window.showInputBox({ 
            prompt: 'Enter a tag for this snippet',
            placeHolder: 'e.g., "array-utils" or "error-handling"'
        });
        if (!tag) return;
        // Load store, add the snippet to the tag, and save the updated store
        const store = loadStore(ctx);
        (store[tag] = store[tag] || []).push(selection);
        await saveStore(ctx, store);
        // Show confirmation
        vscode.window.showInformationMessage(`💾 Snippet saved under "${tag}"`);
    }));
    // Insert Snippet Command
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.insertSnippet', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        // Load all saved snippets
        const store = loadStore(ctx);
        const tags = Object.keys(store);
        if (!tags.length) {
            vscode.window.showInformationMessage('No snippets saved yet. Save your first snippet using "Save Current Selection".');
            return;
        }
         // Ask user to select a tag or search for one
        const tag = await vscode.window.showQuickPick(tags, { 
            placeHolder: 'Select a tag or start typing to search...',
            title: 'Insert Snippet'
        });
        if (!tag) return;
         // If multiple snippets are stored under a tag, let user pick one
        const snippets = store[tag];
        const snippet = snippets.length === 1 
            ? snippets[0] 
            : await vscode.window.showQuickPick(snippets, { 
                placeHolder: `Select a snippet from "${tag}"`,
                title: 'Available Snippets'
            });
        // If no snippet is selected, exit
        if (!snippet) return;
         // Insert the selected snippet into the editor at the current cursor position
        await editor.edit(edit => {
            edit.insert(editor.selection.active, snippet);
        });
         // Show confirmation
        vscode.window.showInformationMessage(`✓ Inserted snippet from "${tag}"`);
    }));

     // Preview Snippets Command (Snippet Manager UI)
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.showPreview', () => {
        showSnippetPreview(ctx);
    }));

      // Unified Command: Quick Pick Menu for All Actions
    ctx.subscriptions.push(vscode.commands.registerCommand('snippetTagger.showSnippetQuickPick', async () => {
        const store = loadStore(ctx);
        const hasSnippets = Object.keys(store).length > 0;
        // Define available commands, with conditional visibility for snippet-dependent ones
        // The `hasSnippets` variable is a boolean that indicates whether there are any snippets saved in the store.
        // If there are snippets, the options array will include the "Insert Snippet" and "Manage Snippets" commands.
        // If there are no snippets, only the "Save Current Selection" command will be shown.
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
         // Show Quick Pick menu with available options
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select a snippet action',
            title: 'Snippet Tagger',
            ignoreFocusOut: true
        });
          // If a command is selected, execute it
         // Note: `selected` is of type { label: string; description: string; command: string; alwaysShow?: boolean; } | undefined
         // We check if `selected` is truthy before trying to access its properties
         // This avoids TypeScript errors related to optional chaining
         // and ensures that we only call the command if a valid selection was made.
         // The `command` property is guaranteed to be a string if `selected` is truthy.
         // Execute the command associated with the selected option
         // If a command is selected, execute it
        if (selected) {
            await vscode.commands.executeCommand(selected.command);
        }
    }));
}

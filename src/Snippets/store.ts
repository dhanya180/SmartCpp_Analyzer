// Importing the VS Code extension API
import * as vscode from 'vscode';
// Defining a type for the snippet store where each key is a tag (string)
// and the value is an array of code snippets (strings)
export type SnippetStore = Record<string, string[]>;
// Defining a constant key used to store/retrieve snippets from global state
const STORE_KEY = 'snippetTagger.store';
/**
 * Loads the snippet store from the global state.
 * If no store exists, it returns an empty object. 
 * @param ctx - The extension context containing global state
 * @returns A SnippetStore object
 */
export function loadStore(ctx: vscode.ExtensionContext): SnippetStore {
  return ctx.globalState.get<SnippetStore>(STORE_KEY, {});
}
/**
 * Saves the snippet store to the global state.
 * @param ctx - The extension context containing global state
 * @param store - The SnippetStore to be saved
 * @returns A Thenable that resolves when the update is complete
 */
export function saveStore(ctx: vscode.ExtensionContext, store: SnippetStore): Thenable<void> {
  return ctx.globalState.update(STORE_KEY, store);
}
//src/snippets/store.ts

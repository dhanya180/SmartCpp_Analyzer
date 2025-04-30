import * as vscode from 'vscode';

export type SnippetStore = Record<string, string[]>;

const STORE_KEY = 'snippetTagger.store';

export function loadStore(ctx: vscode.ExtensionContext): SnippetStore {
  return ctx.globalState.get<SnippetStore>(STORE_KEY, {});
}

export function saveStore(ctx: vscode.ExtensionContext, store: SnippetStore): Thenable<void> {
  return ctx.globalState.update(STORE_KEY, store);
}
//src/snippets/store.ts
import * as vscode from 'vscode';
import { loadStore, saveStore, SnippetStore } from './store';

// Main function to display the snippet manager UI in a Webview panel
export function showSnippetPreview(context: vscode.ExtensionContext) {
    // Create and show a new Webview panel
    const panel = vscode.window.createWebviewPanel(
        'snippetPreview', // Identifier for the Webview
        'Snippet Manager', // Title of the Webview
        vscode.ViewColumn.One, // Show in first editor column
    {
        {
            enableScripts: true, // Enable JavaScript in the Webview
            retainContextWhenHidden: true // Retain context when hidden
        }
    );
// Function to update the Webview HTML based on optional filter
    const updateWebview = (filterTag = '') => {
        const store = loadStore(context);
        panel.webview.html = getWebviewContent(store, filterTag);
    };

    // Listen for messages from the Webview
    panel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.command) {
                case 'delete':
                    await deleteSnippet(context, message.tag, message.index);
                    updateWebview();
                    break;
                case 'edit':
                    await editSnippet(context, message.tag, message.index);
                    updateWebview();
                    break;
                case 'save':
                    await saveEditedSnippet(context, message.tag, message.index, message.content);
                    updateWebview();
                    break;
                case 'rename':
                    const newTag = await vscode.window.showInputBox({
                        prompt: 'Enter new tag name',
                        value: message.oldTag,
                        placeHolder: 'New tag name'
                    });
                    if (newTag && newTag !== message.oldTag) {
                        await renameTag(context, message.oldTag, newTag);
                        updateWebview();
                    }
                    break;
                case 'search':
                    updateWebview(message.searchTerm);
                    break;
            }
        },
        undefined,
        context.subscriptions
    );

    updateWebview(); // Initial load of the Webview content
}
// Rename a tag (category) in the snippet store
async function renameTag(context: vscode.ExtensionContext, oldTag: string, newTag: string) {
    if (!newTag || newTag.trim() === '') {
        vscode.window.showErrorMessage('Tag name cannot be empty');
        return;
    }

    const store = loadStore(context);
    if (store[oldTag]) {
        if (store[newTag]) {
            vscode.window.showErrorMessage(`Tag "${newTag}" already exists`);
            return;
        }

        store[newTag] = store[oldTag]; // Copy snippets to new tag
        delete store[oldTag]; // Delete old tag
        await saveStore(context, store); // Save updated store
        vscode.window.showInformationMessage(`Tag renamed from "${oldTag}" to "${newTag}"`);
    }
}
// Delete a snippet by tag and index
async function deleteSnippet(context: vscode.ExtensionContext, tag: string, index: number) {
    const store = loadStore(context); // Load the snippet store
    if (store[tag] && store[tag][index]) {
        store[tag].splice(index, 1); // Remove the snippet from the array
        if (store[tag].length === 0) {
            delete store[tag];  // Delete the tag if no snippets left
        }
        await saveStore(context, store); // Save the updated store
        vscode.window.showInformationMessage(`Snippet deleted from tag "${tag}"`);
    }
}
// Prompt user to edit a snippet and save the change
async function editSnippet(context: vscode.ExtensionContext, tag: string, index: number) {
    const store = loadStore(context); // Load the snippet store
    if (store[tag] && store[tag][index]) {
        const newContent = await vscode.window.showInputBox({
            prompt: `Edit snippet in tag "${tag}"`,
            value: store[tag][index] // Current snippet content
        });
        
        if (newContent !== undefined) {
            store[tag][index] = newContent;
            await saveStore(context, store);
            vscode.window.showInformationMessage(`Snippet in tag "${tag}" updated`);
        }
    }
}
// Save a snippet after it has been edited in the Webview
async function saveEditedSnippet(context: vscode.ExtensionContext, tag: string, index: number, content: string) {
    const store = loadStore(context); // Load the snippet store
    if (store[tag] && store[tag][index]) {
        store[tag][index] = content; // Update the snippet content
        await saveStore(context, store); // Save the updated store
        vscode.window.showInformationMessage(`Snippet in tag "${tag}" updated`);
    }
}
// Generate the full HTML content of the Webview
function getWebviewContent(store: SnippetStore, filterTag = ''): string {
      // Filter tags by search term
    const filteredTags = Object.entries(store).filter(([tag]) => 
        filterTag === '' || tag.toLowerCase().includes(filterTag.toLowerCase())
    );
  // Generate HTML for each snippet
    const snippetsHtml = filteredTags.map(([tag, snippets]) => {
        const snippetItems = snippets.map((snippet, index) => {
            const lines = snippet.split('\n');
            const previewLines = lines.slice(0, 7); // Show first 7 lines in preview
            const hasMore = lines.length > 7; // Check if there are more lines to show
            
            return `
            <div class="snippet-item">
                <div class="snippet-header">
                    <span class="snippet-index">#${index + 1}</span>
                    <div class="snippet-actions">
                        <button class="edit-btn" data-tag="${escapeHtml(tag)}" data-index="${index}">Edit</button>
                        <button class="delete-btn" data-tag="${escapeHtml(tag)}" data-index="${index}">Delete</button>
                    </div>
                </div>
                <pre class="snippet-content"><code class="language-cpp">${escapeHtml(previewLines.join('\n'))}</code></pre>
                ${hasMore ? `<button class="show-more-btn" data-tag="${escapeHtml(tag)}" data-index="${index}">Read more (${lines.length - 7} more lines)</button>` : ''}
                <div class="edit-container" id="edit-${tag}-${index}" style="display: none;">
                    <textarea class="edit-textarea" data-tag="${escapeHtml(tag)}" data-index="${index}">${escapeHtml(snippet)}</textarea>
                    <button class="save-btn" data-tag="${escapeHtml(tag)}" data-index="${index}">Save</button>
                    <button class="cancel-btn" data-tag="${escapeHtml(tag)}" data-index="${index}">Cancel</button>
                </div>
            </div>
            `;
        }).join('');
        
        return `
            <div class="tag-section">
                <div class="tag-header">
                    <h3 class="tag-title">${escapeHtml(tag)}</h3>
                    <button class="rename-btn" data-tag="${escapeHtml(tag)}">Rename</button>
                </div>
                <div class="snippet-list">
                    ${snippetItems}
                </div>
            </div>
        `;
    }).join('');
  // Final HTML output
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Snippet Manager</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/cpp.min.js"></script>

        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
                max-width: 1000px;
                margin: 0 auto;
            }
            .search-container {
                margin-bottom: 20px;
                display: flex;
                gap: 10px;
            }
            #searchInput {
                flex: 1;
                padding: 8px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 2px;
            }
            .search-btn {
                padding: 8px 16px;
            }
            .tag-section {
                margin-bottom: 30px;
                border-bottom: 1px solid var(--vscode-editorWidget-border);
                padding-bottom: 20px;
            }
            .tag-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            .tag-title {
                color: var(--vscode-textLink-foreground);
                margin: 0;
            }
            .snippet-item {
                background: var(--vscode-textCodeBlock-background);
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 15px;
                position: relative;
            }
            .snippet-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .snippet-index {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
            }
            .snippet-content {
                margin: 0;
                white-space: pre-wrap;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                max-height: 200px;
                overflow: hidden;
                padding: 10px;
                border-radius: 4px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                border: 1px solid var(--vscode-editorLineNumber-foreground);
            }
            .snippet-actions {
                display: flex;
                gap: 10px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .delete-btn {
                background: var(--vscode-errorForeground);
            }
            .delete-btn:hover {
                background: var(--vscode-inputValidation-errorBorder);
            }
            .edit-textarea {
                width: 100%;
                height: 150px;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                padding: 8px;
                margin-bottom: 10px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 2px;
            }
            .edit-container {
                margin-top: 15px;
            }
            .save-btn {
                background: var(--vscode-gitDecoration-addedResourceForeground);
            }
            .cancel-btn {
                background: var(--vscode-button-secondaryBackground);
            }
            .rename-btn {
                background: var(--vscode-button-secondaryBackground);
                font-size: 0.8em;
            }
            .show-more-btn {
                display: block;
                width: 100%;
                margin-top: 10px;
                background: var(--vscode-button-secondaryBackground);
                text-align: center;
            }
            .empty-state {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                padding: 40px 0;
            }
        </style>
    </head>
    <body>
        <h2>Snippet Manager</h2>
        
        <div class="search-container">
            <input id="searchInput" type="text" placeholder="Search by tag name..." value="${escapeHtml(filterTag)}">
            <button class="search-btn" id="searchBtn">Search</button>
        </div>

        ${filteredTags.length > 0 ? snippetsHtml : `
            <div class="empty-state">
                <p>${filterTag ? 'No tags match your search' : 'No snippets saved yet.'}</p>
                <p>Select some code and use the "Save Snippet" button to add your first snippet.</p>
            </div>
        `}

        <script>
            const vscode = acquireVsCodeApi();
            
            // Search functionality
            document.getElementById('searchBtn').addEventListener('click', () => {
                const searchTerm = document.getElementById('searchInput').value;
                vscode.postMessage({
                    command: 'search',
                    searchTerm: searchTerm
                });
            });
            
            // Handle Enter key in search input
            document.getElementById('searchInput').addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    document.getElementById('searchBtn').click();
                }
            });

            document.addEventListener('click', (event) => {
                const deleteBtn = event.target.closest('.delete-btn');
                if (deleteBtn) {
                    vscode.postMessage({
                        command: 'delete',
                        tag: deleteBtn.dataset.tag,
                        index: parseInt(deleteBtn.dataset.index)
                    });
                    return;
                }
                
                const editBtn = event.target.closest('.edit-btn');
                if (editBtn) {
                    const tag = editBtn.dataset.tag;
                    const index = parseInt(editBtn.dataset.index);
                    const editContainer = document.getElementById(\`edit-\${tag}-\${index}\`);
                    const snippetItem = editBtn.closest('.snippet-item');
                    
                    if (editContainer) {
                        editContainer.style.display = 'block';
                        snippetItem.querySelector('.snippet-content').style.display = 'none';
                        snippetItem.querySelector('.snippet-actions').style.display = 'none';
                        const showMoreBtn = snippetItem.querySelector('.show-more-btn');
                        if (showMoreBtn) showMoreBtn.style.display = 'none';
                    }
                    return;
                }
                
                const saveBtn = event.target.closest('.save-btn');
                if (saveBtn) {
                    const tag = saveBtn.dataset.tag;
                    const index = parseInt(saveBtn.dataset.index);
                    const textarea = saveBtn.parentElement.querySelector('.edit-textarea');
                    
                    if (textarea) {
                        vscode.postMessage({
                            command: 'save',
                            tag: tag,
                            index: index,
                            content: textarea.value
                        });
                        
                        // Hide edit UI
                        const snippetItem = saveBtn.closest('.snippet-item');
                        saveBtn.parentElement.style.display = 'none';
                        snippetItem.querySelector('.snippet-content').style.display = 'block';
                        snippetItem.querySelector('.snippet-actions').style.display = 'flex';
                        const showMoreBtn = snippetItem.querySelector('.show-more-btn');
                        if (showMoreBtn) showMoreBtn.style.display = 'block';
                    }
                    return;
                }
                
                const cancelBtn = event.target.closest('.cancel-btn');
                if (cancelBtn) {
                    const snippetItem = cancelBtn.closest('.snippet-item');
                    cancelBtn.parentElement.style.display = 'none';
                    snippetItem.querySelector('.snippet-content').style.display = 'block';
                    snippetItem.querySelector('.snippet-actions').style.display = 'flex';
                    const showMoreBtn = snippetItem.querySelector('.show-more-btn');
                    if (showMoreBtn) showMoreBtn.style.display = 'block';
                    return;
                }
                
                const renameBtn = event.target.closest('.rename-btn');
                if (renameBtn) {
                    const oldTag = renameBtn.dataset.tag;
                    vscode.postMessage({
                        command: 'rename',
                        oldTag: oldTag
                    });
                    return;
                }
                
                const showMoreBtn = event.target.closest('.show-more-btn');
                if (showMoreBtn) {
                    const tag = showMoreBtn.dataset.tag;
                    const index = parseInt(showMoreBtn.dataset.index);
                    const snippetItem = showMoreBtn.closest('.snippet-item');
                    const contentPre = snippetItem.querySelector('.snippet-content');
                    const editContainer = snippetItem.querySelector('.edit-container');
                    const textarea = editContainer ? editContainer.querySelector('.edit-textarea') : null;
                    const fullContent = textarea ? textarea.value : '';
                    
                    // Toggle between showing preview and full content
                    if (contentPre.style.maxHeight === 'none') {
                        // Show preview mode
                        const lines = fullContent.split('\\n');
                        const previewLines = lines.slice(0, 7).join('\\n');
                        contentPre.innerHTML = previewLines;
                        contentPre.style.maxHeight = '200px';
                        contentPre.style.overflow = 'hidden';
                        showMoreBtn.textContent = \`Read more (\${lines.length - 7} more lines)\`;
                        hljs.highlightElement(contentPre.querySelector('code'));
                    } else {
                        // Show full content
                        contentPre.innerHTML = fullContent;
                        contentPre.style.maxHeight = 'none';
                        contentPre.style.overflow = 'auto';
                        showMoreBtn.textContent = 'Show less';
                        hljs.highlightElement(contentPre.querySelector('code'));
                    }
                    return;
                }
            });

            // Initialize highlight.js
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        </script>
    </body>
    </html>
    `;
}
// Utility to safely escape HTML characters to prevent XSS
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

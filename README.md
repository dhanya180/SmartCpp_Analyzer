# 🚀 SmartCpp Analyser

## 📋 Overview
SmartCpp Analyser is a powerful **Visual Studio Code extension** designed to enhance **C++** development experience through intelligent **error analysis, code snippet management, and file dependency visualization**. Built for developers of all skill levels, SmartCPP integrates a G++ compiler with AI-powered error analysis, providing clear explanations and fixes for both compile-time and runtime errors.

![Image](https://github.com/user-attachments/assets/e42b8e66-2c79-4ba0-b149-3a6f9ca14696)


## ✨ Key Features

### 🔍 Intelligent C++ Error Analysis

* **One-Click Compilation** - Easily compile your code with the "Analyze C++" button
* **Error Explanation** - Get natural language descriptions of errors, categorized as primary or secondary
* **Step-by-Step Fix Instructions** - Follow clear instructions on how to resolve errors
* **Automatic Code Correction** - View suggested fixes with properly formatted code

### 📦 Code Snippet Manager

* **Save & Organize Snippets** - Store frequently used code snippets with custom tags
* **Quick Search** - Find snippets using tags or content search
* **Snippet Management** - Edit, delete, and categorize snippets for efficient reuse
* **Context Menu Integration** - Access snippets directly from VS Code's context menu

### 🔄 File Dependency Graph

* **Visual Dependency Mapping** - See how your C++ files are connected through include relationships
* **Interactive Navigation** - Click on nodes to open files directly in the editor
* **Export Capabilities** - Save the dependency graph as an image for documentation

![Image](https://github.com/user-attachments/assets/27575677-d027-4f20-a150-69ffb948115a)

## 🛠️ Installation

1. Open Visual Studio Code
2. Go to Extensions (or press ```Ctrl+Shift+X```)
3. Search for "SmartCpp Analyser"
4. Click "Install"
5. Reload VS Code when prompted

### Prerequisites

* Visual Studio Code v1.60.0 or higher
* G++ compiler installed and available in PATH
* Internet connection for AI-powered error analysis

## 🔧 Usage

### Analyzing C++ Code

1. Open your C++ file in VS Code
2. Click the "Analyze C++" button in the editor toolbar (or use Command Palette: ```Ctrl+Shift+P``` → "Analyze C++ code")
3. View compilation results and select from available options:
    * 📝 Error Explanation - Get clear explanations of detected errors
    * 🛠️ How to Fix - View step by tep solutions
    * ✅ Get Fixed Code - See corrected code suggestions
![Image](https://github.com/user-attachments/assets/721f4a7d-ad2c-4d0d-8930-20a65d15b466)


### Managing Code Snippets
![Image](https://github.com/user-attachments/assets/e410c732-1cd9-4652-a188-57d7ddc3b15f)

1. To Save a snippet: 
    * Select code in your editor
    * Click "</> Snippets" in the editor toolbar
    * Select "Save Current Selection"
    * Add tag for easy accessability
2. To use a saved snippet:
    * Place the cursor where the snippet should be inserted
    * Click "</> Snippets" in the editor toolbar
    * Select "Insert Snippet"
    * Choose from your saved snippets using the tags
3. To Manage the snippets:
    * Click "</> Snippets" in the editor toolbar
    * Select "Manage Snippets"
    * Explore the options like Rename, Edit, Delete or Search a snippet.
![Image](https://github.com/user-attachments/assets/f47f2d88-522b-411f-9c81-4e7ac84ff4cf)




### Visualizing File Dependencies

1. Open a C++ project in VS Code
2. Click "Show Dependency Graph"" in the editor toolbar
3. Interact with the graph:
    * Pan and zoom to explore complex relationships
    * Hover over nodes for file path information
    * Click on nodes to open files
    * Export the graph as an image
    * ![Image](https://github.com/user-attachments/assets/b61a2971-6d8b-42af-b593-b5163036cdac)

## 🧩 Architecture
SmartCPP is built with a modular architecture consisting of:

* **Compiler Integration Module** - Embeds G++ compiler for real-time compilation
* **Error Analysis Module** - Leverages meta-llama/Llama-3.3-70B-Instruct-Turbo for intelligent error processing
* **Snippet Management Module** - Provides storage and retrieval of code snippets
* **Dependency Graph Module** - Visualizes file relationships using D3.js
* **UI Module** - Delivers an intuitive user interface for all features


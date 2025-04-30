// Load environment variables from a .env file
require('dotenv').config();
// Import 'node-fetch' dynamically to support both CommonJS and ESM environments
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// Retrieve the Together AI API key from environment variables
const apiKey = process.env.TOGETHER_API_KEY;
// If API key is missing, log an error and exit
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}
// Function to get fix steps for the provided code and error messages
async function getFixSteps(code, errorMsg) {
   // Construct the prompt to be sent to the Together AI API
    const userMessage = `
    Please analyze the following C++ code and its associated error messages carefully. Note that sometimes one error (for example, a missing closing parenthesis) can cause the compiler to report additional, misleading errors (such as a missing semicolon when it is already present).
    
    Your task is to:
    
    Determine the root cause of the errors.
    
    Distinguish between genuine errors and spurious ones caused by that underlying mistake.
    
    Provide clear, step-by-step correct fix code explanation  steps for only for primary errors in plain language. Format your response in a well-organized, good-looking format (using numbered steps, bullet points, headings, etc.), but do NOT include the complete fixed code.
    
    Explain why the errors are reported (for example, that a missing closing parenthesis causes cascading errors) and describe in words what needs to be changed to fix the issue.
    
    Only provide the root cause and the steps to fix it. Do not include code snippets, error explanations, reason for the error or corrected versions of the code.
    Error:
    ${errorMsg}
    
    Code:
    ${code}
        `;

    try {
         // Make POST request to the Together AI API
        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,// Include API key in header
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3-70b-chat-hf",// Specify the model to use
                prompt: userMessage,
                max_tokens: 5000,// Set max output token limit
                temperature: 0.0, // Set deterministic output
                stop: ["###"]// Define stop sequence to end generation
            })
        });
        // If response is not successful, throw error
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        // Parse the API response
        const result = await response.json();
        let fixSteps = result.choices?.[0]?.text?.trim();
        
        // Remove any introductory text before "Root cause"
        const rootCauseIndex = fixSteps.indexOf("Root cause:");
        if (rootCauseIndex > 0) {
            fixSteps = fixSteps.substring(rootCauseIndex);
        }
        
        return fixSteps || "No fix steps provided by the API";
    } catch (error) {
        // Return error message if something goes wrong
        return `Error getting fix steps: ${error.message}`;
    }
}

// Read input from stdin
// Handle input from stdin (useful when run as a CLI or from another process)
let inputData = '';
process.stdin.setEncoding('utf8');
// Collect data chunks from stdin
process.stdin.on('data', (chunk) => {
    inputData += chunk;
});
// Once all input data is received
process.stdin.on('end', async () => {
    try {
        if (!inputData) {
            throw new Error('No input data provided');
        }
        // Parse the received input JSON
        const { code, error } = JSON.parse(inputData);
        // Get fix steps using Together AI
        const fixSteps = await getFixSteps(code, error);
         // Output the result
        console.log(fixSteps);
    } catch (error) {
        // Log any errors and exit
        console.error(`⚠️ Error: ${error.message}`);
        process.exit(1);
    }
});



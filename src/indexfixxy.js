require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}

async function getFixSteps(code, errorMsg) {
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
        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3-70b-chat-hf",
                prompt: userMessage,
                max_tokens: 5000,
                temperature: 0.0,
                stop: ["###"]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        let fixSteps = result.choices?.[0]?.text?.trim();
        
        // Remove any introductory text before "Root cause"
        const rootCauseIndex = fixSteps.indexOf("Root cause:");
        if (rootCauseIndex > 0) {
            fixSteps = fixSteps.substring(rootCauseIndex);
        }
        
        return fixSteps || "No fix steps provided by the API";
    } catch (error) {
        return `Error getting fix steps: ${error.message}`;
    }
}

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    inputData += chunk;
});

process.stdin.on('end', async () => {
    try {
        if (!inputData) {
            throw new Error('No input data provided');
        }
        
        const { code, error } = JSON.parse(inputData);
        const fixSteps = await getFixSteps(code, error);
        console.log(fixSteps);
    } catch (error) {
        console.error(`⚠️ Error: ${error.message}`);
        process.exit(1);
    }
});



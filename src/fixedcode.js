// Load environment variables from a .env file into process.env
require('dotenv').config();
// Dynamically import 'node-fetch' to use fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// Load the Together API key from environment variables
const apiKey = process.env.TOGETHER_API_KEY;
// Check if the API key is provided, if not exit with an error
if (!apiKey) {
    console.error("❌ ERROR: Together API key is missing");
    console.error("Please set TOGETHER_API_KEY in your .env file");
    process.exit(1);
}
/**
 * Sends C++ code and its compilation error to the Together API
 * and returns a fixed version of the code.
 *
 * @param {string} code - The C++ code to be fixed.
 * @param {string} errorMsg - The compiler error message.
 * @returns {Promise<string>} - The fixed C++ code or an error message.
 */
async function getFixedCode(code, errorMsg) {
    // Validate API key presence again (redundant but safe)
    if (!apiKey) {
        console.error("❌ API Key is missing. Check your .env file.");
        return "Failed to retrieve fixed code (API key missing).";
    }
    // Validate that both code and error message are provided
    if (!code || !errorMsg) {
        console.error("❌ Missing code or error message");
        return "Failed to retrieve fixed code (invalid input).";
    }
     // Prompt sent to the language model
    const userMessage = `Fix these C++ compilation errors. Respond ONLY with the complete corrected code.\n\nErrors:\n${errorMsg}\n\nCode to fix:\n${code}\n\nCorrected code:`;
    
    try {
        // Send request to Together's API
        //console.log("Sending request to Together API...");
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
                temperature: 0.2,
                stop: ["\n\n\n"]
            }),
            timeout: 5000 // 5 seconds timeout
        });
        // Handle HTTP errors
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed: ${response.status} ${errorBody}`);
            return  `API request failed: ${response.status}`;
        }

        const result = await response.json();
        // Check for a valid response with choices
        if (!result.choices || result.choices.length === 0) {
            console.error("No choices returned in API response");
            return "No fixes returned from API";
        }
        // Extract the fixed code from the API response
        let fixedCode = result.choices[0].text.trim();
        // Strip any markdown code fences (e.g., ```cpp) and whitespace
        fixedCode = fixedCode.replace(/^[^#]*/, ''); // Remove anything before #include
         fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        // Sanity check for empty response
        if (!fixedCode) {
            console.error("Empty code response");
            return "Empty response from API";
        }
         // Truncate anything after the last closing brace (if any)
        const lastBraceIndex = fixedCode.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
            fixedCode = fixedCode.substring(0, lastBraceIndex + 1);
        }
        //console.log("Successfully received fixed code");
        return fixedCode;
    } catch (error) {
        console.error("❌ Error in getFixedCode:", error.message);
        return `API Error: ${error.message}`;
    }
}

// Read from stdin
// Collect input from stdin (e.g., when piped from another process)
let inputData = '';
process.stdin.on('data', (data) => {
    inputData += data.toString(); // Accumulate incoming data
});
// Once all data has been received from stdin, process it
process.stdin.on('end', async () => {
    try {
         // Parse the input JSON to extract code and error fields
        const { code, error } = JSON.parse(inputData);
        // Get the fixed code from the API
        const fixedCode = await getFixedCode(code, error);
        // Output the fixed code to stdout
        console.log(fixedCode);
    } catch (err) {
        console.error("Failed to process:", err instanceof Error ? err.message : String(err));
        console.log("Failed to retrieve fixed code");
    }
});

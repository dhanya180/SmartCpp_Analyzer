
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error("❌ ERROR: Together API key is missing");
    console.error("Please set TOGETHER_API_KEY in your .env file");
    process.exit(1);
}
async function getFixedCode(code, errorMsg) {
    if (!apiKey) {
        console.error("❌ API Key is missing. Check your .env file.");
        return "Failed to retrieve fixed code (API key missing).";
    }

    if (!code || !errorMsg) {
        console.error("❌ Missing code or error message");
        return "Failed to retrieve fixed code (invalid input).";
    }

    const userMessage = `Fix these C++ compilation errors. Respond ONLY with the complete corrected code.\n\nErrors:\n${errorMsg}\n\nCode to fix:\n${code}\n\nCorrected code:`;
    
    try {
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
            timeout: 5000 // 30 seconds timeout
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed: ${response.status} ${errorBody}`);
            return  `API request failed: ${response.status}`;
        }

        const result = await response.json();
        
        if (!result.choices || result.choices.length === 0) {
            console.error("No choices returned in API response");
            return "No fixes returned from API";
        }

        let fixedCode = result.choices[0].text.trim();
       // fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        fixedCode = fixedCode.replace(/^[^#]*/, ''); // Remove anything before #include
         fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        
        if (!fixedCode) {
            console.error("Empty code response");
            return "Empty response from API";
        }
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
let inputData = '';
process.stdin.on('data', (data) => {
    inputData += data.toString();
});

process.stdin.on('end', async () => {
    try {
        const { code, error } = JSON.parse(inputData);
        const fixedCode = await getFixedCode(code, error);
        console.log(fixedCode);
    } catch (err) {
        console.error("Failed to process:", err instanceof Error ? err.message : String(err));
        console.log("Failed to retrieve fixed code");
    }
});
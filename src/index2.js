// Load environment variables from a .env file
require('dotenv').config();

// Dynamically import node-fetch to support both CommonJS and ES Modules
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// Get the Together AI API key from environment variables
const apiKey = process.env.TOGETHER_API_KEY;
// If API key is missing, log an error and terminate the process
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}
// Main function to fetch explanation of compiler errors for given C++ code
async function getErrorExplanation(code, errorMsg) {
    // Construct a strict prompt with formatting and instructions for the LLM
    const userMessage = `
{
Follow all these instructions very strictly.
"instruction": "Analyze the following C++ code and its compiler error messages. Provide a clear and concise explanation in simple language for each error reported.Consider only error messages and Note messages in the input Error Message ${errorMsg}. For each error, describe what it means and indicate if it is a direct error in the code or a secondary error caused by an earlier mistake. If it is secondary, explain which underlying error is causing it. Do not provide code corrections or fixed code, only a plain language explanation of the errors.Dont write it in steps.DOnt write anything like step1,step2 and all.only the Below format should be used and no extra text should be there."Important"-Consider only error messages and Note messages in the input Error Message.Dont explain other that that.Do not provide code corrections or fixed code, only a plain language explanation of the errors.I repeat there should be no additional text or repetition.There should not be any extra text or repetition.There should not be any repetition.For one error write exactly only once in the format given below.
Use the following format without any additional text and without repetition:        
\n\n
**Error Message - <error message>**
**Explanation** - <explanation>  
**Type** - <direct/secondary>
\n\n
          
"
"Strict Instructions":"No repetiton should be there other than the format given above and no extra text should be there.Only the format given above should be there and no extra text should be there.The format need to be used for each error once once only.Dont write explanations for the same error again and again"
}
Code:
${code}

Error Message:
${errorMsg}
   ###END###`.trim();

    try {
         // Call the Together API with the formatted prompt
        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,// Use the API key in the request header
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", // Specifying the model
                prompt: userMessage, // Providing the prompt created above
                max_tokens: 2000,// Set the token limit for response
                temperature: 0.0, // Low temperature for deterministic output
                stop: ["###END###"]// Define stopping point for the model output
            })
        });
         // Parse the response JSON
        const result = await response.json();
        // Check for API errors
        if (result.error) {
            throw new Error(`❌ API Error: ${result.error.message}`);
        }
         // Extract and clean up the result text
        let extractedText = result.choices?.[0]?.text?.trim() || "{}";

        try {
             // Try to parse result as JSON if the model returned JSON
            const parsedJson = JSON.parse(extractedText);
            return parsedJson.error_summary || parsedJson.instruction || extractedText;
        } catch (error) {
             // If not JSON, attempt to extract explanation using regex
            extractedText = extractedText.replace(/```/g, "").trim();
             // Match blocks that follow the expected format
            const regex = /Error Message - (.*?)[,\n \n]\s*Explanation - (.*?)[,\n \n]\s*Type - (direct|secondary)(?=\n\n|$)/gsi;
            const matches = [...extractedText.matchAll(regex)];
             // Eliminate duplicate error messages using a Set
            const seen = new Set();
            const uniqueMatches = matches.filter(match => {
                const errorMsg = match[1].trim();
                if (seen.has(errorMsg)) return false;
                seen.add(errorMsg);
                return true;
            });
            // Reformat the results using the required format
            if (uniqueMatches.length > 0) {
                return uniqueMatches.map(match => {
                    return `Error Message - ${match[1].trim()}\nExplanation - ${match[2].trim()}\nType - ${match[3].trim()}`;
                }).join("\n\n");
            }
             // Return raw text if formatting failed
            return extractedText;
        }
    } catch (error) {
         // Catch and return any unexpected errors
        console.error("⚠️ Error:", error.message);
        return "Failed to retrieve error explanation.";
    }
}

// Handle input from stdin when called from extension.ts
// Support for usage via stdin (e.g., called from a VS Code extension)
if (!process.stdin.isTTY) {
    let inputData = '';
    // Collect input stream data
    process.stdin.on('data', chunk => {
        inputData += chunk.toString();
    });
     // Process input once stream ends
    process.stdin.on('end', async () => {
        try {
            // Parse the incoming JSON data
            const { code, error } = JSON.parse(inputData);
            // Call the explanation function
            const explanation = await getErrorExplanation(code, error);
             // Write the result to stdout
            process.stdout.write(explanation);
        } catch (err) {
            console.error("Error processing input:", err);
            process.stdout.write("Failed to process error explanation request.");
        }
    });
}
// Export the function for use in other modules (e.g., VS Code extension
module.exports = { getErrorExplanation };

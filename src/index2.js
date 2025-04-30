require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}

async function getErrorExplanation(code, errorMsg) {
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
        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                prompt: userMessage,
                max_tokens: 2000,
                temperature: 0.0,
                stop: ["###END###"]
            })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`❌ API Error: ${result.error.message}`);
        }

        let extractedText = result.choices?.[0]?.text?.trim() || "{}";

        try {
            const parsedJson = JSON.parse(extractedText);
            return parsedJson.error_summary || parsedJson.instruction || extractedText;
        } catch (error) {
            extractedText = extractedText.replace(/```/g, "").trim();
            const regex = /Error Message - (.*?)[,\n \n]\s*Explanation - (.*?)[,\n \n]\s*Type - (direct|secondary)(?=\n\n|$)/gsi;
            const matches = [...extractedText.matchAll(regex)];

            const seen = new Set();
            const uniqueMatches = matches.filter(match => {
                const errorMsg = match[1].trim();
                if (seen.has(errorMsg)) return false;
                seen.add(errorMsg);
                return true;
            });

            if (uniqueMatches.length > 0) {
                return uniqueMatches.map(match => {
                    return `Error Message - ${match[1].trim()}\nExplanation - ${match[2].trim()}\nType - ${match[3].trim()}`;
                }).join("\n\n");
            }
            return extractedText;
        }
    } catch (error) {
        console.error("⚠️ Error:", error.message);
        return "Failed to retrieve error explanation.";
    }
}

// Handle input from stdin when called from extension.ts
if (!process.stdin.isTTY) {
    let inputData = '';
    process.stdin.on('data', chunk => {
        inputData += chunk.toString();
    });
    
    process.stdin.on('end', async () => {
        try {
            const { code, error } = JSON.parse(inputData);
            const explanation = await getErrorExplanation(code, error);
            process.stdout.write(explanation);
        } catch (err) {
            console.error("Error processing input:", err);
            process.stdout.write("Failed to process error explanation request.");
        }
    });
}

module.exports = { getErrorExplanation };

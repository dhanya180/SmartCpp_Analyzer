// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// You are a C++ expert analyzing compile errors. Follow these rules STRICTLY:
// 1. Respond ONLY with a JSON object in this exact format:
// {
//   "error_summary": "Concise technical explanation",
//   "fixed_code": "Complete corrected code"
// }
// 2. Do NOT include any other text, comments, or markdown
// 3. Fix ONLY the reported error while preserving all other code
// 4. The error is: ${errorMsg}
// 5. The original code is:
// ${code}
//     `;

//     try {
//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3-70b-chat-hf", // Updated to Llama 3 chat model
//                 prompt: userMessage,
//                 max_tokens: 500,
//                 temperature: 0.3,
//                 stop: ["\n\n"] // Stop generation at double newlines to prevent duplicates
//             })
//         });

//         if (!response.ok) {
//             throw new Error(`API request failed with status ${response.status}`);
//         }

//         const result = await response.json();
//         let extractedText = result.choices?.[0]?.text?.trim();

//         // Advanced cleaning to handle API quirks
//         extractedText = extractedText
//             .replace(/^[^{]*/, '') // Remove anything before first {
//             .replace(/[^}]*$/, '')  // Remove anything after last }
//             .trim();

//         try {
//             const parsed = JSON.parse(extractedText);
            
//             if (!parsed.error_summary || !parsed.fixed_code) {
//                 throw new Error("Invalid response format");
//             }

//             console.log("Error Summary:", parsed.error_summary);
//             console.log("\nFixed Code:\n", parsed.fixed_code);
//         } catch (parseError) {
//             console.error("⚠️ Failed to parse API response. Trying manual extraction...");
            
//             // Fallback: Try to find the first valid JSON block
//             const jsonMatch = extractedText.match(/\{[\s\S]*?\}/);
//             if (jsonMatch) {
//                 try {
//                     const parsed = JSON.parse(jsonMatch[0]);
//                     console.log("Error Summary:", parsed.error_summary);
//                     console.log("\nFixed Code:\n", parsed.fixed_code);
//                 } catch {
//                     console.error("⚠️ Could not recover from malformed response");
//                     console.log("Raw response:", extractedText);
//                 }
//             } else {
//                 console.error("⚠️ No valid JSON found in response");
//                 console.log("Raw response:", extractedText);
//             }
//         }
//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//     }
// }

// // Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     await getErrorExplanation(codeSnippet, errorMsg);
// }

// main();


require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}

async function getFixedCode(code, errorMsg) {
    const userMessage = `
// Instructions:
// - Analyze the following C++ compile error.
// - The error is: ${errorMsg}
// - Respond ONLY with the complete fixed code.
// - Do NOT include any explanations, error summaries, or additional text.
// - Preserve all original code structure while fixing only the error.
// - The code is:
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
                max_tokens: 500,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        let fixedCode = result.choices?.[0]?.text?.trim();

        // Clean up the response to remove any non-code text
        fixedCode = fixedCode.replace(/```(cpp)?/g, '').trim();
        
        // Find the first occurrence of #include to locate the actual code start
        const codeStart = fixedCode.indexOf('#include');
        if (codeStart >= 0) {
            fixedCode = fixedCode.substring(codeStart);
        }

        console.log(fixedCode);
    } catch (error) {
        console.error("⚠️ Error:", error.message);
    }
}

// Example Usage
async function main() {
    const codeSnippet = `
    #include <iostream>
int main() {
    std::cout << "Hello World"
    return 0;
}
    `;
//`6:5: error: expected ';' before 'return'`
    const errorMsg =  `
    c++code.cpp: In function 'int main()':
c++code.cpp:4:5: error: expected ';' before 'return'
     return 0;
     ^~~~~~
    `;

    await getFixedCode(codeSnippet, errorMsg);
}

main();


// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getFixedCode(code, errorMsg) {
//     const userMessage = `
//  Instructions:
//  - Analyze the following C++ compile error.
//  - The error is: ${errorMsg}
//  - Respond ONLY with the complete fixed code.
//  - Do NOT include any explanations, error summaries, or additional text.
//  - Preserve all original code structure while fixing only the error.
//  - The code is:
// ${code}
//     `;

//     try {
//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3-70b-chat-hf",
//                 prompt: userMessage,
//                 max_tokens: 500,
//                 temperature: 0.2
//             })
//         });

//         if (!response.ok) {
//             throw new Error(`API request failed with status ${response.status}`);
//         }

//         const result = await response.json();
//         let fixedCode = result.choices?.[0]?.text?.trim();

//         // Clean up the response to remove any non-code text
//         fixedCode = fixedCode.replace(/```(cpp)?/g, '').trim();
        
//         // Find the first occurrence of #include to locate the actual code start
//         const codeStart = fixedCode.indexOf('#include');
//         if (codeStart >= 0) {
//             fixedCode = fixedCode.substring(codeStart);
//         }

//         console.log(fixedCode);
//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//     }
// }

// // Example Usage
// async function main() {
//     const codeSnippet = `
//    #include <iostream>
// int main() {
//     std::cout << "Hello World";
//    `;

//     const errorMsg =  `
//     c++code.cpp: In function 'int main()':
// c++code.cpp:3:31: error: expected '}' at end of input
//      std::cout << "Hello World";
//                                ^
//     `;

//     await getFixedCode(codeSnippet, errorMsg);
// }

// main();

/*
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}

async function getFixedCode(code, errorMsg) {
    const userMessage = `
STRICT INSTRUCTIONS:
1. Here is C++ code with error: ${errorMsg}
2. Provide COMPLETE fixed code including ALL original content
3. Preserve ALL original code structure
4. ONLY add what's needed to fix the error
5. PRESERVE THE ORIGINAL CODE WHICH IS WITHOUT ERRORS.
6. NEVER include explanations
7. Format must be valid C++ that compiles
8. Here's the code:
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
                max_tokens: 500,
                temperature: 0.2,
                stop: ["\n\n"] // Prevent excessive output
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        let fixedCode = result.choices?.[0]?.text?.trim();

        // Advanced cleaning while preserving all code
        fixedCode = fixedCode.replace(/```(cpp|json)?/g, '')
                           .replace(/^[^{]*\{/, '{') // Remove anything before first {
                           .replace(/\}[^}]*$/, '}')  // Remove anything after last }
                           .trim();

        // Ensure we have complete code structure
        if (!fixedCode.includes('int main()') && code.includes('int main()')) {
            fixedCode = code.split('{')[0] + fixedCode;
        }

        // Verify we have the complete code
        if (!fixedCode.includes('#include') && code.includes('#include')) {
            fixedCode = code.split('\n')[0] + '\n' + fixedCode;
        }

        console.log("COMPLETE FIXED CODE:");
        console.log(fixedCode);
    } catch (error) {
        console.error("⚠️ Error:", error.message);
    }
}

// Example Usage
async function main() {
    const codeSnippet = `#include <iostream>
int main() {
    std::cout << "Hello World";`;

    const errorMsg = `error: expected '}' at end of input`;

    await getFixedCode(codeSnippet, errorMsg);
}

main();
*/




// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getFixedCode(code, errorMsg) {
//     const userMessage = `I need you to fix this C++ code. The error is: ${errorMsg}
    
// Here's the code:
// ${code}

// Please respond with ONLY the complete fixed code, without any explanations or additional text. Start your response with #include if the original code had includes.`;

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
//                 temperature: 0.2,
//                 stop: ["\n\n\n"] // Add a stop sequence to prevent excessive output
//             })
//         });

//         if (!response.ok) {
//             const errorBody = await response.text();
//             throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
//         }

//         const result = await response.json();
        
//         if (!result.choices || result.choices.length === 0) {
//             throw new Error('No choices returned in API response');
//         }

//         let fixedCode = result.choices[0].text.trim();

//         // More robust cleaning of the response
//         fixedCode = fixedCode.replace(/^[^#]*/, ''); // Remove anything before #include
//         fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        
//         // Verify we actually got code back
//         if (!fixedCode.includes('#include') && !fixedCode.includes('main(')) {
//             throw new Error('Response does not contain valid code');
//         }

//         console.log('✅ Fixed code:');
//         console.log(fixedCode);
//         return fixedCode;
//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//         return null;
//     }
// }

// // Example Usage
// async function main() {
//     const codeSnippet = `
// #include <iostream>

// int main() {
//     int choice = 2;
    
//     switch (choice) {
//         case 1:
//             std::cout << "Option 1" << std::endl;
//             break
//         case 2:
//             std::cout << "Option 2" << std::endl
//         default:
//             std::cout << "Invalid" << std::endl;
//     }
    
//     return 0;
// }
//     `;
    
//     const errorMsg = `
// c++code.cpp: In function 'int main()':
// c++code.cpp:10:9: error: expected ';' before 'case'
//          case 2:
//          ^~~~
// c++code.cpp:12:9: error: expected ';' before 'default'
//          default:
//          ^~~~~~~
//     `;

//     const fixedCode = await getFixedCode(codeSnippet, errorMsg);
//     if (!fixedCode) {
//         console.error('Failed to get fixed code');
//     }
// }

// main();




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
        console.log("Sending request to Together API...");
        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3-70b-chat-hf",
                prompt: userMessage,
                max_tokens: 1000,
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
        //fixedCode = fixedCode.replace(/^[^#]*/, ''); // Remove anything before #include
        const includeIndex = fixedCode.indexOf('#include');
        if (includeIndex > 0) {
            fixedCode = fixedCode.substring(includeIndex);
        }
         fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        
         // NEW: Remove everything after the last closing brace
        const lastBraceIndex = fixedCode.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
            fixedCode = fixedCode.substring(0, lastBraceIndex + 1);
        }
        if (!fixedCode) {
            console.error("Empty code response");
            return "Empty response from API";
        }

        console.log("Successfully received fixed code");
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



// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error("❌ ERROR: Together API key is missing");
//     console.error("Please set TOGETHER_API_KEY in your .env file");
//     process.exit(1);
// }
// async function getFixedCode(code, errorMsg) {
//     if (!apiKey) {
//         console.error("❌ API Key is missing. Check your .env file.");
//         return "Failed to retrieve fixed code (API key missing).";
//     }

//     if (!code || !errorMsg) {
//         console.error("❌ Missing code or error message");
//         return "Failed to retrieve fixed code (invalid input).";
//     }

//      const userMessage = `Fix these C++ compilation errors. Respond ONLY with the complete corrected code.\n\nErrors:\n${errorMsg}\n\nCode to fix:\n${code}\n\nCorrected code:`;
    
//     try {
//         console.log("Sending request to Together API...");
//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3-70b-chat-hf",
//                 prompt: userMessage,
//                 max_tokens: 10000,
//                 temperature: 0.2,
//                 stop: ["\n\n\n"]
//             }),
//             timeout:30000 // 30 seconds timeout
//         });

//         if (!response.ok) {
//             const errorBody = await response.text();
//             console.error(`API request failed: ${response.status} ${errorBody}`);
//             return  `API request failed: ${response.status}`;
//         }

//         const result = await response.json();
        
//         if (!result.choices || result.choices.length === 0) {
//             console.error("No choices returned in API response");
//             return "No fixes returned from API";
//         }

//         let fixedCode = result.choices[0].text.trim();
//        // fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
//         fixedCode = fixedCode.replace(/^[^#]*/, ''); // Remove anything before #include
//          fixedCode = fixedCode.replace(/```(cpp|c\+\+)?/g, '').trim();
        
//           // NEW: Remove everything after the last closing brace
//         const lastBraceIndex = fixedCode.lastIndexOf('}');
//         if (lastBraceIndex !== -1) {
//             fixedCode = fixedCode.substring(0, lastBraceIndex + 1);
//         }
//         if (!fixedCode) {
//             console.error("Empty code response");
//             return "Empty response from API";
//         }

//         console.log("Successfully received fixed code");
//         return fixedCode;
//     } catch (error) {
//         console.error("❌ Error in getFixedCode:", error.message);
//         return `API Error: ${error.message}`;
//     }
// }

// // Read from stdin
// let inputData = '';
// process.stdin.on('data', (data) => {
//     inputData += data.toString();
// });

// process.stdin.on('end', async () => {
//     try {
//         const { code, error } = JSON.parse(inputData);
//         const fixedCode = await getFixedCode(code, error);
//         console.log(fixedCode);
//     } catch (err) {
//         console.error("Failed to process:", err instanceof Error ? err.message : String(err));
//         console.log("Failed to retrieve fixed code");
//     }
// });


// require('dotenv').config();

// // Use dynamic import() for node-fetch
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// // Retrieve API key from environment variables
// const apiKey = process.env.REPLICATE_API_KEY; // Use Replicate API Key
// if (!apiKey) {
//     console.error('API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
//  - DO NOT repeat any of the input.
//  - Do NOT include the code or error message in your output.
//  - Analyze the following C++ code and compile error.
//  - Provide ONLY a JSON object with one key:
//      "error_summary": a concise explanation of the compile error.
//     `;

//     // Step 1: Start the request
//     const response = await fetch("https://api.replicate.com/v1/predictions", {
//         method: "POST",
//         headers: {
//             "Authorization": `Token ${apiKey}`,
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             version: "meta/llama-2-7b-chat",
//             input: { prompt: userMessage, max_length: 200 }
//         })
//     });

//     const prediction = await response.json();
//     if (!prediction || !prediction.urls || !prediction.urls.get) {
//         throw new Error("Failed to start Llama 2 request.");
//     }

//     // Step 2: Poll the API until the response is ready
//     let output = null;
//     while (!output) {
//         await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying

//         const resultResponse = await fetch(prediction.urls.get, {
//             method: "GET",
//             headers: { "Authorization": `Token ${apiKey}` }
//         });

//         const resultData = await resultResponse.json();
//         if (resultData.status === "succeeded") {
//             output = resultData.output;
//         } else if (resultData.status === "failed") {
//             throw new Error("Llama 2 request failed.");
//         }
//     }

//     return output;
// }

// // Example usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `In function 'int main()':
// 6:5: error: expected ';' before 'return'
//      return 0;
//      ^~~~~~`;

//     try {
//         const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//         console.log('Explanation:', explanation);
//     } catch (err) {
//         console.error('Error getting explanation:', err);
//     }
// }

// main();

/*
require('dotenv').config();

// Use dynamic import() for node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Retrieve API key from environment variables
const apiKey = process.env.REPLICATE_API_KEY; // Use Replicate API Key
if (!apiKey) {
    console.error('API key is not set in environment variables.');
    process.exit(1);
}

async function getErrorExplanation(code, errorMsg) {
    const userMessage = `
Instructions:
- DO NOT repeat any of the input.
- Do NOT include the code or error message in your output.
- Analyze the following C++ code and compile error.
- Provide ONLY a JSON object with one key:
    "error_summary": a concise explanation of the compile error.
- The output MUST be a valid JSON object and nothing else.
- Example output:
{
  "error_summary": "Missing semicolon at the end of the statement."
}
    `;

    try {
        // Step 1: Start the request
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: "meta/llama-2-7b-chat",
                input: { prompt: userMessage, max_length: 200 }
            })
        });

        const prediction = await response.json();
        if (!prediction || !prediction.urls || !prediction.urls.get) {
            throw new Error("Failed to start Llama 2 request.");
        }

        // Step 2: Poll for completion (Max wait: 30 seconds)
        const startTime = Date.now();
        let output = null;

        while (!output) {
            if (Date.now() - startTime > 30000) { // 30-second timeout
                throw new Error("Llama 2 request took too long.");
            }

            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retrying

            const resultResponse = await fetch(prediction.urls.get, {
                method: "GET",
                headers: { "Authorization": `Token ${apiKey}` }
            });

            const resultData = await resultResponse.json();
            if (resultData.status === "succeeded") {
                output = resultData.output;
            } else if (resultData.status === "failed") {
                throw new Error("Llama 2 request failed.");
            }
        }

        // Ensure valid JSON format
        try {
            return JSON.parse(output);
        } catch (error) {
            throw new Error("Invalid JSON received from Llama 2.");
        }

    } catch (error) {
        console.error("Error getting explanation:", error.message);
        return { error_summary: "Failed to retrieve explanation. Please try again later." };
    }
}

// Example usage
async function main() {
    const codeSnippet = `#include <iostream>
int main() {
  std::cout << "Hello World"
  return 0;
}`;

    const errorMsg = `In function 'int main()':
6:5: error: expected ';' before 'return'
     return 0;
     ^~~~~~`;

    try {
        const explanation = await getErrorExplanation(codeSnippet, errorMsg);
        console.log('Explanation:', explanation);
    } catch (err) {
        console.error('Error getting explanation:', err);
    }
}

main();

*/

// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// // ✅ Print API Key to Verify if it is Loaded Correctly
// console.log("🔑 Loaded API Key:", process.env.REPLICATE_API_KEY);

// const apiKey = process.env.REPLICATE_API_KEY; // Use Replicate API Key
// if (!apiKey) {
//     console.error('❌ ERROR: API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with one key:
//     "error_summary": a concise explanation of the compile error.
// - The output MUST be a valid JSON object and nothing else.
// - Example output:
// {
//   "error_summary": "Missing semicolon at the end of the statement."
// }
//     `;

//     try {
//         console.log("🔄 Sending request to Replicate API...");

//         // ✅ Step 1: Start the request
//         const response = await fetch("https://api.replicate.com/v1/predictions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Token ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 version: "mistralai/mistral-7b-instruct", // Faster model
//                 input: { prompt: userMessage, max_length: 200 }
//             })
//         });

//         const prediction = await response.json();
//         console.log("📜 API Response:", JSON.stringify(prediction, null, 2)); // Debugging

//         // ✅ Step 2: Check for errors in the response
//         if (!prediction || !prediction.urls || !prediction.urls.get) {
//             throw new Error("❌ Failed to start request. API Response: " + JSON.stringify(prediction, null, 2));
//         }

//         console.log("⏳ Waiting for model to generate response...");

//         // ✅ Step 3: Poll for completion (Max wait: 60 seconds)
//         const startTime = Date.now();
//         let output = null;

//         while (!output) {
//             if (Date.now() - startTime > 60000) { // 60s timeout
//                 throw new Error("❌ Model request took too long.");
//             }

//             await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s

//             const resultResponse = await fetch(prediction.urls.get, {
//                 method: "GET",
//                 headers: { "Authorization": `Token ${apiKey}` }
//             });

//             const resultData = await resultResponse.json();
//             console.log("🔄 Polling Response:", JSON.stringify(resultData, null, 2)); // Debugging

//             if (resultData.status === "succeeded") {
//                 output = resultData.output;
//             } else if (resultData.status === "failed") {
//                 throw new Error("❌ Model request failed.");
//             }
//         }

//         console.log("✅ Received response!");

//         // ✅ Step 4: Ensure valid JSON format
//         try {
//             return JSON.parse(output);
//         } catch (error) {
//             throw new Error("❌ Invalid JSON received from Replicate.");
//         }

//     } catch (error) {
//         console.error("⚠️ Error getting explanation:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `In function 'int main()':
// 6:5: error: expected ';' before 'return'
//      return 0;
//      ^~~~~~`;

//     try {
//         const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//         console.log('📝 Explanation:', explanation);
//     } catch (err) {
//         console.error('❌ Error getting explanation:', err);
//     }
// }

// main();

/*
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

console.log("🔑 Loaded API Key:", process.env.REPLICATE_API_KEY);
const apiKey = process.env.REPLICATE_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: API key is not set in environment variables.');
    process.exit(1);
}

async function getErrorExplanation(code, errorMsg) {
    const userMessage = `
Instructions:
- DO NOT repeat any of the input.
- Do NOT include the code or error message in your output.
- Analyze the following C++ code and compile error.
- Provide ONLY a JSON object with one key:
    "error_summary": a concise explanation of the compile error.
- The output MUST be a valid JSON object and nothing else.
    `;

    try {
        console.log("🔄 Sending request to Replicate API...");

        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: "c61111a3b515bef679ee24497c63558ec88339ddea31be054877d41c046ff420", // Your available model version
                input: { prompt: userMessage, max_length: 200 }
            })
        });

        const prediction = await response.json();
        console.log("📜 API Response:", JSON.stringify(prediction, null, 2)); // Debugging

        if (!prediction || !prediction.urls || !prediction.urls.get) {
            throw new Error("❌ Failed to start request. API Response: " + JSON.stringify(prediction, null, 2));
        }

        console.log("⏳ Waiting for model to generate response...");
        const startTime = Date.now();
        let output = null;

        while (!output) {
            if (Date.now() - startTime > 60000) { // 60s timeout
                throw new Error("❌ Model request took too long.");
            }

            await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s

            const resultResponse = await fetch(prediction.urls.get, {
                method: "GET",
                headers: { "Authorization": `Token ${apiKey}` }
            });

            const resultData = await resultResponse.json();
            console.log("🔄 Polling Response:", JSON.stringify(resultData, null, 2)); // Debugging

            if (resultData.status === "succeeded") {
                output = resultData.output;
            } else if (resultData.status === "failed") {
                throw new Error("❌ Model request failed.");
            }
        }

        console.log("✅ Received response!");
        try {
            return JSON.parse(output);
        } catch (error) {
            throw new Error("❌ Invalid JSON received from Replicate.");
        }

    } catch (error) {
        console.error("⚠️ Error getting explanation:", error.message);
        return { error_summary: "Failed to retrieve explanation. Please try again later." };
    }
}

// ✅ Example Usage
async function main() {
    const codeSnippet = `#include <iostream>
int main() {
  std::cout << "Hello World"
  return 0;
}`;

    const errorMsg = `In function 'int main()':
6:5: error: expected ';' before 'return'
     return 0;
     ^~~~~~`;

    try {
        const explanation = await getErrorExplanation(codeSnippet, errorMsg);
        console.log('📝 Explanation:', explanation);
    } catch (err) {
        console.error('❌ Error getting explanation:', err);
    }
}

main();
*/

// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// const apiKey = process.env.REPLICATE_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with one key:
//     "error_summary": a concise explanation of the compile error.
// - The output MUST be a valid JSON object and nothing else.

// Error Message: ${errorMsg}
//     `;

//     try {
//         console.log("🔄 Sending request to Replicate API...");

//         const response = await fetch("https://api.replicate.com/v1/predictions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Token ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 version: "meta/llama-2-7b-chat", // LLaMA 2 on Replicate
//                 input: { prompt: userMessage, max_tokens: 200 }
//             })
//         });

//         const prediction = await response.json();
//         console.log("📜 API Response:", JSON.stringify(prediction, null, 2));

//         if (!prediction || !prediction.urls || !prediction.urls.get) {
//             throw new Error("❌ Failed to start request. API Response: " + JSON.stringify(prediction, null, 2));
//         }

//         console.log("⏳ Waiting for model to generate response...");
//         const startTime = Date.now();
//         let output = null;

//         while (!output) {
//             if (Date.now() - startTime > 60000) { // 60s timeout
//                 throw new Error("❌ Model request took too long.");
//             }

//             await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s

//             const resultResponse = await fetch(prediction.urls.get, {
//                 method: "GET",
//                 headers: { "Authorization": `Token ${apiKey}` }
//             });

//             const resultData = await resultResponse.json();
//             console.log("🔄 Polling Response:", JSON.stringify(resultData, null, 2));

//             if (resultData.status === "succeeded") {
//                 output = resultData.output;
//             } else if (resultData.status === "failed") {
//                 throw new Error("❌ Model request failed.");
//             }
//         }

//         console.log("✅ Received response!");
//         try {
//             return JSON.parse(output);
//         } catch (error) {
//             throw new Error("❌ Invalid JSON received from Replicate.");
//         }

//     } catch (error) {
//         console.error("⚠️ Error getting explanation:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     try {
//         const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//         console.log('📝 Explanation:', explanation);
//     } catch (err) {
//         console.error('❌ Error getting explanation:', err);
//     }
// }

// main();


// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.REPLICATE_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with one key:
//     "error_summary": a concise explanation of the compile error.
// - The output MUST be a valid JSON object and nothing else.

// Error Message: ${errorMsg}
//     `;

//     try {
//         console.log("🔄 Sending request to Replicate API...");

//         const response = await fetch("https://api.replicate.com/v1/predictions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Token ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 version: "meta/llama-2-7b-chat", // LLaMA 2 on Replicate
//                 input: { prompt: userMessage, max_tokens: 200 }
//             })
//         });

//         const prediction = await response.json();
//         console.log("📜 API Response:", JSON.stringify(prediction, null, 2));

//         if (!prediction || !prediction.urls || !prediction.urls.get) {
//             throw new Error("❌ Failed to start request. API Response: " + JSON.stringify(prediction, null, 2));
//         }

//         console.log("⏳ Waiting for model to generate response...");
//         const startTime = Date.now();
//         let output = null;

//         while (!output) {
//             if (Date.now() - startTime > 60000) { // 60s timeout
//                 throw new Error("❌ Model request took too long.");
//             }

//             await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s

//             const resultResponse = await fetch(prediction.urls.get, {
//                 method: "GET",
//                 headers: { "Authorization": `Token ${apiKey}` }
//             });

//             const resultData = await resultResponse.json();
//             console.log("🔄 Polling Response:", JSON.stringify(resultData, null, 2));

//             if (resultData.status === "succeeded") {
//                 output = resultData.output;
//             } else if (resultData.status === "failed") {
//                 throw new Error("❌ Model request failed.");
//             }
//         }

//         console.log("✅ Received response!");

//         // Fix: Join array elements into a single string and trim spaces
//         const formattedOutput = output.join("").trim();
//         console.log("📝 Formatted Output:", formattedOutput);

//         return JSON.parse(formattedOutput);

//     } catch (error) {
//         console.error("⚠️ Error getting explanation:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     try {
//         const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//         console.log('📝 Explanation:', explanation);
//     } catch (err) {
//         console.error('❌ Error getting explanation:', err);
//     }
// }

// main();



// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY; // Get API key from Together AI
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with one key:
//     "error_summary": a concise explanation of the compile error.
// - The output MUST be a valid JSON object and nothing else.

// Error Message: ${errorMsg}
//     `;

//     try {
//         console.log("🔄 Sending request to Together AI API...");

//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", // Updated model
//                 prompt: userMessage,
//                 max_tokens: 200
//             })
//         });

//         const result = await response.json();
//         console.log("📜 API Response:", JSON.stringify(result, null, 2));

//         if (result.error) {
//             throw new Error(`❌ API Error: ${result.error.message}`);
//         }

//         return { error_summary: result.choices?.[0]?.text?.trim() || "No response." };

//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//     console.log('📝 Explanation:', explanation);
// }

// main();


// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with one key:
//     "error_summary": a concise explanation of the compile error.
// - The output MUST be a valid JSON object and nothing else.

// Error Message: ${errorMsg}
//     `;

//     try {
//         console.log("🔄 Sending request to Together AI API...");

//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
//                 prompt: userMessage,
//                 max_tokens: 200
//             })
//         });

//         const result = await response.json();
//         console.log("📜 API Response:", JSON.stringify(result, null, 2));

//         if (result.error) {
//             throw new Error(`❌ API Error: ${result.error.message}`);
//         }

//         // Extract clean error summary
//         const extractedText = result.choices?.[0]?.text?.trim() || "No response.";
//         return { error_summary: extractedText.replace(/```/g, "").trim() }; // Remove Markdown formatting

//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//     console.log('📝 Explanation:', explanation);
// }

// main();


// require('dotenv').config();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const apiKey = process.env.TOGETHER_API_KEY;
// if (!apiKey) {
//     console.error('❌ ERROR: Together AI API key is not set in environment variables.');
//     process.exit(1);
// }

// async function getErrorExplanation(code, errorMsg) {
//     const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ code and compile error.
// - Provide ONLY a JSON object with this format:
//   {
//     "error_summary": "A clear and concise explanation of the compile error."
//   }
// - The output MUST be a valid JSON object and nothing else.

// Error Message: ${errorMsg}
//     `;

//     try {
//         console.log("🔄 Sending request to Together AI API...");

//         const response = await fetch("https://api.together.xyz/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${apiKey}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
//                 prompt: userMessage,
//                 max_tokens: 200
//             })
//         });

//         const result = await response.json();
//         console.log("📜 API Response:", JSON.stringify(result, null, 2));

//         if (result.error) {
//             throw new Error(`❌ API Error: ${result.error.message}`);
//         }

//         // Extract AI response
//         const extractedText = result.choices?.[0]?.text?.trim() || "{}";

//         // ✅ Ensure it returns a proper JSON format
//         try {
//             const parsedJson = JSON.parse(extractedText);
//             return parsedJson;
//         } catch (error) {
//             console.warn("⚠️ Invalid JSON format received. Returning as plain text.");
//             return { error_summary: extractedText.replace(/```/g, "").trim() };
//         }

//     } catch (error) {
//         console.error("⚠️ Error:", error.message);
//         return { error_summary: "Failed to retrieve explanation. Please try again later." };
//     }
// }

// // ✅ Example Usage
// async function main() {
//     const codeSnippet = `#include <iostream>
// int main() {
//   std::cout << "Hello World"
//   return 0;
// }`;

//     const errorMsg = `6:5: error: expected ';' before 'return'`;

//     const explanation = await getErrorExplanation(codeSnippet, errorMsg);
//     console.log('📝 Explanation:', explanation);
// }

// main();

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const apiKey = process.env.TOGETHER_API_KEY;
if (!apiKey) {
    console.error('❌ ERROR: Together AI API key is not set in environment variables.');
    process.exit(1);
}

async function getErrorExplanation(code, errorMsg) {
    const userMessage = `
// Instructions:
// - DO NOT repeat any of the input.
// - Do NOT include the code or error message in your output.
// - Analyze the following C++ compile error.
// - Provide ONLY a JSON object in this exact format:
//   {
//     "error_summary": "A concise explanation of the compile error."
//   }
// - The output MUST be a valid JSON object and nothing else.
// - If you cannot follow this format, provide only a short explanation.
{
    "error_summary": "simplify the error"
   }
Error Message: ${errorMsg}
    `;

    try {
        console.log("🔄 Sending request to Together AI API...");

        const response = await fetch("https://api.together.xyz/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                prompt: userMessage,
                max_tokens: 200
            })
        });

        const result = await response.json();
        console.log("📜 API Response:", JSON.stringify(result, null, 2));

        if (result.error) {
            throw new Error(`❌ API Error: ${result.error.message}`);
        }

        // Extract AI response text
        let extractedText = result.choices?.[0]?.text?.trim() || "No response.";

        // ✅ Step 1: Try to parse as JSON (ideal case)
        try {
            return JSON.parse(extractedText);
        } catch (error) {
            console.warn("⚠️ Invalid JSON format received. Formatting manually.");
            
            // ✅ Step 2: Remove unwanted symbols (`"```"`, `"``, newlines)
            extractedText = extractedText.replace(/```/g, "").trim();

            // ✅ Step 3: Extract a meaningful explanation
            const explanationMatch = extractedText.match(/error:\s*(.+)/i);
            const explanation = explanationMatch ? explanationMatch[1].trim() : extractedText;

            return { error_summary: explanation };
        }

    } catch (error) {
        console.error("⚠️ Error:", error.message);
        return { error_summary: "Failed to retrieve explanation. Please try again later." };
    }
}

// ✅ Example Usage
async function main() {
    const codeSnippet = `#include <iostream>
int main() {
  std::cout << "Hello World"
  return 0;
}`;

    const errorMsg = `6:5: error: expected ';' before 'return'`;

    const explanation = await getErrorExplanation(codeSnippet, errorMsg);
    console.log('📝 Explanation:', explanation);
}

main();

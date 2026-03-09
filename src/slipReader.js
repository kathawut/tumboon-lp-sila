'use strict';

const OpenAI = require('openai');

let openaiClient = null;

/**
 * Returns (or lazily initialises) the OpenAI client.
 *
 * @returns {OpenAI}
 */
function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Injects a custom OpenAI client (used in tests to provide a mock).
 *
 * @param {OpenAI} client
 */
function setOpenAIClient(client) {
  openaiClient = client;
}

/**
 * Analyses a base-64-encoded image of a Thai bank transfer slip and returns
 * the deposited amount as a number, or `null` if it cannot be determined.
 *
 * The function sends the image to OpenAI GPT-4o (vision) and asks it to
 * extract just the numeric transfer amount.  All Thai bank slip formats
 * (PromptPay, SCB, KBank, BBL, KTB, …) are handled by the model.
 *
 * @param {string} base64Image - Base-64-encoded image data (no data-URL prefix required).
 * @returns {Promise<number|null>} The deposit amount, or `null` on failure.
 */
async function readSlipAmount(base64Image) {
  const client = getOpenAIClient();

  const prompt =
    'This is a Thai bank transfer slip image. ' +
    'Extract ONLY the transfer amount (the money sent/deposited). ' +
    'Return ONLY the numeric value with up to 2 decimal places, nothing else. ' +
    'For example: 1500.00 or 250.50. ' +
    'If you cannot find a clear transfer amount, return the word "null".';

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
          },
        ],
      },
    ],
  });

  const raw = (response.choices[0]?.message?.content || '').trim();

  if (!raw || raw.toLowerCase() === 'null') {
    return null;
  }

  const numeric = parseFloat(raw.replace(/,/g, ''));
  if (isNaN(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

module.exports = { readSlipAmount, setOpenAIClient };

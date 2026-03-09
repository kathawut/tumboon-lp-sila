'use strict';

const { readSlipAmount, setOpenAIClient } = require('../src/slipReader');

afterEach(() => {
  setOpenAIClient(null);
});

function makeOpenAIClient(content) {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content } }],
        }),
      },
    },
  };
}

describe('readSlipAmount', () => {
  test('returns parsed amount for a valid numeric response', async () => {
    setOpenAIClient(makeOpenAIClient('1500.00'));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBe(1500);
  });

  test('returns parsed amount for a comma-formatted number', async () => {
    setOpenAIClient(makeOpenAIClient('10,500.50'));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBe(10500.5);
  });

  test('returns null when model responds with "null"', async () => {
    setOpenAIClient(makeOpenAIClient('null'));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBeNull();
  });

  test('returns null when model response is empty', async () => {
    setOpenAIClient(makeOpenAIClient(''));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBeNull();
  });

  test('returns null when model response is not a number', async () => {
    setOpenAIClient(makeOpenAIClient('cannot determine'));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBeNull();
  });

  test('returns null when parsed amount is zero or negative', async () => {
    setOpenAIClient(makeOpenAIClient('0'));
    const result = await readSlipAmount('base64imagedata');
    expect(result).toBeNull();
  });

  test('propagates errors thrown by the OpenAI client', async () => {
    const failingClient = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API error')),
        },
      },
    };
    setOpenAIClient(failingClient);
    await expect(readSlipAmount('base64imagedata')).rejects.toThrow('API error');
  });
});

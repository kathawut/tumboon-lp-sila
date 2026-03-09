'use strict';

const {
  handleFollow,
  handleTextMessage,
  handleImageMessage,
  streamToBuffer,
  formatAmount,
  handleEvent,
} = require('../src/lineHandler');
const { setOpenAIClient } = require('../src/slipReader');
const { Readable } = require('stream');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(overrides = {}) {
  return {
    replyMessage: jest.fn().mockResolvedValue({}),
    getMessageContent: jest.fn(),
    ...overrides,
  };
}

function makeEvent(type, messageOverrides = {}) {
  return {
    replyToken: 'test-reply-token',
    type,
    message: { id: 'msg-id-001', type: 'image', ...messageOverrides },
  };
}

function makeReadableStream(data) {
  const stream = new Readable({ read() {} });
  stream.push(data);
  stream.push(null);
  return stream;
}

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------

describe('formatAmount', () => {
  test('formats integer amount with two decimal places', () => {
    expect(formatAmount(1500)).toBe('1,500.00');
  });

  test('formats decimal amount correctly', () => {
    expect(formatAmount(250.5)).toBe('250.50');
  });

  test('formats large amount with thousand separators', () => {
    expect(formatAmount(100000)).toBe('100,000.00');
  });
});

// ---------------------------------------------------------------------------
// streamToBuffer
// ---------------------------------------------------------------------------

describe('streamToBuffer', () => {
  test('converts a readable stream to a Buffer', async () => {
    const stream = makeReadableStream(Buffer.from('hello'));
    const buf = await streamToBuffer(stream);
    expect(buf.toString()).toBe('hello');
  });

  test('rejects when the stream emits an error', async () => {
    const stream = new Readable({ read() {} });
    const promise = streamToBuffer(stream);
    stream.emit('error', new Error('stream error'));
    await expect(promise).rejects.toThrow('stream error');
  });
});

// ---------------------------------------------------------------------------
// handleFollow
// ---------------------------------------------------------------------------

describe('handleFollow', () => {
  test('replies with a welcome message', async () => {
    const client = makeClient();
    const event = makeEvent('follow');
    await handleFollow(event, client);

    expect(client.replyMessage).toHaveBeenCalledTimes(1);
    const [token, message] = client.replyMessage.mock.calls[0];
    expect(token).toBe('test-reply-token');
    expect(message.type).toBe('text');
    expect(message.text).toMatch(/สวัสดี/);
  });
});

// ---------------------------------------------------------------------------
// handleTextMessage
// ---------------------------------------------------------------------------

describe('handleTextMessage', () => {
  test('replies asking for a slip image', async () => {
    const client = makeClient();
    const event = makeEvent('message', { type: 'text', text: 'hello' });
    await handleTextMessage(event, client);

    const [, message] = client.replyMessage.mock.calls[0];
    expect(message.type).toBe('text');
    expect(message.text).toMatch(/สลิป/);
  });
});

// ---------------------------------------------------------------------------
// handleImageMessage
// ---------------------------------------------------------------------------

describe('handleImageMessage', () => {
  afterEach(() => {
    // Reset the OpenAI client mock after each test
    setOpenAIClient(null);
  });

  test('replies with the extracted amount on success', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '1500.00' } }],
          }),
        },
      },
    };
    setOpenAIClient(mockOpenAI);

    const stream = makeReadableStream(Buffer.from('fake-image-data'));
    const client = makeClient({ getMessageContent: jest.fn().mockResolvedValue(stream) });
    const event = makeEvent('message', { type: 'image', id: 'img-001' });

    await handleImageMessage(event, client);

    expect(client.replyMessage).toHaveBeenCalledTimes(1);
    const [, message] = client.replyMessage.mock.calls[0];
    expect(message.type).toBe('text');
    expect(message.text).toMatch(/1,500.00/);
    expect(message.text).toMatch(/บาท/);
  });

  test('replies with an error message when amount cannot be read', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'null' } }],
          }),
        },
      },
    };
    setOpenAIClient(mockOpenAI);

    const stream = makeReadableStream(Buffer.from('fake-image-data'));
    const client = makeClient({ getMessageContent: jest.fn().mockResolvedValue(stream) });
    const event = makeEvent('message', { type: 'image', id: 'img-002' });

    await handleImageMessage(event, client);

    const [, message] = client.replyMessage.mock.calls[0];
    expect(message.text).toMatch(/ไม่สามารถอ่านยอดเงิน/);
  });

  test('replies with an error message when getMessageContent throws', async () => {
    const client = makeClient({
      getMessageContent: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const event = makeEvent('message', { type: 'image', id: 'img-003' });

    await handleImageMessage(event, client);

    const [, message] = client.replyMessage.mock.calls[0];
    expect(message.text).toMatch(/เกิดข้อผิดพลาด/);
  });
});

// ---------------------------------------------------------------------------
// handleEvent (dispatcher)
// ---------------------------------------------------------------------------

describe('handleEvent', () => {
  test('dispatches follow events', async () => {
    const client = makeClient();
    const event = { replyToken: 'tok', type: 'follow', message: {} };
    await handleEvent(event, client);
    expect(client.replyMessage).toHaveBeenCalledTimes(1);
  });

  test('dispatches text message events', async () => {
    const client = makeClient();
    const event = { replyToken: 'tok', type: 'message', message: { type: 'text', text: 'hi' } };
    await handleEvent(event, client);
    expect(client.replyMessage).toHaveBeenCalledTimes(1);
  });

  test('ignores unknown event types', async () => {
    const client = makeClient();
    const event = { replyToken: 'tok', type: 'unsupported', message: {} };
    await handleEvent(event, client);
    expect(client.replyMessage).not.toHaveBeenCalled();
  });
});

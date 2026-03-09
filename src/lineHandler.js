'use strict';

const { readSlipAmount } = require('./slipReader');

/**
 * Processes all incoming LINE events.
 *
 * @param {object[]} events - Array of LINE webhook events
 * @param {object} client - LINE client instance
 * @returns {Promise<void>}
 */
async function handleLineEvents(events, client) {
  const tasks = events.map((event) => handleEvent(event, client));
  await Promise.all(tasks);
}

/**
 * Dispatches a single LINE event to the appropriate handler.
 *
 * @param {object} event - A LINE webhook event
 * @param {object} client - LINE client instance
 * @returns {Promise<void>}
 */
async function handleEvent(event, client) {
  if (event.type === 'follow') {
    return handleFollow(event, client);
  }

  if (event.type === 'message') {
    if (event.message.type === 'image') {
      return handleImageMessage(event, client);
    }
    if (event.message.type === 'text') {
      return handleTextMessage(event, client);
    }
  }
}

/**
 * Sends a welcome message when a user adds the LINE bot.
 *
 * @param {object} event - LINE follow event
 * @param {object} client - LINE client instance
 * @returns {Promise<void>}
 */
async function handleFollow(event, client) {
  const replyToken = event.replyToken;
  await client.replyMessage(replyToken, {
    type: 'text',
    text: 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบบริจาค\n\nกรุณาส่งรูปสลิปการโอนเงิน เพื่อให้เราตรวจสอบยอดเงินบริจาคของคุณ 🙏',
  });
}

/**
 * Handles a text message event (provides instructions to the user).
 *
 * @param {object} event - LINE message event with type 'text'
 * @param {object} client - LINE client instance
 * @returns {Promise<void>}
 */
async function handleTextMessage(event, client) {
  const replyToken = event.replyToken;
  await client.replyMessage(replyToken, {
    type: 'text',
    text: 'กรุณาส่งรูปภาพสลิปการโอนเงิน เพื่อให้เราอ่านยอดเงินบริจาคของคุณ 📷',
  });
}

/**
 * Handles an image message: downloads the image from LINE, extracts the
 * deposit amount via vision AI, and replies with the result.
 *
 * @param {object} event - LINE message event with type 'image'
 * @param {object} client - LINE client instance
 * @returns {Promise<void>}
 */
async function handleImageMessage(event, client) {
  const replyToken = event.replyToken;
  const messageId = event.message.id;

  try {
    const stream = await client.getMessageContent(messageId);
    const imageBuffer = await streamToBuffer(stream);
    const base64Image = imageBuffer.toString('base64');

    const amount = await readSlipAmount(base64Image);

    if (amount !== null) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `✅ อ่านสลิปสำเร็จ!\n\nยอดเงินบริจาค: ${formatAmount(amount)} บาท\n\nขอบคุณสำหรับการบริจาคครับ 🙏`,
      });
    } else {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '❌ ไม่สามารถอ่านยอดเงินจากสลิปได้\n\nกรุณาส่งรูปสลิปที่ชัดเจนอีกครั้ง หรือตรวจสอบว่ารูปภาพเป็นสลิปการโอนเงินจริง',
      });
    }
  } catch (err) {
    console.error('Error processing slip image:', err);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้ง',
    });
  }
}

/**
 * Converts a readable stream to a Buffer.
 *
 * @param {NodeJS.ReadableStream} stream
 * @returns {Promise<Buffer>}
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Formats a numeric amount with comma separators and two decimal places.
 *
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { handleLineEvents, handleEvent, handleFollow, handleTextMessage, handleImageMessage, streamToBuffer, formatAmount };

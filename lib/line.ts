import { Client, validateSignature } from '@line/bot-sdk'

const channelSecret = process.env.LINE_CHANNEL_SECRET || ''

let _client: Client | null = null

function getLineClient(): Client {
  if (!_client) {
    _client = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
      channelSecret,
    })
  }
  return _client
}

export { getLineClient as lineClient }

export function verifySignature(body: string, signature: string): boolean {
  return validateSignature(body, channelSecret, signature)
}

export async function downloadImage(messageId: string): Promise<Buffer> {
  const client = getLineClient()
  const stream = await client.getMessageContent(messageId)
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

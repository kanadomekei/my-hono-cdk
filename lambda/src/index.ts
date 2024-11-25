import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import * as os from 'os'

const app = new Hono()

interface UserBody {
  user: string;
}

app.get('/', (c) => {
  return c.text('Hello Hono from AWS Lambda!')
})

app.get('/hello', (c) => {
  return c.text('Hello Hono from AWS Lambda!!!!')
})

app.get('/runtime', (c) => {
  const runtimeInfo = {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptime: os.uptime(),
    memory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length
  }
  return c.json(runtimeInfo)
})

app.post('/data', async (c) => {
  const body: UserBody = await c.req.json()
  return c.json({ message: `Hello, ${body.user}` })
})

export const handler = handle(app)

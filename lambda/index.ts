import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono from AWS Lambda!')
})

app.get('/hello', (c) => {
  return c.text('Hello Hono from AWS Lambda!!!!')
})

export const handler = handle(app)

import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import * as os from 'os'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { ulid } from 'ulid'

const app = new Hono()
const ddbClient = new DynamoDB({})
const ddb = DynamoDBDocument.from(ddbClient)
const TABLE_NAME = process.env.TABLE_NAME!

interface UserBody {
  user: string;
}

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

app.get('/', (c) => {
  return c.text('Hello Hono from AWS Lambda!')
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

// Create user
app.post('/users', async (c) => {
  try {
    const body = await c.req.json()
    const user: User = {
      id: ulid(),
      name: body.name,
      email: body.email,
      createdAt: new Date().toISOString()
    }

    await ddb.put({
      TableName: TABLE_NAME,
      Item: user
    })

    return c.json(user, 201)
  } catch (err) {
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

// Get user
app.get('/users/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const result = await ddb.get({
      TableName: TABLE_NAME,
      Key: { id }
    })

    if (!result.Item) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json(result.Item)
  } catch (err) {
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

// Update user
app.put('/users/:id', async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    const result = await ddb.update({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set #name = :name, email = :email',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': body.name,
        ':email': body.email
      },
      ReturnValues: 'ALL_NEW'
    })

    return c.json(result.Attributes)
  } catch (err) {
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

// Delete user
app.delete('/users/:id', async (c) => {
  try {
    const { id } = c.req.param()
    await ddb.delete({
      TableName: TABLE_NAME,
      Key: { id }
    })

    return c.json({ message: 'User deleted' }, 200)
  } catch (err) {
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// List users
app.get('/users', async (c) => {
  try {
    const result = await ddb.scan({
      TableName: TABLE_NAME
    })

    return c.json(result.Items || [])
  } catch (err) {
    return c.json({ error: 'Failed to list users' }, 500)
  }
})

export const handler = handle(app)

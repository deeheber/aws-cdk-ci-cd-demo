import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { randomUUID } from 'crypto'

const dynamoDbClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoDbClient)
const TABLE_NAME = process.env.TABLE_NAME
if (!TABLE_NAME) {
  throw new Error('TABLE_NAME environment variable is not set')
}

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log('Event:', event)

  if (!event.body) {
    throw new Error('Missing request body')
  }

  const item = JSON.parse(event.body)
  const params = {
    TableName: TABLE_NAME,
    Item: { ...item, id: randomUUID() },
  }

  try {
    await docClient.send(new PutCommand(params))

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Item created successfully', item }),
    }
  } catch (error) {
    console.error('Error creating item:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to create item',
        error: errorMessage,
      }),
    }
  }
}

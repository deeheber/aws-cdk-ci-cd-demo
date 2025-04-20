import json
import logging
import os
import boto3

logger = logging.getLogger()
logger.setLevel("INFO")

session = boto3.Session()
dynamodb = session.resource('dynamodb')

table_name = os.environ.get('TABLE_NAME')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
  """
  Lambda function to list all items in a DynamoDB table.
  """

  logger.info(f"Received event: {event}")

  try:
    # Scan the table...not best practice for large datasets
    response = table.scan()
    items = response.get('Items', [])
    
    # Handle pagination if necessary
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))

    logger.info(f"Retrieved {len(items)} item{'s' if len(items) != 1 else ''} from the table.")

    body = {
        'items': items,
        'count': len(items)
    }

    return {
        'statusCode': 200,
        'body': json.dumps(body),
    }
  
  except Exception as e:
    logger.error(e)
    return {
        'statusCode': 500,
        'body': json.dumps({"error": str(e)})
    }

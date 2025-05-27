import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import {
  LambdaIntegration,
  Period,
  RestApi,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway'
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import {
  Architecture,
  DockerImageCode,
  DockerImageFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

interface CiCdDemoStackProps extends StackProps {
  stage: string
}

export class CiCdDemoStack extends Stack {
  constructor(scope: Construct, id: string, props: CiCdDemoStackProps) {
    super(scope, id, props)

    // Dynamodb table
    const tableId = `${id}-table`
    const table = new TableV2(this, tableId, {
      tableName: tableId,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      removalPolicy:
        props.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    })

    // Lambda functions
    // Create function
    const createFunctionLogGroupId = `${id}-create-func`
    const createFunctionLogGroup = new LogGroup(
      this,
      createFunctionLogGroupId,
      {
        logGroupName: createFunctionLogGroupId,
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    )
    const createFuncId = `${id}-create`
    const createFunction = new NodejsFunction(this, createFuncId, {
      functionName: createFuncId,
      runtime: Runtime.NODEJS_22_X,
      entry: 'functions/create/index.ts',
      logGroup: createFunctionLogGroup,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(20),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    })
    table.grantWriteData(createFunction)

    // List function
    const listFunctionLogGroupId = `${id}-list-func`
    const listFunctionLogGroup = new LogGroup(this, listFunctionLogGroupId, {
      logGroupName: listFunctionLogGroupId,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const listFuncId = `${id}-list`
    const listFunction = new DockerImageFunction(this, listFuncId, {
      functionName: listFuncId,
      code: DockerImageCode.fromImageAsset('functions/list'),
      logGroup: listFunctionLogGroup,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(20),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    })
    table.grantReadData(listFunction)

    // API Gateway
    const apiId = `${id}-api`
    const api = new RestApi(this, apiId, {
      restApiName: apiId,
      defaultMethodOptions: { apiKeyRequired: true },
      deployOptions: {
        stageName: 'v1',
      },
    })

    const endpoint = api.root.addResource('my-api')
    endpoint.addMethod('POST', new LambdaIntegration(createFunction))
    endpoint.addMethod('GET', new LambdaIntegration(listFunction))

    const usagePlan = new UsagePlan(this, `${apiId}-usage-plan`, {
      name: `${apiId}-usage-plan`,
      quota: {
        limit: 10_000,
        period: Period.DAY,
      },
    })
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    })
    const apiKey = api.addApiKey(`${apiId}-key`, {
      apiKeyName: `${apiId}-key`,
      description: `API key for the ${apiId}-usage-plan`,
    })
    usagePlan.addApiKey(apiKey)

    // Outputs
    new CfnOutput(this, `${apiId}-key`, { value: apiKey.keyId })
  }
}

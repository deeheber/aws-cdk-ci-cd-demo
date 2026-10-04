import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { test } from 'vitest'

import { CiCdDemoStack } from '../lib/ci-cd-demo-stack.js'

// Template assertions skip bundling; the separate synth check builds real assets.
const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } })
const environment = { account: '111111111111', region: 'us-east-1' }
const development = new CiCdDemoStack(app, 'dev-ci-cd-demo', {
  stage: 'dev',
  env: environment,
})
const production = new CiCdDemoStack(app, 'prod-ci-cd-demo', {
  stage: 'prod',
  env: environment,
})
const developmentTemplate = Template.fromStack(development)
const productionTemplate = Template.fromStack(production)

test.each([
  ['POST', 'dev-ci-cd-demo-create'],
  ['GET', 'dev-ci-cd-demo-list'],
])('%s /my-api requires an API key and invokes %s', (method, functionName) => {
  const [resourceId] = Object.keys(
    developmentTemplate.findResources('AWS::ApiGateway::Resource', {
      Properties: { PathPart: 'my-api' },
    }),
  )
  const [functionId] = Object.keys(
    developmentTemplate.findResources('AWS::Lambda::Function', {
      Properties: { FunctionName: functionName },
    }),
  )

  developmentTemplate.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: method,
    ResourceId: { Ref: resourceId },
    ApiKeyRequired: true,
    Integration: {
      Type: 'AWS_PROXY',
      Uri: {
        'Fn::Join': [
          '',
          Match.arrayWith([{ 'Fn::GetAtt': [functionId, 'Arn'] }]),
        ],
      },
    },
  })
})

test.each([
  ['development', developmentTemplate, 'Delete'],
  ['production', productionTemplate, 'Retain'],
])('%s table has the expected cleanup policy', (_stage, template, policy) => {
  template.hasResource('AWS::DynamoDB::GlobalTable', {
    DeletionPolicy: policy,
    UpdateReplacePolicy: policy,
  })
})

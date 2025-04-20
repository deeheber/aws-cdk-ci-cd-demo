#!/usr/bin/env node
import { App } from 'aws-cdk-lib'

import { CiCdDemoStack } from '../lib/ci-cd-demo-stack'

// Environment variables validation
if (!process.env.CDK_DEFAULT_ACCOUNT || !process.env.CDK_DEFAULT_REGION) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT or CDK_DEFAULT_REGION is not set...did you authenticate with the AWS CLI?',
  )
}
if (!process.env.STAGE) {
  throw new Error(
    'STAGE is not set. i.e. Development, Staging, Production, Sandbox etc.',
  )
}

const stage = process.env.STAGE.toLowerCase().slice(0, 4)

const app = new App()
new CiCdDemoStack(app, `${stage}-ci-cd-demo`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stage,
})

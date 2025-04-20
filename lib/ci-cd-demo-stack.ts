import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface CiCdDemoStackProps extends StackProps {
  stage: string
}

export class CiCdDemoStack extends Stack {
  constructor(scope: Construct, id: string, props: CiCdDemoStackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkCiCdDemoQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

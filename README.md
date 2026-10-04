# AWS CI/CD Demo

A minimal AWS CDK for TypeScript and GitHub Actions demo, as shown on [The Zacks' Show Talking AWS](https://www.youtube.com/watch?v=Q7I4YqwpX5M0).

The stack deploys API Gateway, DynamoDB, and Node.js and Python Lambda functions to create and list items. Both API routes require an API key. [API keys support usage plans; they aren't user authentication](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html).

## Prerequisites

- Node.js 24 LTS and npm.
- An AWS account and the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) with [configured credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html).
- Docker running, for example [Docker Desktop](https://www.docker.com/products/docker-desktop/), to build the Python Lambda image.

## Get started locally

```bash
git clone https://github.com/deeheber/aws-cdk-ci-cd-demo.git
cd aws-cdk-ci-cd-demo
nvm use # If you use nvm; otherwise select Node.js 24 with your version manager.
npm ci
npm run build
npm test
```

`npm run build` checks TypeScript, formatting (Oxfmt), and lint (Oxlint). `npm test` runs the Vitest infrastructure examples without AWS credentials or Docker builds.

These examples use `us-east-1`, matching the workflows:

```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
export STAGE=development
aws sts get-caller-identity
```

Omit `AWS_PROFILE` if you use default credentials. For an SSO profile, run `aws sso login --profile "$AWS_PROFILE"` first. Verify that the returned account is the one you intend to deploy into.

[Bootstrap each target account and region](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) before its first CDK deployment:

```bash
npm run cdk -- bootstrap "aws://$(aws sts get-caller-identity --query Account --output text)/$AWS_REGION"
npm run synth
npm run diff
npm run deploy
```

### Stage names

The app lowercases `STAGE` and takes its first four characters to form the stack name:

| `STAGE`       | Stack name        | Table cleanup policy |
| ------------- | ----------------- | -------------------- |
| `development` | `deve-ci-cd-demo` | Delete               |
| `staging`     | `stag-ci-cd-demo` | Delete               |
| `production`  | `prod-ci-cd-demo` | Retain               |

Use the same stage value for local commands and the corresponding GitHub environment. Any value starting with `prod` uses the retention policy. Values with the same first four characters target the same stack in a given account and region.

## Call the API

After deployment, copy the API endpoint and API key ID from the stack outputs. Fetch the key value using the same AWS credentials:

```bash
aws apigateway get-api-key --region "$AWS_REGION" \
  --api-key your-api-key-id --include-value --query value --output text
```

Append `my-api` to the output endpoint, which already includes `/v1/`:

```bash
API_URL='https://api-id.execute-api.us-east-1.amazonaws.com/v1/my-api'
API_KEY='your-api-key-value'

curl "$API_URL" --header "x-api-key: $API_KEY"

curl "$API_URL" \
  --header "x-api-key: $API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Danielle Heberling","species":"Human"}'
```

POST assigns each item a generated `id`. Request validation is minimal, and listing uses a DynamoDB scan.

## Configure GitHub Actions

1. [Configure GitHub OIDC access to AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) in each target account. I used a fork of [this OIDC CDK example](https://github.com/aws-samples/github-actions-oidc-cdk-construct). Match your repository's subject format and the GitHub environment names in the role's trust policy.
2. Bootstrap each target account in the deployment region (`us-east-1` in these workflows). The assumed roles need access to the CDK bootstrap roles for lookup, asset publishing, and deployment. CI uses a change-set diff, so it also needs access to the bootstrap deploy role to create and delete change sets.
3. Create [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) with an `AWS_ROLE_TO_ASSUME` secret and a `STAGE` variable in each:

   | GitHub environment | `STAGE`       | Target account |
   | ------------------ | ------------- | -------------- |
   | `ci`               | `development` | Development    |
   | `development`      | `development` | Development    |
   | `staging`          | `staging`     | Staging        |
   | `production`       | `production`  | Production     |

   Add approval rules to `production` if you want a manual deployment gate.

4. For failure notifications, create a [Slack app](https://docs.slack.dev/tools/slack-github-action/sending-data-slack-api-method/) with `chat:write`, install it in your workspace, and invite it to the channel. Add repository secrets `SLACK_DEPLOY_BOT_TOKEN` and `DEVOPS_NOTIFICATIONS_SLACK_CHANNEL_ID`. To run without Slack, remove the `notify-slack-if-failure` job from `deploy.yml`.

### Workflow triggers

| Trigger                            | Workflow                                                     | Behavior                                                            |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| PR targeting `main`, or manual run | [ci.yml](.github/workflows/ci.yml)                           | Typecheck, format/lint checks, tests, synth, and a change-set diff. |
| Push to `main`                     | [dev-deploy.yml](.github/workflows/dev-deploy.yml)           | Deploy to development.                                              |
| Push a tag matching `release-*`    | [stg-prod-deploy.yml](.github/workflows/stg-prod-deploy.yml) | Deploy to staging, then production if staging succeeds.             |
| Manual run with `GH-ENV`           | [deploy.yml](.github/workflows/deploy.yml)                   | Deploy to the selected environment.                                 |

CI posts the diff to the PR and allows destructive changes. Failed deployments notify Slack. Release deployments use the tagged commit; publishing a GitHub release only triggers deployment if it creates a matching tag push.

## Clean up

Using the same AWS credentials, region, and `STAGE` as the deployment:

```bash
npm run cdk -- destroy
```

Development and staging tables are deleted with their stacks. Production retains its table, such as `prod-ci-cd-demo-table`, including on replacement. This blocks redeployment with the same name. Delete the retained table only when you no longer need its data, or use a stage with a different normalized prefix.

The CDK bootstrap stack and its asset storage remain after destroying the demo stack.

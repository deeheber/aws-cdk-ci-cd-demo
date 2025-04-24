# AWS CI/CD Demo

This is a repo with minimal code to demo a way to do CI/CD with the AWS CDK for TypeScript and Github Actions.

## How to use

### Prerequisites

1. Install Node.js
2. Ensure you have at least one AWS account, install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), and [configure your credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
3. Install Docker - I personally like to use [Docker Desktop](https://www.docker.com/products/docker-desktop/)
4. Needed for CI/CD: [configure the AWS accounts you would like Github actions to deploy into](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) - I personally forked [this repo](https://github.com/aws-samples/github-actions-oidc-cdk-construct), did some light edits, and ran `cdk deploy` to provision the OIDC identity provider + role for Github actions to assume into my development, staging, and production AWS accounts.
5. Needed for CI/CD slack notifications: [setup a Slack bot](https://api.slack.com/quickstart) with `chat:write` permissions. Add [repo level secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository) for `DEVOPS_NOTIFICATIONS_SLACK_CHANNEL_ID` and `SLACK_DEPLOY_BOT_TOKEN` into Github. 
6. Needed for CI/CD: set up [Github Environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment#creating-an-environment) for `ci`, `development`, `staging`, and `production`. Add in a secret in each env for `AWS_ROLE_TO_ASSUME`. Add in and env var in each env for `STAGE`.

### Quickstart
1. Clone the repo
2. Run `npm install`
3. Run `export AWS_PROFILE=<your_aws_profile>`
   - Optional if you have a default profile or use `--profile` instead
   - There's also other ways to do this too if preferred
3. Run `export STAGE=<your_stage_name>`
4. Run `npm run deploy`

### Use
This is a minimal API Gateway with API Key auth > Lambda > DynamoDB setup

- Get the API Key id and URL from the stack output of the `cdk deploy`
- Run ``aws apigateway get-api-key --api-key your-api-id --include-value` > copy the value
- add `/my-api` to the end of the url
- Run a curl command or use something like Postman to make API calls something like
```bash
curl --location 'https://api-id.execute-api.aws-region.amazonaws.com/v1/my-api' \
--header 'x-api-key: your-api-key
```
- There's also a POST endpoint where you can input anything in the body (not best practice but this is minimal demo of CI/CD not code)
```bash
curl --location 'https://api-id.execute-api.aws-region.amazonaws.com/v1/my-api' \
--header 'x-api-key: your-api-key' \
--header 'Content-Type: application/json' \
--data '{
    "name": "Danielle Heberling",
    "species": "Human"
}'
```

### CI/CD
1. If you open a PR against the `main` branch it will run the `.github/workflows/ci.yml` workflow to run some CI checks.
2. Merging into `main` will trigger the `.github/workflows/dev-deploy.yml` workflow to deploy to dev.
3. Creating a Github release (or git tag) that starts with `release-*` triggers a deploy to staging via `.github/workflows/stg-prod-deploy.yml`. In that same workflow if a deploy to stg succeeds, it will deploy it to prod.
4. If any of the deployments fail, a message will be sent to the designated slack channel.

## Useful commands

- `npm run build` runs all of the commands that would be run in CI locally on your machine
- `npm run deploy` deploys to the AWS account your AWS CLI is logged into (ideally this is a developer's own AWS account)
- `npm run diff` runs `cdk diff` against the AWS account your CLI is logged into to see what changes would happen if you deploy

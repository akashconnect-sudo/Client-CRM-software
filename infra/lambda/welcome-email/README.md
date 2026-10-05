# Lambda: Welcome Email

Sends a **large, professional** welcome email after a user’s first CRM dashboard visit.

## Flow

1. User registers / signs in → opens **Dashboard**
2. Frontend `POST /api/auth/triggers/welcome`
3. CRM enqueues `EmailJob(WELCOME)`, claims `PROCESSING`
4. CRM **invokes this Lambda** (`RequestResponse`)
5. Lambda builds HTML + sends via **SES** (or SMTP fallback)
6. CRM marks job `SENT` + `users.welcome_email_sent_at`

## Payload (direct invoke)

```json
{
  "to": "user@example.com",
  "name": "Akash",
  "companyName": "Acme Sales",
  "role": "SUPER_ADMIN",
  "dashboardUrl": "https://salesleadcrm.duckdns.org/dashboard",
  "siteUrl": "https://salesleadcrm.duckdns.org",
  "userId": "uuid",
  "jobId": "uuid",
  "companyId": "uuid"
}
```

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `MAIL_FROM` | Yes | e.g. `Sales Lead CRM <salesleadcrm@gmail.com>` |
| `MAIL_TRANSPORT` | No | `ses` (default) or `smtp` |
| `SITE_URL` | No | Default link base (`https://salesleadcrm.duckdns.org`) |
| `SES_REGION` / `AWS_REGION` | SES | Region where identity is verified |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP mode | Gmail App Password works |

**SES:** verify domain or sender email in Amazon SES (move out of sandbox for production).

## IAM (execution role)

- `ses:SendEmail`, `ses:SendRawEmail` (if using SES)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- No VPC needed unless you force private SMTP

CRM EC2 / IAM user needs: `lambda:InvokeFunction` on this function ARN.

## Deploy

```bash
cd infra/lambda/welcome-email
npm ci
# zip index.js template.js package.json node_modules
Compress-Archive -Path index.js,template.js,package.json,node_modules -DestinationPath function.zip -Force

aws lambda create-function \
  --function-name crm-welcome-email \
  --runtime nodejs20.x \
  --handler index.handler \
  --role arn:aws:iam::ACCOUNT:role/crm-welcome-email-role \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={MAIL_FROM=Sales Lead CRM <you@domain.com>,MAIL_TRANSPORT=ses,SITE_URL=https://salesleadcrm.duckdns.org}"
```

Update existing:

```bash
aws lambda update-function-code --function-name crm-welcome-email --zip-file fileb://function.zip
```

## CRM `.env`

```env
WELCOME_EMAIL_LAMBDA_NAME=crm-welcome-email
AWS_REGION=ap-south-1
# Same AWS keys / instance role that can invoke Lambda
```

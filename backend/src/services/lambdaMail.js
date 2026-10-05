import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { env } from '../config/env.js';

let lambdaClient;

function getLambda() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({
      region: env.awsRegion || 'us-east-1',
    });
  }
  return lambdaClient;
}

/**
 * Invoke welcome-email Lambda for any transactional mail (OTP / WELCOME).
 * EC2 outbound SMTP to Gmail is often blocked — Lambda path is the reliable one.
 */
export async function invokeMailLambda(payload) {
  const functionName = env.welcomeEmailLambdaName;
  if (!functionName) {
    return { sent: false, error: 'WELCOME_EMAIL_LAMBDA_NAME_NOT_CONFIGURED' };
  }

  try {
    const out = await getLambda().send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    if (out.FunctionError) {
      const raw = out.Payload ? Buffer.from(out.Payload).toString('utf8') : out.FunctionError;
      return { sent: false, error: `LAMBDA_ERROR:${String(raw).slice(0, 200)}` };
    }

    let body = {};
    if (out.Payload) {
      try {
        body = JSON.parse(Buffer.from(out.Payload).toString('utf8'));
      } catch {
        body = {};
      }
    }

    if (body && typeof body.body === 'string') {
      try {
        body = JSON.parse(body.body);
      } catch {
        /* keep */
      }
    }

    if (body?.ok && body?.sent !== false) {
      console.log('[Lambda mail]', {
        type: payload.type || 'WELCOME',
        to: body.to || payload.to,
        provider: body.provider,
        messageId: body.messageId || null,
      });
      return {
        sent: true,
        provider: body.provider || 'lambda',
        messageId: body.messageId || null,
        to: body.to || payload.to,
      };
    }

    return {
      sent: false,
      error: String(body?.error || 'LAMBDA_SEND_FAILED').slice(0, 500),
    };
  } catch (err) {
    console.error('[Lambda mail invoke failed]', err.message);
    return { sent: false, error: err.message || 'LAMBDA_INVOKE_FAILED' };
  }
}

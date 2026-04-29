import { RateLimiter } from '../../infrastructure/RateLimiter.mjs'
import { callbackify } from '@overleaf/promise-utils'
import Settings from '@overleaf/settings'
import EmailHelper from '../Helpers/EmailHelper.mjs'

const rateLimiterLoginEmail = new RateLimiter(
  'login',
  Settings.rateLimit?.login?.email || {
    points: 1000,
    duration: 120,
  }
)

async function processLoginRequest(email) {
  const parsed = EmailHelper.parseEmail(email)
  if (!parsed) {
    return false
  }
  try {
    await rateLimiterLoginEmail.consume(parsed, 1, {
      method: 'email',
    })
    return true
  } catch (err) {
    if (err instanceof Error) {
      throw err
    } else {
      return false
    }
  }
}

async function recordSuccessfulLogin(email) {
  const parsed = EmailHelper.parseEmail(email)
  if (parsed) {
    await rateLimiterLoginEmail.delete(parsed)
  }
}

const LoginRateLimiter = {
  processLoginRequest: callbackify(processLoginRequest),
  recordSuccessfulLogin: callbackify(recordSuccessfulLogin),
}
LoginRateLimiter.promises = {
  processLoginRequest,
  recordSuccessfulLogin,
}

export default LoginRateLimiter

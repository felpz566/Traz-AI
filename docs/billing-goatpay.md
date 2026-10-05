# TRAZ billing — GoatPay

The production billing integration should keep all GoatPay credentials server-side.

Recommended environment variables:

- GOATPAY_API_TOKEN — production API token from GoatPay.
- GOATPAY_API_BASE_URL — https://api.goatpayments.com.br/api/public/v1
- GOATPAY_WEBHOOK_SECRET — secret used to verify the HMAC signature of incoming webhooks.
- GOATPAY_WEBHOOK_URL — public HTTPS endpoint configured in GoatPay, e.g. https://<domain>/api/webhooks/goatpay
- TRAZ_APP_URL — canonical TRAZ URL.
- TRAZ_INTERNAL_SECRET — internal server-to-server secret for protected billing operations.
- TRAZ_BILLING_ENV — production or sandbox.

Optional:
- GOATPAY_ACCOUNT_ID — only if the API/dashboard provides a merchant/account identifier required by the chosen endpoint.
- GOATPAY_WEBHOOK_ID — only if GoatPay exposes/needs a webhook identifier for management.
- GOATPAY_API_TIMEOUT_MS — optional server-side request timeout.

Never use NEXT_PUBLIC_ for API tokens, webhook secrets, internal secrets, or payment credentials.

GoatPay's current public documentation says API requests use an API token, and its current terms state that webhooks use HMAC signatures. The exact signature header/canonicalization should be implemented from the active GoatPay API documentation rather than guessed.

The webhook handler must be idempotent: persist the event/transaction identifier before fulfillment, verify the signature, and return a 2xx response promptly after durable acceptance. Do not unlock a paid plan from a browser redirect alone; payment confirmation must come from the server-side payment status/webhook flow.

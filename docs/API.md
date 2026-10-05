# TRAZ AI API v1

Base path: `/api/v1`

## Authentication

Use a TRAZ API key with:

```
Authorization: Bearer nxs_...
```

API keys are created and revoked from TRAZ Settings. Never commit a key to source control.

## Models

`GET /api/v1/models`

Returns the TRAZ model catalog and plan tier.

## Responses

`POST /api/v1/responses`

Example:

```json
{
  "model": "traz-1-fast",
  "input": "Explain event-driven architecture."
}
```

## Chat Completions

`POST /api/v1/chat/completions`

Compatible with the common OpenAI-style request shape:

```json
{
  "model": "traz-1-fast",
  "messages": [
    { "role": "user", "content": "Hello, TRAZ!" }
  ],
  "stream": false
}
```

Set `stream: true` to receive Server-Sent Events and finish with `data: [DONE]`.

## Errors

Errors use JSON:

```json
{ "error": "Description" }
```

Plan access and monthly usage quotas are enforced server-side.

# ENTRAL Security And Authorization

ENTRAL v0.4 is designed around approval-gated execution.

## Core Rule

No external side effect should happen without explicit user authorization.

This includes sending email, creating calendar events, deploying, publishing products or listings, posting to social media, charging money, editing external files, or running browser automation against external systems.

## Authorization Levels

- `not_required`: local conversation or harmless UI command
- `recommended`: research/mock plan or low-risk external planning
- `required`: mutation, publishing, communication, money movement, deployment, or high-risk action

## Audit Records

AI Brain audit entries track plan ID, user request, intent, plan summary, tools used, entities changed, provider name, model name, authorization status, execution result, errors, and timestamp.

## Credential Rules

Credentials must never be exposed to the frontend. The frontend can show credential names such as `OPENAI_API_KEY`, but not values.

## AI Provider Rule

OpenAI is the first backend-only AI provider. Missing `OPENAI_API_KEY` is not fatal; ENTRAL reports `AI Provider Not Connected` and remains in Mock Mode. Provider JSON is validated before it can influence classification or action plans.

## Current Limit

External providers beyond OpenAI are not truly connected. Connection Center test/mock actions are safe simulations for those tools.

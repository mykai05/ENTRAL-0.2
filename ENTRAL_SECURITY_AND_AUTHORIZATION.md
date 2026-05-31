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

AI Brain audit entries track plan ID, user request, intent, plan summary, tools used, entities changed, authorization status, execution result, and timestamp.

## Credential Rules

Credentials must never be exposed to the frontend. The frontend can show credential names such as `OPENAI_API_KEY`, but not values.

## Current Limit

External providers are not truly connected except the existing OpenAI chat path. Connection Center test/mock actions are safe simulations.

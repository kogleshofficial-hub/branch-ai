# BRANCH

**Decision intelligence for uncertain choices.**

BRANCH turns a messy real-world decision into a structured model of options, variables, assumptions, risks, dependencies and scenarios. Instead of returning a single AI recommendation, BRANCH helps people inspect the reasoning and explore what changes when assumptions change.

## Current build

- Next.js 15 App Router + TypeScript
- Responsive product UI
- Deterministic decision-analysis and scoring engine
- API route for validated analysis
- Appwrite authentication shell
- Scenario switching and explainable score bars
- Production-safe loading and error states

## Product architecture

```text
User input
   -> analysis API
   -> structured decision model
   -> deterministic simulation engine
   -> scenario comparison
   -> explainable UI
```

The core engine is deliberately deterministic. AI can be layered on for natural-language extraction without making calculations dependent on an LLM response. This makes the product easier to test, explain and defend technically.

## Environment

Copy `.env.example` to `.env.local` and configure the Appwrite project. AI provider secrets, when added, must remain server-side.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Hackathon vision

The full roadmap includes persistent decision history, permission-aware multi-user storage, richer scenario simulation, sensitivity analysis, evidence-backed inputs, reports, shareable read-only models, usage limits and team workspaces.

## Author

Built By Koglesh R. Murugan

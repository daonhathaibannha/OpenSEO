# OpenSEO

> Open source alternative to Semrush and Ahrefs

OpenSEO is an SEO tool for _the people_. If tools like Semrush or Ahrefs are too expensive or bloated, OpenSEO is a pay-as-you-go alternative that you actually control.

> All-in-one SEO tool for you and your AI agent.

Connect with any agent like Claude Code, OpenClaw or Hermes. We have pre-built skills, but you can build your own to tailor OpenSEO to your needs.

<img width="1385" height="794" alt="Image" src="https://github.com/user-attachments/assets/fd208249-44ea-4849-bb4b-5fc896aeab73" />

## Table of Contents

- [Why use OpenSEO?](#why-use-openseo)
- [Main SEO Workflows](#main-seo-workflows)
- [OpenSEO MCP](#openseo-mcp)
- [OpenSEO Agent Skills](#openseo-agent-skills)
- [Roadmap](#roadmap)
- [Community](#community)
- [Pricing / Costs](#pricing--costs)
- [Google Search Console](#google-search-console)
- [Self-hosting](#self-hosting)
  - [Docker Self Hosting](#docker-self-hosting)
  - [Cloudflare Self-Hosting](#cloudflare-self-hosting)
- [Local Development](#local-development)
- [Contributing](#contributing)

## Hosted Version

If you're not interested in self hosting, or just want to support the project, we also have a hosted version:

[openseo.so](https://openseo.so)

## Why use OpenSEO?

- Best in class MCP and AI Skills.
- Modern, simple UI.
  - Focused workflows instead of a bloated, complex SEO suite.
- No subscriptions, no third-party API key required — SEO data is generated internally.
- Fork and vibe code your own custom tool.

## Main SEO Workflows

- Keyword research
- Rank tracking
- Competitor Insights
- Backlinks
- Site Audits
- AI Visibility

## Community

Join Discord to chat: [Discord](https://discord.gg/c9uGs3cFXr)

Follow along for updates:

- Follow on X: https://x.com/bensenescu
- Sign up for the mailing list on our website: [openseo.so](https://openseo.so)

## OpenSEO MCP

OpenSEO exposes an MCP server so AI agents can use your SEO data directly.

Connect Claude Code, OpenClaw, Hermes or any other agent.

### Setup

- Set up the app
- Click "AI & Agents" in the header
- Follow the instructions to connect to your agent

## OpenSEO Agent Skills

OpenSEO Agent Skills are reusable workflows for your agent

They guide your agent through SEO tasks and use the OpenSEO MCP so your agent makes better recommendations.

### Available Skills

- `seo-project-setup`
- `seo-coach`
- `keyword-research`
- `keyword-clustering`
- `competitive-landscape`
- `competitor-analysis`
- `link-prospecting`

### Installation Guide

Read our docs for how to install the skills:

https://openseo.so/docs/skills/setup

## Roadmap

Top priorities:

- Improved and Scheduled Site Audits
- Custom Reports for Clients
- Local SEO
- In App AI Agent

Our top priority is always refining the current product and making existing features better based on user feedback.

If something important is missing, please join the [Discord](https://discord.gg/c9uGs3cFXr) or email me at ben@openseo.so and request it.

## Pricing / Costs

OpenSEO is totally free to use — you host it yourself for $0, and SEO data (keyword research, backlinks, rank tracking, AI Visibility, site audits) is generated internally, so there's no third-party API key or usage-based billing to set up.

## Google Search Console

Search Console is optional and works in self-hosted deployments using your own
Google OAuth client. It takes ~10 minutes of one-time setup — see
[`docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md`](./docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md).

## AI Features (SAM)

AI features like SAM, the in-app SEO agent, are optional — set the `OPENROUTER_API_KEY` environment variable to enable them (create a key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)).

## Self-hosting

OpenSEO supports two self-hosting paths:

- Docker for personal use and testing (Recommended for local use).
- Cloudflare for internet-facing self-hosting across multiple devices or for your team.

_Docker_

Docker is recommended for getting started. It's super easy to get up and running once you install Docker.

_Cloudflare_

If you love OpenSEO and want to use it across multiple devices or with your team, you can host it on Cloudflare which we'll be a SaaS-like experience. Also, this will have automatic database backups and other nice convenience features. It's just a bit more effort to get started if you're unfamiliar with Cloudflare.

## Docker Self Hosting

> [!WARNING]
> By default, the Docker version is intended for local use only. It runs in single-user mode with no authentication. For internet-facing self-hosting, use Cloudflare (free plan compatible). Or read [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md) before exposing to the internet.

Prerequisites:

- Install Docker: https://www.docker.com/products/docker-desktop/

Quickstart:

1. `cp .env.example .env`
2. `docker compose up -d`
3. Open `http://localhost:<PORT>` (default `3001`)

To update to the newest published image, pull first and then restart:

```sh
docker compose pull
docker compose up -d
```

For more info, see [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md).

## Cloudflare Self-Hosting

### Deploy the Worker

Clicking this button opens a page to deploy OpenSEO in your Cloudflare account. If you do not have an account yet, it will take you to account creation first (OpenSEO works great on the free plan).

Reference these docs while deploying since the Cloudflare UI doesn't indicate what steps you need to take: [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/every-app/open-seo)

## Local Development

See [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md).

## Contributing

Contributions are very welcome.

- Open an issue for bugs, UX friction, or feature requests.
- Open a PR if you want to implement a feature directly.
- Community-driven improvements are prioritized, and high-quality PRs are encouraged.

If you want to contribute but are unsure where to start, open an issue and describe what you want to build.

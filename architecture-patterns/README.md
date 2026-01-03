# Architecture Patterns

Production-hardened patterns for Applied Generative AI systems.

## Quick Start

```bash
npm install
npm run typecheck
```

## Patterns

| File | Purpose |
|------|---------|
| `specter_event_loop.ts` | Consensus-based decision engine with adversarial agents |
| `memory_sync_engine.ts` | Hybrid Hot/Cold memory with Firestore + DuckDB |
| `market_trust_validator.ts` | Data Physics layer for financial validation |
| `structured_llm_parser.ts` | Self-healing LLM output parser with Zod |

## Configuration

- **TypeScript:** Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- **Runtime Validation:** Zod schemas for all external data boundaries
- **Zero Node.js Built-ins:** Browser and edge-compatible

## License

MIT

---
Title: High-Level System Architecture — Search
Related: requirements.md
Date: 2026-08-24
Status: Proposal
---

**Overview**

This document designs a high-level architecture for the "Core Google Search Functionality" described in [requirements.md](requirements.md).

**Core System Drivers**
- **Latency:** suggestion UI p95 <= 300ms; SERP render p95 <= 1.5s.
- **Throughput & Scale:** support high QPS with horizontal scaling of index and stateless services.
- **Relevance & UX:** ranked results, bolded highlights, helpful "Did you mean" alternatives.
- **Security & A11y:** sanitize inputs, escape outputs, and meet WCAG 2.1 AA.
- **Operational Observability:** latency, errors, traffic, and index health metrics.

**Architecture Options & Trade-offs**

- **Option A — Containerized Microservices + Elasticsearch (Recommended for balance):**
  - Pros: predictable performance, mature search features (BM25, suggester, highlighting), easy to tune; good for large datasets.
  - Cons: operational overhead running/maintaining clusters; cost for large scale.

- **Option B — Serverless + Managed Search (e.g., AWS OpenSearch Managed / Elastic Cloud):**
  - Pros: lower ops, elastic capacity, quick to provision.
  - Cons: higher per-request cost at scale; potential cold-starts for Lambdas; limited low-level tuning.

- **Option C — Hybrid Vector + Lexical Search (OpenSearch k-NN / Pinecone + BM25 index):**
  - Pros: best relevance for semantic queries; supports modern search patterns.
  - Cons: increased complexity, required ANN infrastructure and additional ranking step.

Recommendation: adopt Option A with a clear migration path to hybrid vector search later. Start with a containerized microservice architecture using Elasticsearch/OpenSearch for inverted-index capabilities and fast suggesters; add a vector layer later if semantic ranking is required.

**ADR Summary**
- Decision: Use containerized services + Elasticsearch/OpenSearch for initial implementation.
- Rationale: meets latency and feature needs (suggesters, highlighting, paging), mature ecosystem, easier to meet ACs and NFRs.
- Consequence: allocate effort for infra (cluster, monitoring, backups); design components to allow swapping index backend for managed or vector services later.

**Mermaid Component Diagram**

```mermaid
flowchart LR
  Browser[User Browser / Mobile]
  Browser -->|typed input| Frontend[Frontend SPA (React / Next.js)]
  Frontend -->|debounced suggest API| EdgeCache(Edge CDN / Cache)
  EdgeCache -->|miss| SuggestAPI[Suggestion API (stateless)]
  SuggestAPI -->|prefix / completion query| SearchIndex[(Elasticsearch / OpenSearch)]
  Frontend -->|search request| SearchGateway[Search Gateway API]
  SearchGateway --> QueryParser[Query Parser & Ranker]
  QueryParser --> SearchIndex
  SearchIndex --> QueryParser
  QueryParser --> ResultsService[Results Formatter & Highlighting]
  ResultsService --> Frontend
  Indexer[Indexer / Ingest Pipeline] --> SearchIndex
  Metrics[(Prometheus / Grafana)] <--> SearchGateway
  Logs[(ELK/CloudLogs)] <--> AllServices
```

**Technology Stack & Rationale**
- **Frontend:** `React` or `Next.js` — fast SPA with optional SSR for SEO and initial SERP performance.
- **API / Gateway:** `Node.js` (Express/Fastify) or `Go` — lightweight, high-throughput query gateway.
- **Search Engine:** `Elasticsearch` or `OpenSearch` — BM25, suggesters, highlighting, paging.
- **Cache:** `Redis` for hot suggestion caching and session-level caches; CDN for static assets.
- **Indexing Pipeline:** Kafka or file-based ingestion + workers that transform and push to the index.
- **Observability:** Prometheus + Grafana, OpenTelemetry traces, and centralized logs.
- **Infra:** Kubernetes for container orchestration; Helm for deployment; CI/CD pipelines.

**End-to-End Data Flow**
- **Suggestion Flow:** user types -> frontend debounces (50–150ms) -> call Suggest API -> cache hit returns quickly or query index -> return top-N suggestions (client highlights matching substrings) -> keyboard navigation (Up/Down/Enter) handled by frontend.
- **Query Execution Flow:** Enter/search -> frontend posts to Search Gateway -> Query Parser normalizes, applies filters -> search index query (paging, highlights) -> ranker applies secondary signals -> Results Service formats snippets (or client highlights) -> frontend renders SERP.
- **Indexing Flow:** Content source -> ingestion pipeline (clean/sanitize, tokenization, metadata) -> bulk index into ES/OpenSearch -> index refresh and monitoring.

**Key Components & Responsibilities**
- **Frontend (`Search UI`)**: input debounce, accessibility (ARIA roles, keyboard), suggestion dropdown, SERP rendering, client-side snippet highlighting fallback.
- **Search Gateway / API**: edge for authentication, rate-limiting, request validation, telemetry emission.
- **Suggestion Service**: ultra-low-latency prefix/edge cache implementation; falls back to index queries.
- **Query Parser & Ranker**: normalize queries, apply boosts, combine lexical and later semantic scores.
- **Search Index**: store inverted index, suggesters, highlighting; scale shards/replicas based on load.
- **Indexer**: transform sources, produce snippet candidates, push updates.
- **Monitoring & Ops**: collect latencies, errors, index health; run automated alerts.

**Operational & Security Notes**
- Sanitize and validate all inputs at the API boundary; escape rendered content.
- Enforce CSP, input-size limits, and RBAC for index management.
- Autoscale gateway and suggestion services; scale index via node counts and shard tuning.
- Implement RUM (Real User Monitoring) + synthetic checks to measure AC latencies (suggestion 300ms, SERP 1.5s p95).

**Next Steps**
- Confirm tech choices (Elasticsearch vs managed OpenSearch vs vector provider) and expected dataset size / QPS.
- Produce a detailed component-level design and API contract for `Suggestion API` and `Search Gateway`.
- Create sprint tasks and acceptance tests for AC1–AC3.

**Files**
- Requirements: [requirements.md](requirements.md)

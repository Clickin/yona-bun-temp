---
children_hash: a5184a615b87137a9ef43323fe2e5a8fe112f2143703051f089a78da4a12371a
compression_ratio: 0.6248108925869894
condensation_order: 1
covers: [context.md, legacy_provenance_baseline.md]
covers_token_total: 661
summary_level: d1
token_count: 413
type: summary
---
### Domain: migration/legacy_provenance_baseline

- **Purpose & Scope**
  - Documents Phase 0B migration’s legacy-to-modern capability translation baseline, emphasizing the required data for each provenance entry and the Wave 1 exit strategy.
  - Relates directly to `migration/phase_plan_overview` for gating context.

- **Structure of Baseline**
  - Matrix entries for Auth, ACL, Issue, Project, PR/Review, Git/Repository, and Search map legacy tests to modern target layers, specify ownership, and capture deviation rules.
  - Each provenance row must record: legacy test source, intent summary, modern translation target layer, owning team, and an associated deviation rule.
  - Flow: legacy capability → legacy test inventory → modern translation target → ownership/deviation → Wave 1 exit reminder.

- **Key Architectural Decisions & Dependencies**
  - Wave 1 Auth/ACL coverage spans RPC, adapter, and server-route tests, with fixtures/seeding strategies defined in `conf/test-data.yml`.
  - Translation annotations tie controller/model origins to the corresponding modern layers, ensuring traceability from legacy artifacts (see `docs/agents/10-legacy-provenance-baseline.md` and `SPEC.md`).
  - Aligns with canonical rules in `SPEC.md` and mirrors `docs/provenance/phase-0b/README` for deeper trace details.

- **Governance & Exit Rules**
  - Wave 1 exit condition mandates that every PR cites a matrix row and pairs a legacy red test with its modern translation trace before declaring the capability complete.
  - Documentation highlights fixture strategies and reserved OAuth callback contracts as exemplar extensions for baseline coverage.
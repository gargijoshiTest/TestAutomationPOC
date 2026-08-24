## Pull Request: Add Color Palette Explorer prototype and architecture docs

### Summary

This PR adds a lightweight Color Palette Explorer prototype and supporting documentation to satisfy the user story: a responsive, accessible UI that displays, filters, and shows details for colors. It also includes architecture and implementation plan documents to guide further work.

- JIRA: TICKET-ID-TBD

### Changes Made

- docs/requirements_color_palette.md — requirements and clarifying questions for the Color Palette Explorer.
- docs/architecture_color_palette.md — high-level architecture and recommendation (static SPA + CDN for MVP).
- design-review_color_palette.md — design review, risks, and mitigations.
- impl-plan.md — phased implementation plan and tasks.
- src/static/* — static implementation of the Color Palette Explorer (index.html, styles.css, colors.v1.json, app.js).
- src/static/lib/filter.js — small reusable filter utility with Node compatibility.
- prototype/* — small prototype copy (index.html, styles.css, app.js, colors.v1.json).
- package.json — serve/test scripts for local development.
- ci/test-filter.js — simple smoke test for the filter function.
- CHANGELOG.md — initial changelog entry.

Note: Some prototype files are duplicated under `prototype/` and `src/static/` for easy testing; recommend consolidating in follow-ups.

### Test Evidence

- Manual: open `src/static/index.html` in a browser or run `npm run serve` and open http://localhost:8000 to exercise searching, filtering, and the details modal.
- CI test: `npm test` runs `ci/test-filter.js` which verifies the filter logic.

### Known Limitations

- Prototype uses client-side chunked rendering; for very large datasets (>20k) a server-backed API or virtualization is recommended.
- Prototype uses a fallback embedded dataset when `colors.v1.json` cannot be fetched (useful for file://), visible banner indicates fallback.
- No production-grade accessibility CI included yet (recommend adding axe-core integration).

### Reviewer Checklist

- [ ] Confirm UI renders and basic filtering works (open `src/static/index.html` or run `npm run serve`).
- [ ] Verify modal opens for selected color and shows HEX/RGB/HSL and contrast indicators.
- [ ] Confirm `npm test` passes locally.
- [ ] Review docs: `requirements_color_palette.md`, `architecture_color_palette.md`, `impl-plan.md` for alignment with product expectations.
- [ ] Security: ensure user-provided data is sanitized before production use.

### How to open the PR locally

```bash
# create a feature branch
git checkout -b feat/color-palette-explorer
git add .
git commit -m "feat: add Color Palette Explorer prototype and docs"
git push --set-upstream origin feat/color-palette-explorer

# If you have GitHub CLI installed, open a PR:
gh pr create --title "feat: Color Palette Explorer prototype" --body-file PR_DESCRIPTION.md --base main
```

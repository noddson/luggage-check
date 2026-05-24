Translate and localize the application UI and repository localization entries to support {COUNTRY} (language code: {LANGCODE}) with production-ready quality.

Target language:
- {COUNTRY}
- Language code: {LANGCODE}

Overall requirements:
1) Add a full {COUNTRY} translation bundle for {LANGCODE} in the application i18n map.
2) Ensure all user-facing text is localized, including:
   - Static HTML text
   - Dynamic JS-rendered text
   - Button labels
   - Form labels and placeholders
   - Validation/error messages
   - Empty/loading/success status messages
   - Tooltips
   - ARIA labels, titles, and screen-reader-only text
   - Chart/visualization labels, axis labels, and legends
3) Remove language-specific conditionals such as `if lang === 'fr'` or other hardcoded language checks, and replace them with key-based translation lookups.
4) Do not hardcode translated {COUNTRY} strings outside translation bundles.
5) Keep English fallback behavior intact for missing keys.
6) Preserve existing behavior and styling; change only localization-related code.
7) Update tests and smoke checks that assert string markers so they remain robust with localization.
8) Run all project checks and ensure they pass.

Repository localization entry scope:
Only edit JSON files under:
- configs/luggage/*.json
- configs/vehicles/*/*.json

JSON localization rules:
1) Find every object with a `translations` map that contains both `en` and `fr`.
2) If `translations.{LANGCODE}` is missing, add it.
3) If `translations.{LANGCODE}` exists but is identical to `translations.en`, replace it with a real {COUNTRY} translation.
4) Translate from the `translations.en` text.
5) Preserve nested structure, such as `label`, `bodyStyle`, and any other keys under `en`.
6) Do not modify non-translation fields, including dimensions, IDs, notes, schema fields, or any other non-localization data.
7) Keep valid UTF-8 JSON and preserve the existing formatting conventions.

Quality rules:
1) Use natural, native {COUNTRY} phrasing, not literal word-for-word translation.
2) Keep terminology consistent across the app and across JSON files.
3) Preserve interpolation placeholders exactly, such as `{count}`, `{angle}`, `{name}`, or any other placeholder.
4) Preserve punctuation, units, and formatting expected by the UI.
5) Do not break existing i18n keys unless necessary. If keys are renamed, update all references.
6) Do not leave `translations.{LANGCODE}` equal to `translations.en` unless the string is a true language-invariant term, such as an acronym, brand name, model name, or technical identifier.
7) For automotive terms, use natural {COUNTRY} domain wording appropriate for vehicle/luggage configuration contexts.

Validation:
After edits, verify:
1) No `translations` object with both `en` and `fr` is missing `{LANGCODE}`.
2) No `translations.{LANGCODE}` exactly equals `translations.en`, except for explicit allowed invariant terms.
3) JSON remains parseable.
4) Application checks, tests, and smoke checks pass.

Deliverables:
1) Code changed.
2) Brief summary of what was localized.
3) List of files changed.
4) Number of translation entries added or updated.
5) Any terms left intentionally unchanged, with a brief reason.
6) Test/check commands run and their results.

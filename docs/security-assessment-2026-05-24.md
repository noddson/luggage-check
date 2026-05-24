# Security Assessment — 2026-05-24

## Scope
- Client-side web application (`index.html` + `app.js`).
- Local JSON configuration inputs under `configs/`.
- Cookie handling for `preferredLanguage` and `tripSetup`.

## Cookie tampering and injection risk analysis

### What happens if cookie payloads are tampered with?
- `tripSetup` cookie is JSON-parsed in a `try/catch`; invalid JSON clears the cookie.
- Parsed values are type-checked and clamped before use:
  - `seatBackAngleDegrees` is clamped to `0..45`.
  - `usableVolumeBufferPercent` is clamped to `5..50`.
  - `vehicleId` and `configurationId` must match known in-memory configuration IDs.
- `preferredLanguage` is accepted only if it matches a key in the in-code `I18N` object.

**Conclusion:** cookie tampering cannot directly produce code execution via those cookie values in current code paths; values are constrained to expected enums/ranges and unknown values are ignored.

### Residual cookie security concerns
- Cookies are set with `SameSite=Lax`, but not `Secure`.
- Cookies are not `HttpOnly` (JS-accessible), which is required for app logic but means any successful XSS could read/modify them.
- `tripSetup` data is integrity-unprotected (no signature/MAC), so users can alter personalization state.

**Risk rating:** Low (integrity of preference state only; no auth/session token impact in this app).

## OWASP Top 10 (2021) assessment summary

### Medium/High findings

1) **Potential DOM XSS if configuration data becomes untrusted**  
   - Category: **A03:2021 – Injection**  
   - Severity: **Medium**  
   - Evidence: Rendering uses `innerHTML` through `setSanitizedMarkup(...)`, while interpolating strings from vehicle/luggage config and translations into markup templates. If those JSON sources were compromised, attacker-controlled HTML/script payloads could be injected into the DOM.  
   - Impact: Script execution in user browser, theft/modification of app state, persistence via modified client-side data pipelines.  
   - Recommended remediation:
     - Replace string-concatenated HTML rendering with safe DOM construction (`createElement`, `textContent`, explicit attributes).
     - If HTML templates are retained, sanitize with a proven sanitizer (e.g., DOMPurify) before assignment.
     - Add CSP (`default-src 'self'; script-src 'self'`) and avoid inline scripts.
     - Treat config files as trusted-release artifacts only; enforce CI validation and integrity controls.

### No medium/high issues identified in this pass
- **A01 Broken Access Control:** Not applicable (no authentication/authorization flow).
- **A02 Cryptographic Failures:** No sensitive data processing.
- **A04 Insecure Design:** No critical design flaws found for current threat model.
- **A05 Security Misconfiguration:** No medium/high misconfiguration observed in app code.
- **A06 Vulnerable/Outdated Components:** `npm audit` reports 0 vulnerabilities (no external runtime deps).
- **A07 Identification & Authentication Failures:** Not applicable.
- **A08 Software & Data Integrity Failures:** Supply-chain/config tamper controls could be improved, but no current medium/high exploit path beyond finding #1.
- **A09 Security Logging & Monitoring Failures:** Out of scope for this static client app.
- **A10 SSRF:** Not applicable (no server-side request capability).

## Commands run
- `npm run check`
- `npm audit --omit=dev`


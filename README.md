# luggage-check

A tool for checking rental cars and common trip vehicles for total luggage space based on measured luggage, soft/irregular bags, vehicle boot/trunk cargo areas, and pickup beds.

## What exists in this starter build

This repository now contains the first data, computation, and browser UI layer for the app:

- Common luggage presets with exact dimensions, quantities, source metadata, and a soft/free-form backpack example.
- Regional vehicle starter sets covering European rental classes plus North American EV/crossover and pickup examples.
- Vehicle cargo-zone configs for seats-up, rear-seats-folded, and rear-footwell overflow scenarios.
- A multi-pass 3D fit estimator that repacks the full selected luggage set on every change, checks all allowed axis rotations, approximate usable zone volume, cargo-opening constraints when present, and returns placement coordinates for visualization.
- A static browser app for selecting a vehicle, choosing seat/cargo configurations, tuning luggage quantities, and viewing scaled top/side/rear cargo-zone drawings.
- A config validation script that enforces required fields and verifies each vehicle has both manufacturer and rental-market references.

## Configuration layout

```text
configs/
  luggage/
    common.json        # seeded luggage presets
    schema.json        # JSON Schema documentation for luggage config shape
  vehicles/
    schema.json        # JSON Schema documentation for vehicle cargo config shape
    europe/*.json      # sourced European rental-car starter configs
    north-america/*.json # sourced North American vehicle configs
src/
  config/              # config loaders
  domain/              # JSDoc domain typedefs
  packing/             # fit-estimation logic
public/
  index.html            # browser app shell
  app.js                # app state, config selection, and SVG visualization
  styles.css            # responsive app styling
scripts/
  serve-app.mjs         # zero-dependency local static server
  smoke-app.mjs         # app shell and placement smoke checks
  validate-configs.mjs  # validation and smoke-test entrypoint
```

## Important modeling notes

Vehicle manufacturers commonly publish cargo capacity in litres, but they often do not publish a simple rectangular boot box. The starter vehicle configs therefore store the sourced litre capacity and mark MVP rectangular dimensions as low-confidence estimates. The estimator uses those cuboids for planning, not as a guarantee that a rigid suitcase will fit through the opening or around trim, wheel arches, and seat angles.

Future app milestones should replace estimated cuboids with measured dimensions, scanned meshes, or user-entered cargo measurements where available.


## Security headers and CSP expectations

`public/index.html` sets a document-level Content Security Policy via `<meta http-equiv="Content-Security-Policy" ...>` for static hosting scenarios where response headers are not configurable.

Current policy:

- `default-src 'self'`
- `script-src 'self' https://cdn.jsdelivr.net` (permits local `./app.js` module script and the DOMPurify CDN script used by the UI)
- `style-src 'self'` (permits local `./styles.css`)
- `img-src 'self' data:` (permits same-origin images plus inline data URLs)
- `object-src 'none'`
- `base-uri 'none'`
- `frame-ancestors 'none'`

Additional hardening in HTML:

- `Referrer-Policy` equivalent via `<meta name="referrer" content="no-referrer">`.

Hosting limitation to document for deployments:

- `X-Content-Type-Options: nosniff` cannot be enforced by a `<meta>` tag and must be set as an HTTP response header by the hosting platform / CDN.
- If your host supports response headers, prefer setting CSP and Referrer-Policy as headers too, and keep the HTML meta policy aligned.

## Run the app locally

```bash
npm start
```

Then open <http://localhost:4173>. The app loads the JSON configs directly, lets you pick a vehicle and seat/cargo setup, adjusts luggage quantities, and renders scaled SVG cargo-zone views.

## Validate the starter dataset and app shell

```bash
npm run validate:configs
npm run smoke:app
```

The validation script checks required luggage and vehicle fields, source metadata, source diversity for vehicles, cargo-zone references, and a smoke run through the fit estimator. The app smoke check verifies the browser shell markers and that each estimator placement contains coordinates needed by the visualization.

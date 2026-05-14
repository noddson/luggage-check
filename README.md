# luggage-check

A tool for checking rental cars for total luggage space based on measured luggage, soft/irregular bags, and vehicle boot/trunk cargo areas.

## What exists in this starter build

This repository now contains the first data and computation layer for the app:

- Common luggage presets with exact dimensions, quantities, source metadata, and a soft/free-form backpack example.
- A European rental-car starter set covering economy hatchbacks, compact hatchbacks, estate/wagon, and SUV/crossover classes.
- Vehicle cargo-zone configs for seats-up, rear-seats-folded, and rear-footwell overflow scenarios.
- A first-pass greedy fit estimator that checks dimensions, rotation, approximate usable zone volume, and cargo-opening constraints when present.
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
src/
  config/              # config loaders
  domain/              # JSDoc domain typedefs
  packing/             # fit-estimation logic
scripts/
  validate-configs.mjs # validation and smoke-test entrypoint
```

## Important modeling notes

Vehicle manufacturers commonly publish cargo capacity in litres, but they often do not publish a simple rectangular boot box. The starter vehicle configs therefore store the sourced litre capacity and mark MVP rectangular dimensions as low-confidence estimates. The estimator uses those cuboids for planning, not as a guarantee that a rigid suitcase will fit through the opening or around trim, wheel arches, and seat angles.

Future app milestones should replace estimated cuboids with measured dimensions, scanned meshes, or user-entered cargo measurements where available.

## Validate the starter dataset

```bash
npm run validate:configs
```

The validation script checks required luggage and vehicle fields, source metadata, source diversity for vehicles, cargo-zone references, and a smoke run through the fit estimator.

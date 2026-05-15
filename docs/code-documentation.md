# Code Documentation

This document explains the luggage-check codebase at the level needed to maintain, extend, and test it. It covers the runtime areas, the important functions in each area, their inputs and outputs, expected errors, and correctness checks.

## Repository map

| Area | Files | Purpose |
| --- | --- | --- |
| Browser UI | `public/index.html`, `public/styles.css`, `public/app.js` | Static single-page app that loads configuration JSON, lets users choose a vehicle/seat setup/luggage quantities, runs the fit estimator, and renders 2D/3D SVG visualizations. |
| Fit estimation | `src/packing/fitEstimator.js` | Deterministic multi-pass rectangular packing estimator. Expands luggage quantities, applies soft-bag compression, tests rotations/opening constraints/seat-back encroachment, and returns placements plus warnings. |
| Config loading | `src/config/loadConfigs.js` | Node-side JSON readers used by validation and smoke scripts. |
| Domain documentation | `src/domain/types.js` | JSDoc typedefs for luggage, vehicles, cargo zones, seat configurations, and estimator result shapes. |
| Config data | `configs/luggage/*.json`, `configs/vehicles/**/*.json` | Source-backed luggage and vehicle cargo data. Schema files document the expected JSON shapes. |
| Developer scripts | `scripts/validate-configs.mjs`, `scripts/smoke-app.mjs`, `scripts/serve-app.mjs` | Dataset validation, app/estimator smoke checks, and a zero-dependency static file server. |

## Data and units model

All physical dimensions use millimetres (`length`, `width`, `height`) and volumes are reported in litres unless a helper explicitly says `Mm3`.

### Axis conventions

The packing estimator and visualization use the same coordinate model:

- `x`: cargo-zone length/depth from the rear opening toward the seats.
- `y`: cargo-zone width across the vehicle.
- `z`: cargo-zone height upward from the cargo floor.
- `positionMm`: lower-left-rear origin of a placed item in that zone.
- `orientationMm`: item dimensions after any rotation selected by the estimator.

### Important domain interfaces

The canonical shape documentation is in `src/domain/types.js`. In prose, the key interfaces are:

#### `DimensionsMm`

```js
{
  length: number,
  width: number,
  height: number
}
```

All values must be positive finite numbers. Validation enforces this for config data.

#### `SourceReference`

```js
{
  sourceType: 'manufacturer' | 'rental-company' | 'rental-broker' | 'standard-body' | 'luggage-brand' | 'editorial',
  publisher: string,
  title: string,
  url: string,
  retrievedAt: 'YYYY-MM-DD',
  fieldsCovered: string[],
  confidence: 'high' | 'medium' | 'low',
  notes?: string
}
```

Used to make every luggage and vehicle value traceable. Vehicle validation additionally requires at least one manufacturer source and one rental-market source.

#### `LuggageItem`

```js
{
  id: string,
  label: string,
  quantity: number,
  shapeType: 'box' | 'soft_box' | 'ellipsoid' | 'cylinder' | 'free_form',
  dimensionsMm: DimensionsMm,
  rotationAllowed?: boolean,
  compressibility?: number,
  boundingBoxes?: Array<{ label: string, dimensionsMm: DimensionsMm }>,
  sources: SourceReference[]
}
```

`quantity` is the configured/default quantity. The UI clones the luggage set and replaces quantities from user input before estimation.

#### `VehicleConfig`

```js
{
  id: string,
  make: string,
  model: string,
  generation: string,
  modelYears: string[],
  bodyStyle: string,
  rentalClasses: string[],
  commonRentalAliases: string[],
  isDefault?: boolean,
  cargoZones: CargoZone[],
  seatConfigurations: SeatConfiguration[],
  sources: SourceReference[]
}
```

Each vehicle has one or more cargo zones and one or more seat configurations that reference those zones by id.

#### `CargoZone`

```js
{
  id: string,
  label: string,
  volumeLitres: number,
  dimensionsMm?: DimensionsMm,
  openingMm?: { width: number, height: number },
  usableFraction?: number,
  confidence: 'high' | 'medium' | 'low',
  seatBackEncroachment?: { angleFromVerticalDegrees?: number },
  notes?: string
}
```

`dimensionsMm` is optional because manufacturer volume may exist without reliable rectangular dimensions. Zones without dimensions are skipped by the stacking estimator and reported as warnings.

#### `FitEstimate`

```js
{
  vehicleId: string,
  seatConfigurationId: string,
  fits: boolean,
  fitScore: number,
  seatBackEncroachmentConsidered: boolean,
  usedVolumeLitres: number,
  usableVolumeLitres: number,
  placements: Placement[],
  unplacedItems: UnplacedItem[],
  warnings: string[]
}
```

`fitScore` is the fraction of selected individual luggage instances placed, rounded to two decimals.

## `src/config/loadConfigs.js` — configuration loading

This module is used by Node scripts, not by the browser. The browser uses its own `fetch`-based loader in `public/app.js`.

### `readJson(filePath)`

**Purpose:** Read a UTF-8 JSON file and parse it.

**Interface:**

```js
async function readJson(filePath: string): Promise<any>
```

**Inputs:** `filePath` can be relative to the current working directory or absolute.

**Output:** Parsed JSON value.

**Errors:**

- Propagates filesystem errors from `readFile`, such as `ENOENT` for missing files or permission errors.
- Throws `SyntaxError` from `JSON.parse` for invalid JSON.

**Correctness tests:**

- Positive: load `configs/luggage/common.json` and assert it has `version` and an `items` array.
- Negative: pass a non-existent path and assert rejection.
- Negative: pass a malformed temporary JSON file and assert `SyntaxError`.

### `loadLuggageSet(filePath = 'configs/luggage/common.json')`

**Purpose:** Convenience wrapper for loading the default luggage config.

**Interface:**

```js
async function loadLuggageSet(filePath?: string): Promise<LuggageSet>
```

**Errors:** Same as `readJson`.

**Correctness tests:** Covered by `npm run validate:configs`, which loads the default set and validates required fields.

### `loadVehicles(dir = 'configs/vehicles')`

**Purpose:** Load all regional vehicle JSON files below a root vehicle directory.

**Interface:**

```js
async function loadVehicles(dir?: string): Promise<VehicleConfig[]>
```

**Inputs:** `dir` should contain region subdirectories, and each region directory should contain vehicle `.json` files.

**Output:** A flat array of vehicle objects. Region folders and files are sorted before loading, so output order is deterministic.

**Errors:**

- Propagates `readdir` errors if the root or a region directory does not exist.
- Propagates `readJson` errors for malformed or unreadable vehicle files.

**Correctness tests:**

- `npm run validate:configs` checks that all vehicle files load and conform to expected field rules.
- Add a fixture directory with two region folders and assert deterministic flattening if unit tests are added later.

### `loadEuropeanVehicles(dir = 'configs/vehicles/europe')`

**Purpose:** Legacy/specialized loader for European vehicle files only.

**Interface:**

```js
async function loadEuropeanVehicles(dir?: string): Promise<VehicleConfig[]>
```

**Errors:** Same as `loadVehicles`, limited to one directory.

**Correctness tests:** Load the default directory and assert each returned vehicle has a `rentalClasses` array and `cargoZones`.

## `src/packing/fitEstimator.js` — packing estimator

This is the computational core. It is intentionally deterministic: the same luggage set, vehicle, seat configuration, and options produce the same estimate.

### Constants

- `MM3_PER_LITRE = 1_000_000`: unit conversion from cubic millimetres to litres.
- `MIN_SPACE_MM = 1`: removes zero/negative/tiny candidate free spaces after splitting.
- `DEFAULT_SEAT_BACK_ANGLE_DEGREES = 20`: fallback slope used when a zone declares seat-back encroachment without an explicit angle.
- `DEFAULT_SUPPORT_POLICY`: controls generalized support behavior. By default, adjacent coplanar free spaces are merged so luggage can bridge across same-height supporting surfaces.

### Overall algorithm

1. Resolve the selected `seatConfigurationId` from the vehicle.
2. Convert selected cargo-zone ids into zone objects.
3. Expand each luggage item by quantity into individual item instances.
4. Apply a small effective-dimension reduction to compressible, non-box luggage.
5. Generate several deterministic item orderings.
6. For each ordering, greedily place items into the best scored free space across all active zones. Candidate scoring includes a one-step residual-capacity lookahead so rotations that preserve room for later same-type bags can beat locally flatter placements.
7. Normalize free spaces after every placement, including optional merging of adjacent coplanar spaces. This lets a bag use a continuous platform made by several same-height items or cargo-floor regions instead of being restricted to a single earlier item's footprint.
8. Compare packing passes by number of unplaced items, number placed, volume used, number of zones used, and height used.
9. Return the best result with placements, unplaced items, volume metrics, and warnings.

This is an estimator, not an exact bin-packing solver. It uses rectangular envelopes and a deterministic heuristic, so it should be treated as planning guidance rather than a physical guarantee.

### Internal helper functions

#### `permutations(dimensions)`

**Purpose:** Return all unique axis-aligned rotations of a rectangular item.

**Input:** `DimensionsMm`.

**Output:** Up to six unique `{ length, width, height }` permutations. Duplicate rotations are removed for symmetric dimensions.

**Errors:** Does not throw intentionally. Invalid/missing dimension fields produce invalid numeric results and should be prevented by config validation.

**Testing:** Use a cube and assert one permutation; use a rectangular cuboid and assert six; use two equal sides and assert three.

#### `volumeLitres(dimensions)` and `volumeMm3(dimensions)`

**Purpose:** Compute rectangular volume in litres or cubic millimetres.

**Input:** `DimensionsMm`.

**Output:** Number.

**Errors:** No explicit errors. Bad dimensions produce `NaN` or nonsensical values.

**Testing:** `{ length: 1000, width: 1000, height: 1000 }` should be `1000` litres and `1_000_000_000` mm³.

#### `effectiveDimensions(item)`

**Purpose:** Apply conservative compression to soft luggage before packing.

**Input:** Expanded or raw `LuggageItem` with `shapeType`, `compressibility`, and `dimensionsMm`.

**Output:** Rounded `DimensionsMm`.

**Rules:**

- Rigid `box` items receive no compression.
- Other shape types use `Math.min(item.compressibility ?? 0, 0.35)`.
- The dimension scale is `1 - compression * 0.2`; even high compressibility has a limited effect.

**Errors:** No explicit errors.

**Testing:** A `box` with `compressibility: 1` should retain original dimensions; a `soft_box` with `compressibility: 0.35` should scale to 93%.

#### `expandItems(items)`

**Purpose:** Convert quantity-based luggage definitions into one object per physical bag.

**Input:** `LuggageItem[]`.

**Output:** Array of item instances with ids like `carry-on#1`, `carry-on#2`, labels adjusted for quantities, `sourceId` pointing to the original item id, and effective dimensions.

**Errors:** If `quantity` is negative or not a finite array length, `Array.from` can throw or behave unexpectedly. Config validation and UI input constraints are expected to keep quantity valid.

**Testing:** A quantity of `3` should return three items with stable ids and source ids.

#### `itemFitsOpening(item, orientation, zone)`

**Purpose:** Check whether at least one face of an oriented item can pass through a cargo opening.

**Input:** Expanded item, candidate orientation, and cargo zone.

**Output:** Boolean. Returns `true` when `zone.openingMm` is absent.

**Errors:** No explicit errors. Malformed opening data can produce incorrect comparisons.

**Testing:** Provide an opening and an item where only one face fits; assert true. Provide an item whose all faces exceed opening dimensions; assert false.

#### `orientationsForZone(item, zone)`

**Purpose:** Generate all item orientations that fit a zone's rectangular dimensions and opening constraints.

**Input:** Expanded item and cargo zone.

**Output:** Array of valid orientations. Returns an empty array for zones without `dimensionsMm`.

**Errors:** No explicit errors.

**Testing:** Use `rotationAllowed: false` and assert only the original orientation is considered. Use a zone smaller than the item and assert no orientations.

#### `initialZoneState(zone)`

**Purpose:** Initialize mutable packing state for a cargo zone.

**Input:** `CargoZone`.

**Output:**

```js
{
  zone,
  remainingLitres,
  spaces: [{ x: 0, y: 0, z: 0, length, width, height }],
  placements: []
}
```

`remainingLitres` is `zone.volumeLitres * (zone.usableFraction ?? 0.75)`.

**Errors:** No explicit errors. Missing dimensions create an initial zero-sized space, but callers filter out dimensionless zones before initialization.

**Testing:** A 500 L zone with `usableFraction: 0.8` should initialize to 400 L remaining.

#### `effectiveSupportPolicy(options)`, `mergeAdjacentCoplanarSpaces(spaces)`, and `normalizeSpaces(spaces, options)`

**Purpose:** Define and apply the estimator's support/stacking policy for free-space management. The default support policy merges adjacent free cuboids that share the same `z`, height, and aligned X/Y extent. This is a generalized vehicle-agnostic rule: a continuous same-height support surface can be created by the cargo floor, by multiple rigid bags, or by previously placed soft bags.

**Input:** Candidate free spaces plus optional `options.supportPolicy`.

**Output:** Deduplicated, contained-space-filtered, sorted free spaces.

**Rules:**

- `mergeAdjacentCoplanarSpaces: true` allows placements to bridge across adjacent coplanar spaces.
- Set `options.supportPolicy.mergeAdjacentCoplanarSpaces` to `false` to retain the older footprint-only behavior.
- The policy remains geometric only: it does not model weight limits, sag, friction, handles, or whether a soft bag is physically stable as a support.

**Testing:** The smoke script includes a Renault Trafic regression where six carry-ons form a same-height platform and five soft backpacks fit only when adjacent coplanar support is available.

#### `spaceVolume(space)` and `fitsInSpace(orientation, space)`

**Purpose:** Score and validate candidate free rectangular spaces.

**Inputs:** A free-space cuboid, and optionally an item orientation.

**Outputs:** Volume number or boolean.

**Errors:** No explicit errors.

**Testing:** An orientation equal to the space should fit; any axis greater than the space should not.

#### `seatBackAngleDegrees(zone)` and `seatBackEncroachmentMmAtHeight(zone, heightMm)`

**Purpose:** Model a sloped seat-back constraint as depth lost with height.

**Inputs:** Cargo zone, height in mm, and optional estimator override angle.

**Outputs:** Angle in degrees or length/depth encroachment in mm.

**Errors:** No explicit errors. Validation ensures configured angles are `>= 0` and `< 90`.

**Testing:** A 0-degree angle should produce 0 encroachment; the default 30-degree angle at 1000 mm should be about 577 mm.

#### `fitsSeatBackEncroachment(position, orientation, zone, options)`

**Purpose:** Reject placements whose top rear corner would intersect the sloped rear-seat envelope.

**Input:** Candidate position, orientation, zone, and `{ considerSeatBackEncroachment?: boolean, seatBackAngleDegrees?: number }`.

**Output:** Boolean. Returns true unless the option is enabled and the zone defines seat-back encroachment.

**Errors:** No explicit errors.

**Testing:** The smoke script includes a regression where a tall rigid case fits the rectangular envelope but fails with seat-back encroachment enabled.

#### `residualSpacesAfterPlacement(candidate, options)`, `capacityForItemInSpaces(item, spaces, zone, options)`, and `lookaheadCapacity(candidate, remainingItems, options)`

**Purpose:** Estimate how much future packing capacity a candidate placement preserves before the greedy algorithm commits to it.

**Input:** Candidate placement, remaining item instances, zone, and estimator options.

**Output:** Residual spaces or a numeric capacity score.

**Rules:**

- Residual spaces use the same normalization and support policy as committed placements.
- Lookahead first considers remaining items with the same `sourceId`, because repeated bags are where rotation choice most often affects capacity.
- Capacity checks opening constraints, zone dimensions, residual cuboids, and the seat-back encroachment envelope when enabled.

**Testing:** Use repeated same-size luggage and assert that a rotation preserving a larger repeated-item grid is preferred over a locally flatter orientation when it increases placed count.

#### `candidatePosition(space)`

**Purpose:** Choose the origin for a placement candidate inside a free space.

**Input:** Free space.

**Output:** `{ x, y, z }` equal to the free space origin.

**Errors:** No explicit errors.

**Testing:** Direct input/output equality test.

#### `boxesOverlap(aPosition, aSize, bPosition, bSize)` and `collidesWithPlacement(position, orientation, placements)`

**Purpose:** Detect strict 3D overlap between rectangular placements.

**Inputs:** Positions and sizes, or a candidate and existing placements.

**Output:** Boolean.

**Rules:** Touching faces are not considered overlap because strict `<`/`>` comparisons are used.

**Errors:** No explicit errors.

**Testing:** Assert overlap for intersecting boxes, false for separated boxes, and false for boxes that only touch at a face.

#### `isContainedBy(inner, outer)` and `normalizeSpaces(spaces)`

**Purpose:** Clean up free-space lists after placement.

**Input:** Array of candidate free spaces.

**Output:** Filtered and sorted free-space array.

**Rules:**

- Removes spaces smaller than `MIN_SPACE_MM` on any axis.
- Deduplicates identical spaces.
- Removes spaces fully contained by another available space.
- Sorts bottom-to-top (`z`), then left-to-right (`y`), then rear-to-front (`x`), then smaller volume.

**Errors:** No explicit errors.

**Testing:** Feed duplicate/contained/zero-sized spaces and assert only useful spaces remain in expected order.

#### `splitSpace(space, position, orientation)`

**Purpose:** After placing an item, split the consumed free space into three non-overlapping residual spaces: right/forward in `x`, beside in `y`, and above in `z`.

**Input:** Original free space, placement position, and orientation.

**Output:** Three raw spaces. Some may have zero or negative dimensions and are removed later by `normalizeSpaces`.

**Errors:** No explicit errors.

**Testing:** Place a 50×50×50 item in a 100×100×100 space at origin and assert residual dimensions represent the remaining x, y, and z regions.

#### `scoreCandidate(candidate)` and `compareScores(a, b)`

**Purpose:** Rank valid placements within one greedy packing pass.

**Candidate score priority:**

1. Lower zone index.
2. Lower `z` position.
3. Lower `y` position.
4. Lower `x` position.
5. Less leftover volume in the chosen space.
6. Less total slack.
7. Lower orientation height.
8. Lower maximum item axis.

**Output:** Score tuple and comparator result.

**Errors:** No explicit errors.

**Testing:** Construct two candidates and verify lower/bottom/less-waste candidates are preferred.

#### `findBestCandidate(item, zoneStates, options)`

**Purpose:** Find the best valid placement for one item across all current zones and free spaces.

**Input:** Expanded item, mutable zone states, and estimator options.

**Output:** Candidate object or `undefined`.

**Behavior:** Skips a zone if the item's volume exceeds that zone's remaining usable litres. Tests each valid orientation and each free space for dimensions, seat-back encroachment, and collision.

**Errors:** No explicit errors.

**Testing:** Use a synthetic zone and item that fits exactly; assert a candidate exists. Add an existing placement that collides and assert a different or no candidate is returned.

#### `placeItem(item, candidate)`

**Purpose:** Mutate the selected zone state to record a placement and update free spaces/remaining volume.

**Input:** Expanded item and candidate from `findBestCandidate`.

**Output:** No explicit return; mutates `candidate.zoneState`.

**Errors:** No explicit errors if candidate has expected fields. Passing an arbitrary object can throw when fields are missing.

**Testing:** After placing one item, assert placements length increments, remaining litres decreases, and free spaces no longer contain the exact consumed volume.

#### `cloneItem(item)`, `compareItems(...comparators)`, `itemComparators`, and `itemOrders(items)`

**Purpose:** Build deterministic item orderings for multi-pass packing.

**Inputs:** Expanded item array and comparator functions.

**Outputs:** Arrays sorted by volume, longest axis, footprint, height, maximum face, or source id tie-breakers.

**Errors:** No explicit errors.

**Testing:** Reverse the input luggage array and assert `estimateFit` places the same number of items. This is already covered by `scripts/smoke-app.mjs`.

#### `packingScore(result, zones)` and `comparePackingScores(a, b)`

**Purpose:** Choose the best full-pass packing result.

**Score priority:**

1. Fewer unplaced items.
2. More placed items.
3. Higher fraction of usable volume used.
4. Fewer zones used.
5. Lower maximum used height.

**Errors:** No explicit errors.

**Testing:** Compare synthetic results where one has fewer unplaced items and assert it wins even if another uses less height.

#### `packItems(order, zones, options = {})`

**Purpose:** Run one greedy packing pass with a specific item order.

**Input:** Expanded item order, active cargo zones, and estimator options.

**Output:** `{ placements, unplacedItems }`.

**Errors:** No explicit errors.

**Testing:** Use a one-zone one-item exact fit fixture and assert one placement and no unplaced items.

### Public API: `estimateFit(luggageSet, vehicle, seatConfigurationId = 'seats_up', options = {})`

**Purpose:** Estimate whether selected luggage fits into a vehicle's selected seat/cargo configuration.

**Interface:**

```js
function estimateFit(
  luggageSet: { items: LuggageItem[] },
  vehicle: VehicleConfig,
  seatConfigurationId?: string,
  options?: {
    considerSeatBackEncroachment?: boolean,
    seatBackAngleDegrees?: number,
    supportPolicy?: { mergeAdjacentCoplanarSpaces?: boolean }
  }
): FitEstimate
```

**Inputs:**

- `luggageSet.items`: quantity-bearing luggage definitions. Quantities may be zero in UI-generated clones.
- `vehicle`: vehicle config with cargo zones and seat configurations.
- `seatConfigurationId`: id from `vehicle.seatConfigurations`; defaults to `seats_up`.
- `options.considerSeatBackEncroachment`: when true, zones with `seatBackEncroachment` reject placements that exceed the sloped depth envelope. `options.seatBackAngleDegrees` can override the vehicle-defined default angle.
- `options.supportPolicy.mergeAdjacentCoplanarSpaces`: when true, the estimator treats adjacent same-height free spaces as one support surface for future placements. This is enabled by default to support bridging across aligned luggage stacks and irregular cargo-floor subdivisions.

**Output:** A `FitEstimate` object with placement coordinates, fit status, volume usage, unplaced item records, and warnings.

**Errors:**

- Throws `Error('Unknown seat configuration: ...')` when the requested seat configuration does not exist.
- Can throw incidental JavaScript errors if malformed inputs omit required arrays/properties. Config validation is the intended guardrail.

**Warnings returned, not thrown:**

- Low-confidence cargo dimensions.
- Seat-back encroachment enabled for one or more active zones, using the vehicle default angle unless the UI degrees field overrides it.
- Active cargo zones missing rectangular dimensions and skipped by the stacking estimator.

**Correctness tests:**

- `npm run validate:configs` smoke-runs the estimator over every vehicle and every seat configuration.
- `npm run smoke:app` verifies complete placement coordinates, rejects overlap/out-of-bounds placements, checks deterministic results under reversed luggage input order, and covers seat-back encroachment regression.
- Add focused unit tests for unknown seat configuration, opening constraints, and zero-quantity UI clones if a unit test framework is introduced.

## `public/app.js` — browser application

This file owns client-side state, DOM updates, user events, and SVG visualization. It imports only the estimator from `src/packing/fitEstimator.js`.

### Top-level state and constants

- `VEHICLE_FILES`: explicit list of JSON vehicle configs loaded by the browser. New browser-visible vehicle files must be added here.
- `BAG_COLORS`: palette used to color placements by source luggage item.
- `DEFAULT_SEAT_BACK_ANGLE_DEGREES`: UI copy/visual default matching the estimator fallback.
- `state`: current app state:

```js
{
  luggageSet: undefined | LuggageSet,
  vehicles: [],
  vehicleId: undefined | string,
  configurationId: undefined | string,
  activeView: 'top' | 'side' | 'front' | '3d',
  seatBackEncroachmentAngleDegrees: 30,
  rotation3d: { yaw: -35, pitch: 28 },
  activeOrientationLabel: 'front-left'
}
```

### Loading and selection helpers

#### `readJson(path)`

**Purpose:** Browser `fetch` loader for JSON configs.

**Input:** Relative URL string.

**Output:** Parsed JSON.

**Errors:** Throws if the HTTP response is not OK, or if JSON parsing fails. `init()` catches these errors and shows an app-load failure message.

**Testing:** `npm run smoke:app` checks static file markers, but a browser/e2e test would be needed to fully exercise failed network responses.

#### `dimensionsLabel(dimensions)`

**Purpose:** Format dimensions as `L×W×H mm`.

**Errors:** No explicit errors; assumes dimensions exist.

**Testing:** Assert known formatting for a sample dimension object.

#### `seatBackAngleDegrees(zone)` and `seatBackEncroachmentMmAtHeight(zone, heightMm)`

**Purpose:** UI-side equivalents for drawing the seat-back envelope.

**Errors/Testing:** Same conceptual tests as the estimator helpers.

#### `hasActiveSeatBackEncroachment(zones)`

**Purpose:** Return true when at least one active zone declares seat-back encroachment.

**Testing:** Provide zones with/without `seatBackEncroachment` and assert the UI enables or disables the degrees input accordingly.

#### `vehicleLabel(vehicle)`

**Purpose:** Produce the select-option label: `Make Model (first rental class)`.

**Testing:** Assert label output for a representative vehicle config.

#### `cloneLuggageWithQuantities()`

**Purpose:** Create the estimator input by copying the loaded luggage set and replacing each quantity with the current numeric input value.

**Input source:** DOM inputs with ids `qty-${item.id}`.

**Output:** Shallow-cloned luggage set with cloned item objects.

**Errors:** Relies on `state.luggageSet` and existing DOM inputs. `Number(input.value)` can produce `NaN` if a browser allows invalid text; number inputs and min/max constraints reduce this risk.

**Testing:** Render controls, change a quantity input, call the function, and assert only quantity changed.

#### `defaultVehicle()`, `selectedVehicle()`, `selectedConfiguration(vehicle)`

**Purpose:** Resolve current selections from state.

**Fallbacks:**

- `defaultVehicle()` returns the vehicle with `isDefault` or the first loaded vehicle.
- `selectedVehicle()` returns `state.vehicleId` match or the default vehicle.
- `selectedConfiguration()` returns `state.configurationId` match or the vehicle's first seat configuration.

**Errors:** If no vehicles or configurations are loaded, callers may receive undefined and later fail. `init()` loads data before rendering.

**Testing:** Set state fixtures and assert fallback behavior.

### DOM rendering helpers

#### `renderVehicleOptions()`

**Purpose:** Populate the vehicle `<select>`.

**Input:** `state.vehicles` and `state.vehicleId`.

**Errors:** Assumes `vehicleSelect` exists in the HTML.

**Testing:** After init, assert option count equals loaded vehicles and selected option matches state.

#### `renderConfigurationOptions()`

**Purpose:** Populate the seat/cargo configuration `<select>` for the selected vehicle and keep `state.configurationId` valid.

**Errors:** Assumes selected vehicle has seat configurations.

**Testing:** Switch vehicle and assert configuration options are replaced and state points to the first config.

#### `renderVehicleMeta()`

**Purpose:** Render selected vehicle details, rental aliases, and active cargo-zone summaries.

**Special behavior:** Shows seat-back encroachment notes only when the option is active and a zone supports it.

**Testing:** Toggle encroachment and assert note text appears/disappears.

#### `resetLuggageQuantities()`

**Purpose:** Reset all quantity inputs to the quantities from the loaded config and re-render results.

**Testing:** Change inputs, click reset, assert values return to defaults and result metrics update.

#### `renderLuggageControls()`

**Purpose:** Render one numeric quantity control per luggage item.

**Interface:** Creates `input[type=number]` controls with min `0`, max `12`, and step `1`.

**Errors:** Assumes `state.luggageSet.items` exists.

**Testing:** Assert generated controls and that input events call `renderResults()`.

#### `metricCard(label, value, detail = '')`

**Purpose:** Return HTML for summary metric cards.

**Testing:** Snapshot or string-contains tests for label/value/detail.

### Color and projection helpers

#### `colorForPlacement(placement)` and `estimateSources()`

**Purpose:** Assign stable colors by source luggage id rather than by individual quantity instance.

**Testing:** Two placements with the same `sourceId` should produce the same color.

#### `projectBox(placement, view)` and `projectZone(zone, view)`

**Purpose:** Convert 3D placement/zone dimensions into 2D rectangles for top, side, and front views.

**View mapping:**

- `top`: x=length, y=width.
- `side`: x=length, y=height.
- `front`: x=width, y=height.

**Testing:** Provide one placement and assert each projection maps axes correctly.

#### `seatEncroachmentOverlay(zone, projection, view, padding, scale)`

**Purpose:** Draw a sloped triangular overlay in the side view when encroachment is active.

**Output:** SVG markup string, or an empty string when inactive/not applicable.

**Testing:** Side-view active case should include `seat-encroachment-area`; top/front/inactive cases should return an empty string.

#### `seatOutlineFor2dView(projection, view, padding, scale)`

**Purpose:** Draw contextual front-seat outlines next to 2D cargo views.

**Output:** SVG group markup customized for side, front, or top view.

**Testing:** Assert each view includes the expected modifier class.

### 2D visualization

#### `clamp(value, min, max)`

**Purpose:** Bound numbers, mainly 3D pitch.

**Testing:** Values below, within, and above range.

#### `shadeColor(hex, percent)`

**Purpose:** Lighten/darken hex colors for SVG faces.

**Input:** 6-digit hex color and signed percent.

**Errors:** Invalid hex strings can parse incorrectly.

**Testing:** Snapshot known color/percent outputs.

#### `renderZoneSvg(zone, placements, index)`

**Purpose:** Render a 2D SVG card for one zone in the active top/side/front view.

**Inputs:** Cargo zone, placements assigned to that zone, and zone index for labeling.

**Output:** HTML string for a visualization card. If the zone lacks `dimensionsMm`, returns an explanatory card instead of SVG.

**Testing:** For known placements, assert SVG contains placement labels and dimensions; for dimensionless zones, assert the no-rectangle message appears.

### 3D visualization

The 3D view is SVG-based, not WebGL. It creates cuboid vertices, rotates them, projects them orthographically, sorts faces, and emits polygons.

#### `createBoxVertices(position, size)`

**Purpose:** Return eight cuboid vertices from a position and size.

**Testing:** Assert min/max coordinates match position plus dimensions.

#### `createSeatGuideVertices(zone)`

**Purpose:** Create vertices for the forward-seat outline that gives the 3D cargo view spatial context.

**Output:** Vertices for the paired forward-seat guide boxes.

**Testing:** Assert generated vertices remain outside the cargo box and scale with zone dimensions.

#### `createSeatEncroachmentWedgeVertices(zone)`

**Purpose:** Create a triangular-prism wedge showing the cargo depth lost to a sloped rear seat back at the active degree angle.

**Output:** Vertices for the lost-clearance wedge, or `[]` when the active zone has no seat-back encroachment definition.

**Testing:** Active encroachment zone should return wedge vertices derived from the selected angle; no encroachment should return an empty array.

#### `current3dAngles()`

**Purpose:** Convert UI rotation degrees from state to radians.

**Testing:** Set yaw/pitch degrees and assert radian conversion.

#### `rotatePoint3d(point, center, angles = current3dAngles())`

**Purpose:** Rotate one point around a center using yaw and pitch.

**Testing:** Zero angles should return the point offset only by projection assumptions; known 90-degree rotations can be asserted with tolerances.

#### `createProjector(zone, placements, canvasWidth, canvasHeight, padding, extraPoints = [])`

**Purpose:** Build a projection function that maps rotated 3D points into 2D SVG coordinates and scales all content into the canvas.

**Output:** Function `project(point)` returning `{ x, y, depth }`.

**Testing:** Project all zone corners and assert they stay inside padding/canvas bounds.

#### `polygonPoints(points)`

**Purpose:** Convert projected points to the SVG `points` attribute string.

**Testing:** Assert formatting for two or three points.

#### `renderFace(vertices, indices, fill, className, title = '')`

**Purpose:** Render one SVG polygon face from vertex indices.

**Testing:** Assert title is included when provided and omitted when empty.

#### `ORIENTATION_PRESETS`, `renderOrientationAxisControl()`, and `set3dOrientation(axis)`

**Purpose:** Provide keyboard/click controls for preset 3D viewing angles.

**Inputs:** Axis keys `front-left`, `front-right`, `rear-left`, `rear-right`, and `top`.

**Errors:** `set3dOrientation` does nothing for unknown axis keys.

**Testing:** Click or call each preset and assert `state.rotation3d` and active label update.

#### `renderSeatGuide3d(zone, project)` and `renderSeatEncroachmentWedge3d(zone, project)`

**Purpose:** Render the 3D forward-seat context guide and the active sloped seat-back encroachment wedge.

**Output:** SVG face records for depth sorting.

**Testing:** Active encroachment should include the sloped `seat-encroachment-face` wedge along with the forward-seat guide; inactive should omit the wedge.

#### `renderZone3dSvg(zone, placements)`

**Purpose:** Render a full 3D SVG visualization card for one zone, including the cargo-zone frame, optional seat guide, placement cuboids, legend, and orientation controls.

**Output:** HTML string. Dimensionless zones get the same explanatory no-rectangle card pattern.

**Testing:** `npm run smoke:app` checks that 3D orientation controls and CSS markers exist. Browser tests should verify drag rotation and preset controls.

#### `bind3dRotation()`

**Purpose:** Attach click/keyboard events to orientation controls and pointer-drag rotation to each 3D SVG.

**Behavior:** Dragging changes yaw and pitch, clamps pitch between 0 and 90 degrees, clears the active preset label, and re-renders results.

**Errors:** Assumes visualization markup exists. Re-rendering replaces SVGs, so this is called after rendering visualization.

**Testing:** Browser/e2e test: pointer-drag an SVG and assert `state.rotation3d` changes and the SVG remains rendered.

### Result rendering and events

#### `renderVisualization(vehicle, config, result)`

**Purpose:** Render all active cargo zones in the selected view (`top`, `side`, `front`, or `3d`) and bind 3D interactions when needed.

**Testing:** Change view tabs and assert active visualization type changes.

#### `renderLists(result)`

**Purpose:** Render placed and unplaced luggage lists from estimator output.

**Testing:** Assert empty/success messages for zero placed/unplaced states and item rows when populated.

#### `renderResults()`

**Purpose:** Main UI recomputation loop. Reads selections and quantities, calls `estimateFit`, updates hero text, badges, metrics, visualization, lists, and warnings.

**Errors:** Propagates estimator errors if state references an unknown seat configuration, though normal UI selection prevents this.

**Testing:** Use a fixture state and assert changing quantities changes placed/unplaced counts. Smoke tests cover estimator placement completeness.

#### `bindEvents()`

**Purpose:** Wire UI controls to state changes and re-rendering.

**Controls:** Vehicle select, configuration select, seat-back degrees input, reset button, and view tabs.

**Testing:** Browser/e2e tests should dispatch change/click events and assert state plus DOM updates.

#### `init()`

**Purpose:** Boot the app.

**Flow:**

1. Fetch luggage config and all listed vehicle configs.
2. Sort vehicles by display label.
3. Select default vehicle and its first configuration.
4. Render controls and initial results.
5. Bind events.
6. On failure, show an error in the hero area and log to console.

**Errors:** Catches network/JSON loading errors and displays `Unable to load app`.

**Testing:** `npm start` plus a browser check should confirm the page loads. A mocked fetch test can assert the failure path.

## `public/index.html` — app shell

The HTML file provides the semantic structure and DOM ids/classes consumed by `public/app.js`:

- Vehicle/configuration selectors.
- Seat-back encroachment degrees input with vehicle-default initialization.
- Luggage controls container.
- View tabs for top, side, rear/front, and 3D views.
- Hero result, metrics, visualization, placed/unplaced lists, and warnings containers.

**Errors:** If IDs expected by `public/app.js` are renamed or removed, top-level DOM lookups can return `null`, causing event binding or rendering failures.

**Testing:** `npm run smoke:app` checks for required app-shell markers.

## `public/styles.css` — styling

The stylesheet defines responsive layout, form controls, result cards, warning/list styles, 2D SVG placement styles, 3D SVG cuboid styles, seat-back overlays, and orientation controls.

**Testing:** `npm run smoke:app` checks for key CSS selectors, including visualization cards, seat-back encroachment lines, 3D orientation controls, and secondary button styles. Visual regression screenshots would be useful for future UI changes.

## `scripts/validate-configs.mjs` — dataset and estimator validation

This script is the main CI-style data check.

### Constants

- `ISO_DATE`: requires source retrieval dates in `YYYY-MM-DD` form.
- `URL_LIKE`: requires source URLs to start with `http://` or `https://`.

### `assert(condition, message, errors)`

**Purpose:** Accumulate validation errors without throwing immediately.

**Testing:** False condition appends a message; true condition does not.

### `validateDimensions(value, label, errors)`

**Purpose:** Ensure a dimensions object exists and has positive finite `length`, `width`, and `height`.

**Testing:** Missing axis and zero/negative axis should add errors.

### `validateSources(sources, label, errors)`

**Purpose:** Ensure source arrays are non-empty and each source contains required metadata.

**Rules:** Checks required fields, URL shape, date shape, non-empty `fieldsCovered`, and confidence enum.

**Testing:** Invalid URL/date/confidence should each add specific errors.

### `validateLuggageSet(luggageSet)`

**Purpose:** Validate the luggage config shape and each item.

**Rules:** Requires version `1`, non-empty items, item ids/labels, positive integer quantities, valid shape type, dimensions, optional compressibility between 0 and 1, optional bounding-box dimensions, and sources.

**Output:** Error string array.

**Testing:** `npm run validate:configs` executes this against the real config. Fixture tests can cover each invalid branch.

### `validateVehicle(vehicle)`

**Purpose:** Validate one vehicle config.

**Rules:** Requires identity fields, optional boolean `isDefault`, non-empty arrays, valid sources, at least one manufacturer source, at least one rental-market source, unique cargo-zone ids, positive zone volume, optional dimensions, valid seat-back angle, valid usable fraction, confidence enum, positive seats available, and valid cargo-zone references from seat configurations.

**Output:** Error string array.

**Testing:** Real dataset is covered by `npm run validate:configs`; focused fixture tests should verify duplicate zone ids and unknown seat-zone references.

### Script-level checks

After loading configs, the script also checks:

- Europe and North America starter vehicle directories are non-empty.
- Exactly one default vehicle exists.
- `estimateFit` runs for every vehicle and seat configuration.
- At least one vehicle should not fit the starter luggage set, preserving a useful negative case.

**Errors:** If any validation errors are accumulated, the script prints them and exits with code `1`. Unexpected loader/parser errors also fail the process.

## `scripts/smoke-app.mjs` — app shell and estimator smoke tests

This script combines static asset checks with estimator regression checks.

### Static checks

It reads `public/index.html`, `public/styles.css`, and `public/app.js` and asserts that important UI markers exist:

- App shell ids/classes.
- Seat-back encroachment degrees controls.
- 3D view tab and orientation controls.
- CSS classes used by zone cards and overlays.
- Reset/secondary button styling.

These checks catch accidental removal of DOM hooks needed by the browser code.

### Default vehicle check

The script asserts that exactly one default vehicle exists and that it is `volkswagen-caddy-maxi-life`. If the product default changes intentionally, update this smoke check with the data change.

### Seat-back encroachment regression

A synthetic luggage/vehicle fixture verifies that a tall rigid case fits the plain rectangular zone but fails when seat-back encroachment is enabled.

### `placementsOverlap(a, b)`

**Purpose:** Local duplicate of strict overlap detection for validating estimator output from the outside.

**Testing:** Used by the script to fail if any same-zone placements overlap.

### Per-vehicle estimator checks

For every vehicle and seat configuration, the script asserts:

- Reversing luggage input order does not change placed/unplaced counts.
- Every placement has `positionMm`, `orientationMm`, and `zoneLabel` for visualization.
- No placement extends outside its cargo-zone dimensions.
- No two placements overlap in the same zone.

**Errors:** Throws on the first failed invariant, producing a non-zero exit.

## `scripts/serve-app.mjs` — local static server

This script serves the static app without external dependencies.

### Top-level setup

- `root`: repository root, derived from the script location.
- `port`: `process.env.PORT` or `4173`.
- `contentTypes`: map for `.html`, `.css`, `.js`, and `.json` responses.

### `safePath(urlPath)`

**Purpose:** Convert a request URL into a safe file path under the repository root.

**Behavior:**

- `/` maps to `public/index.html`.
- Single-segment paths like `/styles.css` map to `public/styles.css`.
- Multi-segment paths can access repository assets such as `/configs/...` and `/src/...`, which the browser needs for JSON and module imports.
- Path traversal is blocked by resolving and requiring the absolute path to start with the repository root.

**Input:** Raw request URL path, possibly with query string.

**Output:** Absolute path string, or `undefined` for forbidden traversal.

**Errors:** `decodeURIComponent` can throw for malformed URL encoding. The current server does not catch that inside `safePath`, so malformed encodings may fail the request handler.

**Testing:**

- `/` resolves to `public/index.html`.
- `/app.js` resolves to `public/app.js`.
- `/configs/luggage/common.json` resolves under the repo.
- `/../package.json` or encoded traversal should return `undefined` or fail safely.

### HTTP handler

**Purpose:** Serve files or return simple errors.

**Behavior:**

- `403 Forbidden` if `safePath` rejects the path.
- `200` with an appropriate content type for existing files.
- `404 Not found` for missing paths or directories.

**Testing:** Run `npm start`, request `/`, `/app.js`, and a missing path. Confirm status codes and content types.

## Config JSON files and schemas

### Luggage config

`configs/luggage/common.json` contains starter luggage presets. `configs/luggage/schema.json` documents the intended schema. Validation currently happens in `scripts/validate-configs.mjs`, not through a JSON Schema validator.

**Correctness checklist for changes:**

- Use positive millimetre dimensions.
- Keep default quantities positive in config; the UI may clone them to zero when a user reduces quantity.
- Include a non-empty `sources` array for every item.
- Use source URLs and retrieval dates that pass validation.
- Use `compressibility` only from `0` to `1`.

### Vehicle configs

Vehicle configs are split by region under `configs/vehicles/europe` and `configs/vehicles/north-america`. `configs/vehicles/schema.json` documents the intended schema.

**Correctness checklist for changes:**

- Add browser-visible files to `VEHICLE_FILES` in `public/app.js`.
- Include at least one manufacturer source and one rental-company or rental-broker source.
- Keep cargo-zone ids unique per vehicle.
- Ensure every `seatConfigurations[].cargoZoneIds[]` value references an existing cargo zone.
- Provide `dimensionsMm` for zones that should be stack-estimated. Zones with only `volumeLitres` are allowed but skipped by placement logic.
- Keep `usableFraction` in `(0, 1]`.
- Keep seat-back angles `>= 0` and `< 90` degrees.
- Maintain exactly one `isDefault: true` vehicle unless smoke tests are updated intentionally.

## Error handling strategy

The codebase uses three different error patterns:

1. **Throwing runtime errors:** Examples include invalid JSON, failed file reads/fetches, and unknown seat configuration in `estimateFit`.
2. **Accumulated validation errors:** `scripts/validate-configs.mjs` collects many config issues before failing, which makes dataset fixes easier.
3. **Returned warnings:** `estimateFit` returns non-fatal warnings for low-confidence/dimensionless/encroached zones so the UI can display caveats without blocking results.

When extending the app, prefer validation errors for bad config data, returned warnings for user-visible caveats, and thrown errors for programmer mistakes or unrecoverable load failures.

## Recommended test plan

Run these checks before merging code or config changes:

```bash
npm run validate:configs
npm run smoke:app
npm run check
```

For UI behavior changes, also run:

```bash
npm start
```

Then open `http://localhost:4173` and manually check:

- Vehicle and seat-configuration selectors update results.
- Quantity inputs update fit metrics and lists.
- Reset restores default quantities.
- Top, side, rear/front, and 3D tabs render expected placement views.
- Seat-back encroachment degree changes warnings, fit calculations, and wedge visualization when active zones support it.
- 3D drag and orientation presets update the view.

## Suggested future unit tests

The current project has script-level smoke tests but no dedicated unit test framework. If one is added, prioritize:

1. `fitEstimator` helpers: permutations, opening fit, seat-back encroachment, collision, split/normalize spaces, and unknown seat config error.
2. Config validators with synthetic invalid fixtures.
3. Browser state/render helpers under a DOM test environment.
4. Static server `safePath` traversal and content-type behavior.
5. Regression fixtures for known real-world vehicles where expected starter luggage fit/non-fit behavior should remain stable.

# Current prototype: Wilderness navigation

Run `python3 -m http.server 8080` in this folder and open http://localhost:8080/.

The active game is a navigation-only exercise on a 1,440 × 1,440 m rolling forest (5.0625 times the previous 640 m map area). Terrain tiles and nearby instanced scenery are culled to preserve local rendering cost. Enemies, weapons, loot, damage, camp survival and footprint trails are no longer loaded. No stamina or hydration systems. Streams run downhill through the existing gullies, with shallow water and animated ripples. The original terrain is unchanged; blue lines on the map mark the drainage routes. Water uses the terrain tile culling and one shared lit material; no reflections, transparency passes or additional lights. Navigation domain logic is in `navigation.js`; checkpoint rendering, static terrain chart and instrument UI are in `navigation-view.js`.

- M / Xbox View or K / Xbox LB: hold/stow the map and compass together. Look down with mouse or right stick to read the fixed north-up map (start, current destination and visited posts, 180 m grid, 7 m elevation bands, existing dirt track). No live position or route guidance.
- The compass is held in the left hand, the chart in the right; the dial and needle track map north as you turn. Movement and looking stay active while equipment is held. No floating map/compass overlay.
- J / Xbox RB: assignment. G / Xbox X: register a nearby post in order and receive the next coordinates. Easting and northing are metres from the chart’s south-west corner. Future destinations stay off the chart until unlocked.
- Esc / Xbox Menu: pause/settings. Reset exercise button, R or Xbox Y while paused. Existing movement/tuning and manual night switch retained; navigation starts in daylight by default.
- Eight physical labelled posts, terrain-grounded in obstacle-free locations, now spanning over 80% of the map width and height. The clockwise wilderness circuit runs roughly 5.6 km in straight-line legs across outer ridges and valleys. Only A is known at the start; registering each correct post supplies the next grid, easting and northing. Only visited/current posts appear on the chart; reset seals future destinations again. Completion reports checkpoint count, distance walked and elevation gained, with no timed score.

Checks: tests/navigation.mjs, tests/movement.mjs, tests/terrain.mjs, tests/lean.mjs and tests/performance.mjs pass. Browser test verified A→B→C, completion/reset, map, compass and post labels. `?navtest=1` enables explicit development-only post teleport buttons; absent from normal play.

Performance: existing `?benchmark=1&weapon=1` now exercises walking, turning, jumping and compass inspection, with zero enemies. Saved artifacts/navigation-performance.json: Chrome 1680×962, scale 0.8617, 60 FPS average, 16.66 ms mean, 18.1 ms p95, CPU 0.82 ms, 25 draws / 81,371 triangles. Prior combat scene: 60 FPS, 16.67 ms mean, 17.5 ms p95, CPU 1.97 ms, 35 draws / 127,509 triangles. GPU snapshot 9.36 ms versus prior 6.06 ms, still below budget; no extra rendering passes. This is not a guaranteed 60 FPS minimum. Preview artifacts/navigation-map.png and navigation-post.png. Previous gameplay source preserved at artifacts/pre-navigation-game.js.

Held equipment pass: `held-navigation.js` uses the existing chart canvas as one reusable texture, a camera-relative low-poly hand rig and a rotating compass dial/needle. Holding equipment does not block mouse/right-stick look or movement; looking down reveals it. Shared materials and merged arm geometry add eight draw calls, no lights or shadow passes. Browser verified forward/down inspection, stow and normal startup; navigation and performance checks passed. Matched 1200×769 stress results: stowed 41.9 FPS, 23.86 ms mean / 34.4 ms p95, CPU 2.10 ms, 20 draws; held 43.0 FPS, 23.25 ms mean / 34.4 ms p95, CPU 1.95 ms, 28 draws. GPU snapshots 5.67 / 5.68 ms. Empty-render checks 39.2 / 44.4 FPS show development-machine/browser cadence below 60; the 16.67 ms requirement remains unmet. Results: artifacts/held-navigation-stowed-performance.json and held-navigation-performance.json. Preview: artifacts/held-navigation.png.

River pass validation: tests/river.mjs, terrain.mjs, navigation.mjs and performance.mjs passed; browser checked the exposed riverbanks, animated water, updated chart and shader errors (none). The standard `?benchmark=1&weapon=1` at 1200×769 measured water off/on: 40.4 / 41.0 FPS; mean 24.77 / 24.38 ms; p95 34.0 / 33.9 ms; CPU 2.87 / 2.78 ms; 38 / 43 draws; GPU snapshots 5.19 / 5.03 ms. Empty-render cadence 38.9 / 38.3 FPS. The added water showed no measured frame-time regression, but the development Mac remains below the 60 FPS / 16.67 ms target. The riverbank stress case measured 41.9 FPS, p95 33.9 ms. Saved artifacts/river-disabled-performance.json, river-performance.json, river-bank-performance.json and river.png. `?rivertest=1&benchmark=1` is an explicit water stress case; `?benchmark=1&river=off` hides water only for comparison.

Checkpoint circuit validation: navigation domain tests cover eight clear, terrain-grounded posts; over 80% map width/height coverage; long legs; initial A-only revelation; wrong-order rejection; each next-coordinate unlock; completion and reset. Browser verified every A→H transition, wrong-order B rejection, completion at 8/8, and the held chart updating to show only A and B after reaching A. Static chart terrain is cached once; texture updates happen on stage changes. Distant post groups are culled before rendering. Standard stress test: 41.3 FPS, 24.24 ms mean / 34.4 ms p95, CPU 3.06 ms, 36 draws, GPU snapshot 4.94 ms; previous river pass 41.0 FPS, 24.38 ms / 33.9 ms p95, CPU 2.78 ms, 43 draws, GPU 5.03 ms. Mean and draw calls improved, p95 remains above 16.67 ms; the development machine still does not meet minimum 60 FPS. Saved artifacts/checkpoint-circuit-performance.json, checkpoint-next-coordinates.png and checkpoint-chart.png.

Weather: Settings → Weather selects Automatic, Clear, Strong wind, Rain or Thunderstorm. Automatic cycles through 70 s clear, 45 s wind, 90 s rain, 70 s storm and 45 s easing rain, with gradual transitions; its clock pauses when the exercise pauses. Rain is a fixed pool of 640 GPU-animated line segments in one draw call, following the player and tilting with gusts. Foliage sways by at most .234 m in world space, inside the existing .35 m culling padding, with no instance-buffer edits. Storms reduce daylight and visibility and briefly flash the existing sun/hemisphere lights; no extra lights, shadow passes or reflections. Night rain is restricted to the torch beam, except during lightning. Shared generated noise buffers supply wind/rain loops and a bounded thunder voice delayed 1.8 s after a strike; audio uses the movement audio context and starts through the normal game gesture. Weather sound and Lightning flashes controls are independent; disabling flashes keeps thunder.

Weather validation: tests/weather.mjs covers cycles, bounded transitions/gusts, spaced lightning, pause, flash suppression with thunder retained, clearing, rain capacity/buffer reuse, fog bounds, no extra lights and dark-night lighting. Torch checks pass. Browser verified all weather selections, the lightning control, day/night compatibility and rain restricted to the torch beam; no shader errors. Final standard stress comparisons at 1200×769: clear 41.3 FPS, 24.24 ms mean / 34.6 ms p95, CPU 2.60 ms, 35 draws, GPU snapshot 6.30 ms; storm 41.1 FPS, 24.33 ms mean / 34.5 ms p95, CPU 3.08 ms, 35 draws, GPU 5.13 ms. Pre-weather checkpoint baseline: 41.3 FPS, 24.24 ms / 34.4 ms p95, CPU 3.06 ms, 36 draws, GPU 4.94 ms. Clear-weather idle uniforms and camera direction calculations were removed after an initial CPU 3.42 ms result. Empty-render cadence remains around 40 FPS; minimum 60 FPS / 16.67 ms remains unmet on this Mac. Saved artifacts/weather-clear-performance.json, weather-storm-performance.json, weather-storm.png and weather-night.png.

Natural landmark pass: `landmark-routes.js` shares three static river/trail route fields between the terrain, water, planting and chart. Unequal river bends and widths, two downhill tributaries, shallow carved beds and muddy banks replace the uniform sinusoidal channel. Tributary mouths meet the main water level and are clipped against its surface to avoid overlapping water. The independent valley trail follows the bank, detours through the start clearing and branches into west ridge/east side trails. Dirt edges use a locally refined distance field on the exact terrain planes, preventing gaps and false wedges at narrow forks. Existing pebble/grass budgets are distributed between branches; no added lights, reflections or render passes. Water keeps one shared material and the existing tile culling (59 total tiles; only nearby tiles render). The held chart draws all actual river/trail branches while preserving current/visited-only checkpoint revelation.

Landmark validation: river, forest, terrain, navigation, performance, weather and torch checks pass. Added checks cover tributary downhill flow, submerged wadeable beds, water-level agreement at confluences, trail branch continuity and rendered dirt matching the terrain. Browser checked riverbanks, trail forks and the held chart, with no shader errors. Final standard `?benchmark=1&weapon=1&weather=clear`, Chrome 1200×769, scale 1: 42.0 FPS, 23.83 ms mean / 34.4 ms p95, CPU 2.07 ms, 32 draws / 40,090 triangles, GPU snapshot 5.78 ms. Previous weather-clear baseline: 41.3 FPS, 24.24 ms / 34.6 ms p95, CPU 2.60 ms, 35 draws / 40,541 triangles, GPU 6.30 ms. No measured regression after refining trail junctions. Empty-render cadence 39.8 FPS; minimum 60 FPS / 16.67 ms remains unmet on this Mac. Results: artifacts/landmarks-performance.json; previews: landmarks-trail.png and landmarks-map.png. Development-only `?navtest=1` adds river/trail fork inspection buttons; normal play has no teleports.

Gully correction (supersedes the carved river passes above): removed `channelHeight` entirely from terrain generation. `drainage.js` computes downhill neighbours and catchment accumulation once from the original 5 m height field, selecting 14 bounded streams (2.81 km total) in established drainage gullies. Every selected segment descends; routes end at existing local basins or the map boundary. There is no global water plane, terrain raising, trench excavation, depression filling or ridge crossing. Water stays 16 cm above the local bed, its cross sections stop against existing banks, and ripples advect along downstream route distance. Trails remain unchanged. Chart, planting and checkpoint clearance use the actual new drainage routes; future checkpoint revelation stays sequential. Water uses existing shared material/tile culling, with no additional lights, reflections or passes. River tests compare all original terrain vertices to the pre-river height formula, verify downhill catchments, shallow surface alignment and bounded geometry. Terrain, forest, navigation and performance tests pass; browser verifies banks and shader compilation.

Gully performance: matched standard `?benchmark=1&weapon=1&weather=clear` at 1200×769 / scale 1 measured 60 FPS average, 16.67 ms mean / 17.5 ms p95, CPU 1.14 ms, 33 draws / 39,206 triangles and GPU snapshot 5.70 ms. Previous landmark baseline: 42 FPS, 23.83 / 34.4 ms, CPU 2.07 ms, 32 draws / 40,090 triangles, GPU 5.78 ms. Restored original scenery adds one draw but lowers measured CPU/render time and triangle count. Empty render now also runs at 60 FPS; the changed browser cadence means the full FPS improvement cannot be attributed solely to this river correction. p95 remains above 16.67 ms, so a locked minimum 60 FPS is not established. Saved artifacts/gully-performance.json and gully-river.png. All water vertices sit within 30 cm of original terrain (maximum .279 m); shore edges may lie slightly beneath the banks so the ground naturally occludes them.

Compass correction: the red needle is derived from fixed world north projected into the actual held dial plane, including mouse/controller look, sway and leaning. The north-up card rotates with the magnetic needle. A fixed gold index on the bezel reads the player's heading (N/E/S/W and 5° ticks / 30° degree labels). Its geometry is merged into the existing bezel draw; held equipment remains seven mesh draws, with no added lights or shadow passes. Reused quaternion/vector fields avoid per-frame allocations, and absolute north avoids turn-delta drift. `tests/held-compass.mjs` checks all cardinal headings, multiple turns, different look angles and sway/lean, projected world-north alignment, matching N/needle orientation, stowing and the unchanged mesh budget.

Compass validation: navigation, performance and held-compass tests pass; browser checked north/east views with no rendering errors. Preview artifacts/compass-east.png shows north to the left while facing east, with E under the fixed gold marker. A first browser benchmark yielded zero samples and was rejected; a fresh tab returned valid results. After replacing world-matrix traversal/decomposition with three reused quaternion rotations, final standard 1200×769 stress result (570 samples): 60 FPS average, 16.67 ms mean / 17.5 ms p95, CPU 1.17 ms, 33 draws / 38,553 triangles, GPU snapshot 5.65 ms, empty-render 60 FPS. Initial compass CPU was 1.31 ms. Previous gully baseline: 60 FPS, 16.67 / 17.5 ms, CPU 1.14 ms, 33 draws / 39,206 triangles, GPU 5.70 ms. Final frame times, update cost and draw calls match baseline; the 16.67 ms minimum remains unproven because p95 exceeds budget. Saved artifacts/compass-performance.json and compass-initial-performance.json.

---

Historical implementation notes follow (superseded by the navigation prototype above).

# Movement Lab

A first-person browser game with a reference-inspired green low-poly forest, Xbox support, movement effects, footprint trails, and a relentless human pursuer.

Serve the project over HTTP: `python3 -m http.server 8080`, then visit http://localhost:8080 in a desktop browser. Controller play works without pointer lock; mouse look requires it. Click once to enable sound if the browser blocks gamepad-triggered audio.

## Controls

| Action | Keyboard / mouse | Xbox |
|---|---|---|
| Move / look | WASD / mouse | Left / right sticks |
| Sprint | Hold Shift | Hold left stick click |
| Jump | Space | A |
| Crouch / slide | Hold C | Hold B |
| Aim | Hold right mouse | Hold LT |
| Fire / attack / throw | Left click | RT |
| Reload | R | X |
| Select loadout | 1–5, Q / E | LB / RB |
| Melee | F | Right stick click |
| Respawn | T | Y |
| Pause / resume | Esc / enter button | Menu / A |

## Imported starter kit

Uses the supplied **Low Poly FPS Starter Kit v1.1 (Assets without Unity Project)** by RGS_Dev. All original FBX files are retained in `assets/pack`. An older FBX brick is converted to triangle data in `Brick.json`. The models' materials use neutral weapon colors and warm tan skin; source assets are unchanged.

Loadouts:

- Glock G48: 12 rounds / 96 spare; semi-automatic, 34 damage. A suppressor is attached to the animated gun bone.
- M416: 30 / 180; automatic, 25 damage.
- AWM sniper: 5 / 25; 100 damage, slow firing, scope overlay.
- Combat knife: short-range attacks, 60 damage.
- Grenade: three throws per attempt, delayed release animation, 2.2-second fuse and radial blast damage.

Supplied idle, fire, aimed fire, aim, reload, draw, holster, walk, run, jump, knife attack, rifle melee, and grenade throw animations are wired to gameplay where applicable. Glock empty reload is selected when available. Animation durations drive reload timing.

The pack's barrels and walls are destructible, with their supplied shattered models. Barrel explosions can chain and damage the pursuer or player. Grenades use the supplied model and smoke effect. Bullet and shell models produce visible projectiles and ejected casings. Bricks are placed near the props.

The supplied **Silenced Pistol B 002.wav** plays for firearm shots. Rifle and sniper temporarily reuse that recording with adjusted playback pitch; this ZIP contains no additional audio.

## Movement and pursuit

Movement runs at 120 Hz with normalized diagonal input, analog stick magnitude, acceleration/braking, limited air control, jump buffering and sprint slides. Dead zone, look speed, camera motion, arm motion and footstep volume are adjustable. Footprints retain the newest 2,048 marks.

The pursuer catches walking players; sprint to create space. Shots stagger and damage them. Once knocked down they return behind you after five seconds. Close attacks deal 25 damage. Zero player health pauses the game; restarting begins a fresh attempt. Prop destruction remains until a page reload.

The FPS display measures rendering frame rate. UI updates are throttled; only the active weapon rig animates. Weapons render in a separate depth pass so scenery cannot clip through the viewmodel.

## Verification

Run `node tests/pack.mjs` from this directory. Tests parse the actual supplied FBX files and verify animation availability, weapon switching, ammo, reloads, grenades, destructible props, damage, materials and reset.

`weapon-preview.html` is a standalone interactive model/animation inspection page.

Three.js 0.180.0 and its FBX support are vendored under the MIT license (`vendor/LICENSE`). Starter-kit usage is subject to its creator's terms; confirm permission for public browser distribution before publishing.

Weapon viewmodels sit closer to the camera. In full sniper aim the viewmodel is hidden, leaving only the scope view. Grenades use a sampled ready pose blended into the supplied throw, release at 0.98 seconds from the animated hand, hide the held grenade at release, and blend back to ready.

## Detailed forest pass

Reference-inspired layered pine canopies, taller faceted trunks, exposed branches, dense grass, ferns, shrubs, boulders, pebbles, cut stumps, fallen logs, a mottled ground surface, a winding dirt path, polygonal mountains and clouds. The flat playable ground is retained; the forest palette uses greens, warm browns, grey rocks and blue atmospheric distance. Forest details are instanced into 21 mesh batches; small plants do not collide or block shooting. Static tree/rock shadows use one baked render, covering the central forest.

Run `node tests/forest.mjs` for population, batching, spawn clearance and collision checks. `forest-preview.html` displays the environment without the player HUD.

Player size is adjustable from 0.70× to 2.20× (default 1.35×) in the pause menu. It scales standing/crouched eye height, collision radius and footprint shape, without changing weapon viewmodel size or movement speed.

Shadow stability: a fixed 2048² shadow map covers the central forest; tree canopies/trunks cast without receiving their own shadow map. The background ground plane sits below the playable ground, and the trail/footprints use distinct depth offsets to prevent surface flicker.

The pursuer is currently disabled for free-roam movement testing. Forest ground and the dirt trail use a procedural world-space shader with moss/soil patches and distance-filtered fine grain, preserving lighting, shadows and fog. No image textures or extra geometry are needed.

Tree trunks/branches/logs have procedural bark grain; cut stumps show rings; bushes, pine crowns and plants have clustered foliage detail; rocks have mineral layers, grain and moss on upward-facing patches. Fine shader detail is filtered by pixel footprint to limit distant shimmer, and respects instanced transforms.

Tree silhouettes now mix pine, spruce, fir, broadleaf, dead snags and saplings. Families have different crown geometry and tier proportions, with irregular spacing, missing tiers, asymmetry, lean, varied bark tones, uneven branches, flared roots and occasional knots. Rendering remains instanced.

Weapon audio uses the supplied Guns Sound FX Pack Vol. 2: three variants each for silenced pistol, 5.56 rifle and .243 rifle (AWM substitute), plus ammo handling on reload, knife draw/holster and metal prop hit sounds. Audio is decoded once and supports overlapping automatic shots.


Performance pass: forest instances are culled in spatial cells against the camera and detail distance, with conservative bounds and cached transforms. Surface patterns are baked into four packed mipmapped RGB textures, using one sample per surface instead of repeated pixel hashes or noise samples. Forest lighting uses Lambert materials and cached hard shadows; render resolution defaults to at most 1× and only scales down under measured GPU pressure. Solid weapon/prop material slots retain their colours as vertex colours; skeletal attributes remain intact. Only the equipped rig participates in scene updates. The world and weapon render in a single pass, with the weapon ordered after world transparency and its own depth clear. Stationary world transforms are cached. Bullet holes and bullet/casing effects use bounded instanced pools. Hidden tabs stop submitting frames. GPU timing is sampled briefly during startup to avoid continuous profiling overhead. Hover the FPS display for frame, CPU, GPU and draw-call measurements. The developer-only ?benchmark=1 route exercises walking/turning/jumping/shooting, then tests an empty render to distinguish game cost from browser scheduling. Run tests/performance.mjs plus the forest and pack tests.

Firearms now kick the actual player aim upward with slight sideways recoil and reduced kick in ADS; subsequent shots follow the centre crosshair. Players counter the climb with mouse/stick input. The weapon itself recovers smoothly. Glock, M416 and AWM have distinct recoil strengths. A reusable unlit additive star follows each gun muzzle for 18–25 ms; the suppressed Glock uses a smaller flash. No dynamic lights or per-shot flash objects are created. Weapon preview includes an inspection checkbox for muzzle alignment. Future work must follow the 60 FPS performance requirement in AGENTS.md; current hardware/browser measurements are not a verified 60 FPS minimum.

Tree shadow audit: one static 2048² shadow map is fitted to the full forest bounds, including the entire 280 m floor. Trunks, crowns, exposed branches, roots and bark knots cast and receive shadows. Grass, shrubs, ferns and cut wood also receive them. Full original forest instances are restored before any shadow bake, then normal camera culling resumes, so offscreen trees keep their cached shadows. Run `node tests/shadows.mjs` for light-frustum coverage and shadow-rebuild restoration checks.

Right-stick look sway adds a subtle smoothed lean (at most about 1°), 12 mm of lateral head motion, and 8 mm of vertical motion, with a small matching weapon lag. Stick release returns the pose smoothly to centre, ADS reduces it by 85%, and the existing Camera motion/Arm motion settings control its strength. Look input itself stays immediate. The effect reuses one output object and adds no draw calls. Run `node tests/look-sway.mjs` for response, bounds, ADS, neutral recovery and frame-rate consistency.

Muzzle flashes are now half the previous diameter and render before the gun in the transparent viewmodel pass, with depth testing enabled and depth writes disabled. The shared viewmodel depth clear still happens once, so overlapping weapon geometry covers the flash without introducing another render pass.

Hold Q/E or Xbox D-pad left/right to lean around cover. Weapon cycling is now Z/X (number keys and bumpers still work). Lean moves the head and weapon up to 36 cm × player size sideways with about 9° of roll, eases back on release, and stops for sprinting/sliding/jumping. A head sweep uses existing world colliders to limit peeks into cover; shots originate from the leaned camera. Muzzle flashes have been halved again. Run `node tests/lean.mjs` for controls, collision, recovery and cancellation checks.

Muzzle flashes have been completely removed, including their geometry, materials, timers and preview control. Shooting, gunshot sounds and actual aim recoil remain active.

Movement tuning: the right stick now uses a radial power curve (default 1.6) after the dead zone, reaching full turn speed at 98% travel without input smoothing. Left-stick movement remains linear. Default ADS sensitivity is 55% of hip look speed. Ground braking is now 42 m/s²; directional grip gradually sheds lateral drift, and opposite input brakes before accelerating in reverse. Tune Stick precision curve, Aim sensitivity and Direction grip in the existing menu. Run `node tests/movement.mjs` for precision, release, full turn speed, analog walking, stops, reversals and jumping.

Animated enemy: one recoloured Quaternius mannequin now pursues the player, with idle, fast zombie locomotion, scratch attacks and hit reactions from Universal Animation Library 2 (CC0; licence in assets/enemy). The runtime GLB is trimmed to six clips / about 1.5 MB. One hidden capsule handles shots and melee; the skeleton updates at 30 Hz, and no dynamic shadow pass is added. The pursuer starts behind you with a short grace period, damages you at close range, and returns after being downed. T / Xbox Y resets both player and enemy. Grenade explosions can kill it. See enemy-preview.html to inspect animations and run `node tests/enemy.mjs` for chase, attack, shooting, death/return and reset checks.

The enemy uses one small flat contact-shadow mesh instead of a dynamic shadow map. The benchmark now holds the pursuer onscreen and simulates compensating for recoil so it measures enemy rendering together with the forest rather than a mostly sky-facing camera.

Enemy grounding pass: the mannequin has a 1.85 m standing height at player size 1,
scales live with the player-size slider (including its damage capsule and collision
radius), and keeps the supporting sole on the flat ground using cached foot bones.
Imported animation now updates each rendered frame, without the old procedural
whole-body bounce/tilt. Turns blend smoothly, chase playback follows actual travel,
and attacks stop locomotion for their 1.8 second animation. Hit reactions hold for
0.55 seconds. A single soft sun-aligned shadow plane combines body shading and
foot contacts; lifted feet fade their contact shading. No dynamic shadow-map pass
was added. This is an approximate contact shadow, not a silhouette shadow.

Grounding stress test (Chrome, Radeon Pro 555X, DPR 1): 59.1 FPS average,
16.93 ms mean / 17.8 ms p95, 2.12 ms CPU, 8.80 ms GPU, 34 draws / 83,152
triangles. Previous enemy test: 60 FPS average / 18.3 ms p95, 4.05 ms CPU,
34 draws / 83,254 triangles. Rendering cost remains comparable; occasional dips
still prevent claiming a locked 60 FPS. Results: artifacts/enemy-grounding-performance.json.

Enemy pace/reaction revision: chase speed is now 1.8 m/s at every distance
(previously 6.8–7.9). A hit stops translation and attacks for the full imported
knockback clip. Repeated bullets apply damage without restarting the clip or
extending its recovery lock; locomotion crossfades back after it completes.
Pace/reaction benchmark with live controller input excluded: 56.9 FPS average,
17.57 ms mean / 17.6 ms p95, 1.46 ms CPU / 8.23 ms GPU, 35 draws.
CPU and GPU costs improved from the grounding measurement; the frame cadence
still does not meet a locked 60 FPS. Saved in artifacts/enemy-pace-performance.json.

Damage/death correction: the pack's Hit_Knockback clip contains a full fall and is
now used only for fatal hits. Surviving hits use a 0.55-second upright torso/head/
arm flinch plus a collision-checked backward step, then recover into locomotion.
Fatal hits play the fall once and hold its last pose until T/Y resets the game;
automatic five-second resurrection is disabled for the imported enemy.
Damage/death stress measurement: 58.4 FPS average, 17.13 ms mean / 17.6 ms
p95, 36 draws, adaptive render scale 0.65. This run still misses locked 60 FPS;
results saved in artifacts/enemy-damage-performance.json.

Wave trial: wave 1 starts with one enemy. Once the entire wave is defeated,
a two-second break starts the next wave with one additional enemy: 2, 3, 4, etc.
The HUD shows the wave and enemies remaining. T / Xbox Y returns to wave 1.
All enemies share player health, and bullets, melee and grenades target each rig
individually. Rigs share the loaded geometry/animation asset but have independent
skeletons. An eight-rig pool bounds active simulation; waves above eight send
reinforcements into cleared slots after the corpse fall finishes. Wave counts
continue increasing. Corpses are reused at the next wave to prevent accumulation.
A browser preview at wave-preview.html provides defeat-one / clear-wave controls.
The benchmark accepts &wave=8 to stress all eight enemies on screen.
Final eight-enemy stress run: 59.3 FPS average, 16.87 ms mean / 17.5 ms p95,
3.51 ms CPU, 9.08 ms GPU, 56 draws / 179,058 triangles, DPR 1. It remains
close to 60 FPS with occasional dips; this is not a locked 60 FPS result.
The prior single-enemy run was 58.4 FPS at adaptive scale 0.65, so render scale
and timing conditions differ. Results saved in artifacts/waves-performance.json.

Current mode: a five-minute survival trial replaces the endless waves. Start at
a small camp; search three black barrel caches along the trail. G / Xbox X
searches a nearby cache or deposits carried fuel at camp. X reloads when no
interaction is nearby; keyboard R always reloads. H / Xbox D-pad up uses one
medkit for 40 health. T / Xbox Y starts a fresh run. Cache contents are 1 fuel,
1 medkit, 18 pistol rounds, 20 rifle rounds and 2 sniper rounds, once per run.
Fuel is carried home; ammo and medkits are immediately usable. Stored fuel burns
for 60 seconds per unit during the night. Collect/store 3 fuel and survive to dawn.
Day lasts 180 seconds, night 120; cold outside the lit camp drains health at night.
A fire with fuel protects a five-meter camp area. Sun/fog colors fade at dusk and
return at dawn without extra lights or per-frame shadow-map rendering.

Starting ammo is deliberately limited: pistol 12+12, rifle 10+0, sniper 3+0,
knife, and one grenade. Three persistent enemies patrol rather than endlessly
respawn. Pistol shots attract within 32m, rifle shots 90m, sniper shots 110m,
and explosions 120m. They investigate the last noise, chase on visual contact
(with trunk/rock occlusion), and keep clear of a lit camp. Fatal falls stay down.
Barrels are non-explosive and indestructible so gunfire cannot remove the loot.
Caches avoid forest colliders; the old FPS demo walls are omitted in survival mode.

Functional/browser checks cover searching all three caches, depositing fuel,
healing, night camp protection, dawn completion, reset, patrol/hearing/visibility,
limited ammunition, collision clearance and previous weapons/movement controls.
A development-only ?survivaltest=1 panel exposes teleport/time controls for QA;
normal gameplay does not display it. The benchmark supplies ammo and disables
the survival timer so the existing combat stress workload remains comparable.
Final survival benchmark (Chrome / Radeon Pro 555X, DPR 1): 59.9 FPS average,
16.69 ms mean / 17.5 ms p95, 1.86 ms CPU, 8.00 ms GPU, 39 draws /
108,300 triangles. The eight-enemy wave baseline was 59.3 FPS, 3.51 ms CPU,
9.08 ms GPU and 56 draws. Survival is cheaper to render/simulate in these tests,
but occasional long frames still mean it is not a locked 60 FPS.
Results saved in artifacts/survival-performance.json.

## Knife-only rolling forest (current mode)

The player now carries only the animated combat knife. LMB / Xbox RT slashes;
F / right-stick click performs melee. Gun selection, aim and reload controls are
removed from normal gameplay. Gun rigs, bullets and gunshot samples are not loaded;
the original source assets remain available for future work. Caches supply fuel
and medkits in this mode. G / Xbox X searches or stores supplies.

The playable forest is 640 × 640 metres, compared with the former 280 × 280 floor:
5.22 times the area. A shared 5-metre triangulated height field supplies rolling
hills/valleys, with a flat starting camp. Physics samples the actual triangle
surface, including jumps and downhill landings. The dirt trail copies ground
triangles and masks its edges in the existing material shader. Trees, rocks,
plants, caches, footprints, enemy soles and contact shadows follow the terrain.
There are 4,636 trees and 78,455 grass clumps across the map, using the same bounded
instanced batches and distance/frustum culling. The outer boundary keeps movement
inside the finished terrain. Farther loot caches encourage exploring the trail.

`node tests/terrain.mjs` verifies map area, rendered/physical height agreement,
elevation range and walking/jumping on slopes. Pack and enemy checks also verify
the knife-only loadout, elevated caches and animated supporting soles on hills.
The development survival test panel adds a Hills viewpoint for visual QA.

Final knife/hills stress run: 25.6 FPS, 39.04 ms average / 83.4 ms p95,
6.12 ms CPU and 9.17 ms GPU at render scale .9, 37 draws / 165,733 triangles.
Earlier terrain runs averaged 60 and 58.1 FPS. The final empty-render probe was
also slow (34.5 FPS); process inspection showed heavy FileProvider, Finder,
spellchecking and other background activity. The final optimized build is not
a verified 60 FPS minimum. Results are in artifacts/knife-hills-performance.json
and the earlier busy-run sample. Spatial collision queries and short-range knife
occlusion now avoid scanning/raycasting the entire forest during movement/combat.

## Dark forest and torch

Select **Dark forest** in the start/pause menu to try night lighting at any time.
This controls the look only: the existing survival clock and cold rules continue
normally. A warm, soft-edged torch follows the player's view; **L**, **Xbox RB**,
or the **TORCH** button switches it on/off. The knife remains equipped. The beam
also becomes visible as the ordinary day/night cycle darkens the forest.
The transition fades smoothly and clouds dim with the sky.

The torch reuses one spotlight, adds no geometry or draw calls, and does not
render a dynamic shadow map. `node tests/torch.mjs` verifies toggling, camera aim,
night-cycle activation and the bounded light count. For rendering measurements,
use `?benchmark=1&weapon=1&dark=1`; `?dark=1` also opens a normal dark-mode run.

Dark/torch benchmark in the in-app browser: 39.4 FPS average, 25.38 ms mean /
34 ms p95, 3.61 ms CPU and 5.49 ms GPU, 37 draws / 137,691 triangles at scale 1.
The empty-render probe was 40.4 FPS, so this browser run does not verify 60 FPS.
Compared with the last knife/hills recording (37 draws, 6.12 ms CPU, 9.17 ms GPU),
the draw count is unchanged; different viewport/browser/system load means the
frame/GPU measurements are not a controlled before/after comparison.
Results: artifacts/dark-torch-performance.json. Browser checks confirmed both
menu lighting states, torch on/off, lit surfaces and no console errors.

## Eternal night (current mode)

Night is permanent. There is no daylight setting or dawn victory: survival time
continues while the camp needs fuel and the player searches for supplies.
Cold/night threat behavior starts immediately. The torch is the only world light;
the sky and fog are black, ambient/sun light and the old static shadow render are
disabled, sky silhouettes are hidden, and previously unlit floor/footprint/fire
materials now require illumination. Switching off the torch leaves the world
black while the HUD remains usable. L / Xbox RB / TORCH still toggles the beam.
The camp's fuel protection remains a gameplay refuge, without illuminating the
world beyond the player's torch cone. Forest distance/frustum culling stays active.

Eternal-night verification: screenshot pixels outside the torch cone were exactly
RGB 0/0/0; the same illuminated barrel region became RGB 0/0/0 with torch off.
Permanent-night, fuel/medkit, pause/reset and threat checks passed. Integration
caught and repaired a missing reset handler before the final browser test.
Final in-app stress run: 40.6 FPS, 24.62 ms mean / 33.9 ms p95, 3.73 ms CPU,
8.06 ms GPU, 35 draws at scale 1. Empty-render cadence was 39.4 FPS.
Compared with the preceding dark/torch recording, draw calls fell from 37 to 35;
GPU timing is not directly comparable because the preview viewport changed.
Locked 60 FPS remains unverified. See artifacts/eternal-night-performance.json.

## Reference-shaped torch cone

The torch now casts a roughly 68-degree forward fan with narrowly feathered sides,
45-metre maximum reach and a gentle distance fade. Its angular lighting shader has
extra vertical coverage, so trees within the wedge are revealed rather than
cropped into a circular spotlight pool. It follows camera aim and still leaves
surfaces outside the wedge black. Existing procedural material shader hooks are
preserved. This uses the same one spotlight and adds no meshes, shadow passes or
draw calls. Torch checks cover the fan footprint, tall-tree coverage, dark sides
and behind, toggle behavior, and preservation of the surface shader hooks.

Cone benchmark: 39.7 FPS / 25.2 ms mean / 34.1 ms p95, 3.86 ms CPU,
8.28 ms GPU and 35 draw calls at scale 1. Previous eternal-night sample:
40.6 FPS, 3.73 ms CPU, 8.06 ms GPU and 35 draws. Empty-render cadence was
37.8 FPS this run versus 39.4 before, so locked 60 FPS remains unverified.
Shader/torch/performance checks pass and final browser logs contain no errors.
Results: artifacts/torch-cone-performance.json; preview: artifacts/torch-cone.png.

Torch cone direction reversed exactly 180 degrees relative to the camera (build cone-flip-1). Direction and fan footprint checks pass. Benchmark: 41.2 FPS average, 33.9 ms p95, 35 draw calls, GPU 8.08 ms; prior cone baseline 39.7 FPS, 34.1 ms p95, 35 draws. No additional lights or rendering passes. In-app empty-render cadence was 39.9 FPS, so locked 60 FPS is not verified in this browser. Results: artifacts/torch-cone-flip-performance.json.

Corrected torch orientation (cone-horizontal-1): faces forward, with horizontal angular scaling 0.55 and vertical scaling 1.8 for a wide, shallow beam. Tests pass, no browser errors. Benchmark 41.8 FPS, 23.95 ms average, 33.9 ms p95, 35 draws, GPU 7.97 ms versus previous 41.2 FPS, 24.3 ms, 33.9 ms p95, 35 draws. No regression or additional rendering passes; development browser remains below 60 FPS (empty render 40.4 FPS). Results in artifacts/torch-horizontal-performance.json.

Torch wedge pass (cone-wedge-1): screen-projected diagonal boundaries widen from 10% half-width at bottom to 75% at top. Expanded vertical light coverage illuminates tall trees; preserved forward aim, darkness and existing material hooks. No added lights, meshes or passes. Direction, coverage and wedge tests pass; browser has no shader errors. Benchmark saved in artifacts/torch-wedge-performance.json: 35.4 FPS, 28.21 ms average, 34.1 ms p95, 35 draws, CPU 3.64 ms, GPU 5.89 ms, empty-render 34.6 FPS. Browser viewport changed to 674x843, so FPS/GPU figures are not directly comparable to previous 1280x720 results; 60 FPS remains unverified. Preview: artifacts/torch-wedge.png.

Flashlight rebuild (torch-real-1): removed projected wedge and elliptical fan. Single circular spotlight with reflector hotspot/soft spill, warm neutral white, distance attenuation, offset handheld origin and bounded turn lag/stride motion. Existing material shader hooks retained. No new shadow passes; torch does not yet cast occlusion shadows. Tests/torch.mjs passes; no browser shader errors. Same 674x843 browser benchmark: 36.2 FPS, 27.6 ms average, 34 ms p95, 35 draws, CPU 3.71 ms, GPU 5.43 ms, empty render 35.6 FPS. Prior wedge: 35.4 FPS, 28.21 ms average, 34.1 ms p95, 35 draws, GPU 5.89 ms. No measured frame-time regression; minimum 60 FPS remains unmet in this development browser. Artifacts: torch-realistic.png and torch-realistic-performance.json.

Black polygon outlines (ink-1): shared geometry edge attributes and material shader hooks draw antialiased black creases in the existing scene pass. Trees, rocks, shrubs, grass, props and skinned meshes use the effect; coplanar diagonals and continuous terrain are excluded. No extra draw calls or postprocessing target. tests/outlines.mjs passes, browser has no shader errors. Benchmark: 36.2 FPS, 27.66 ms average, 34 ms p95, 35 draws, CPU 3.69 ms, GPU 3.92 ms versus prior 36.2 FPS, 27.6 ms, 34 ms p95, 35 draws. No material frame-time regression; minimum 60 FPS still unmet in development browser (empty render 35.5 FPS). Saved artifacts/outlines-performance.json and artifacts/outlines.png.

60 FPS optimisation pass (fps-night-2): fog-distance instance culling with bounds overlap, skip hidden batches, avoid copying unchanged instance slots, reuse movement input Set, sustained GPU timing (removed five-second expiry), 1.2M-pixel scene budget on large windows with native-resolution HTML HUD. Resize keeps budget bounded. Performance/culling, sustained GPU timer, torch and outlines tests pass. Chrome 1680x962 first optimised run: 59.4 FPS, 16.84 ms average, 18.6 ms p95, 34 draws, CPU 2.83 ms, GPU 8.18 ms. Final with 0.8617 render scale: 60.0 FPS, 16.67 ms average, 18.6 ms p95, 34 draws, CPU 2.78 ms, GPU 7.11 ms. Empty render 60 FPS. This reaches a 60 FPS average, not a strict 16.67 ms worst-case guarantee. Previous in-app 36 FPS results are not directly comparable to Chrome. In-app verification blocked by browser URL security policy when accessing its error tab; no bypass attempted. Raw results: artifacts/fps-night-chrome.json, artifacts/fps-night-chrome-final.json; screenshot artifacts/fps-night-benchmark.png.

Day/night setting (day-toggle-1): Escape / controller Menu opens Night & darkness checkbox at top of tuning. Choice persists locally; daylight restores hemisphere/sun illumination, blue sky/fog and 90m fog range with matching culling. Night restores 45m fog and torch. Torch preference is retained but light suppressed in day; nighttime fuel drain/cold damage pause in day. Existing run is preserved. Browser verified both directions and persistence. Torch and survival checks pass, no shader errors. Daylight benchmark: 60 FPS average, 16.66 ms mean, 17.7 ms p95, 35 draws, GPU 10.89 ms at 1680x962 / 0.8617 scale; preceding night 60 FPS / 16.67 ms / 18.6 ms p95 / 34 draws. No extra shadow passes. Not a guaranteed minimum 60 FPS. Artifacts/daylight-performance.json and artifacts/day-night-setting.png.

Removed polygon outlines from game initialization (no-ink-1), restoring original geometry/material shading. Syntax check and browser render pass without errors. Daylight benchmark 60 FPS average, 16.67 ms mean, 17.5 ms p95, 35 draws, CPU 1.97 ms, GPU 6.06 ms versus preceding 60 FPS, 17.7 ms p95, 35 draws, CPU 3.23 ms, GPU 10.89 ms. No regression; strict 60 FPS minimum is not demonstrated. Artifacts/no-outlines-performance.json and artifacts/no-outlines.png.

# Condition bars always on screen

The health, stamina, food and water bars in the bottom-left corner now stay on screen the whole time you play. Before, they faded out whenever every bar was above 60, so at the start of a run they were invisible. Bars under 25 still turn red. Screenshot: `artifacts/vitals-always-on.png`.

Checks: all node tests pass. In the browser the panel is visible at full opacity with full bars, and there are no errors. This removes a fade and adds nothing drawn, so the performance stress test was not rerun.

# Xbox controller layout

The controller now works like this, and no button does anything blind:

| Button | Out in the world | In the bag |
|---|---|---|
| Left stick | Move (click to sprint) | Flick up or down to pick an action |
| Right stick | Look | |
| A | Jump | Use the picked action |
| B | Crouch | Close the bag |
| X | Do what the label under the crosshair says (hold to whittle or aim) | |
| Y | Open the bag | Close the bag |
| RT / LT | The label's other actions, only when it shows RT or LT | |
| LB / RB | Lean left and right | |
| D-pad | Nothing | Pick an action |
| Menu | Pause | Pause |

- **Eat, drink, set a snare, sleep rough:** open the bag with Y, pick the action with the D-pad and press A. These used to sit on the D-pad, Y and LT, and fired the moment you touched them.
- **RT and LT** only ever do what the label shows next to them. They used to build a fire or go to sleep wherever you stood. On the keyboard, F and Z also follow the label first, then fall back to building a fire or sleeping as before.
- Y no longer resets the whole run while the game is paused, and LB, RB and View no longer toggle panels that are not shown.
- The BAG button shows Y while you are using a controller, the picked action in the bag is filled in orange so it is easy to see, and the controls line on the menu lists both layouts.

Checks: all node tests pass, including the new label tests for which key does what. Browser-tested with a simulated Xbox controller: the D-pad, LB, RB and View change nothing out in the world, Y opens the bag, the D-pad moves to Eat and A eats, A on Drink drinks, B closes, and RT and LT on bare ground do nothing. No browser errors. This changes input only, with nothing new drawn, so the performance stress test was not rerun.

# Hands for every field action

Every survival action now shows in your hands. The map goes down for a moment, and the thing you are using comes into view and moves (`field-props.js`):

- **Picking up:** a branch, your throwing stick, a rabbit, a handful of dry grass, or a bundle of wood comes up from the ground and goes down into the bergen. Gathering wood by hand and finishing a chop both show the bundle.
- **At the fire:** building the fire lay sets the wood down ahead of you. Each strike scrapes the fire steel down towards the tinder, alongside the sparks. Adding wood tosses a bundle onto the fire. Roasting puts the rabbit on the spit and taking it off brings it back. Boiling sets the mess tin down, and taking it off lifts it back.
- **Water and food:** filling dips the bottle, drinking tips it up to your mouth, and eating raises a ration pack or the rabbit.
- **Snares:** setting a snare lowers the peg and noose, and lifting it brings it back.
- **Basha:** while you build it, a branch is worked into place and lashed, over and over.
- Whittling, aiming a throw and chopping keep their existing animations.

Checks: all node tests pass, including new ones in tests/held-compass.mjs. They check that every gesture has a prop, every prop is hand-sized and vertex-coloured, poses ease between key points, a hold takes over from a gesture, and the map comes back afterwards. Every gesture was screenshotted part way through in the browser, and the props were moved up into view where they first sat too low (`artifacts/field-actions-gestures.png`). No browser errors.

Performance: one mesh swaps between eleven props prepared at load, replacing the separate stick and hatchet meshes. Acting never costs more than one extra draw, and nothing is allocated per frame. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 30 to 31 before and 30 to 32 after, CPU 3.1 to 3.5 ms before and 3.2 to 3.4 ms after (`artifacts/field-actions-before-performance.json`, `artifacts/field-actions-after-performance.json`). 60 FPS on the development Mac is still not confirmed.

# DS orders and the debrief (overhaul phase 5)

The survival work is now part of selection. The DS gives orders for each leg of the course, checks them at the posts, and reads out a record at the end. Missing an order is a warning in the debrief, never a failure.

- **Leg 1, posts A to C:** "Rations are issued for today only: the DS takes what is left at C." At post C the DS takes every ration left in your bergen: "From here you live off the land." From then on, food comes from hunting and trapping.
- **Leg 2, posts D and E:** "Make camp by dark: a lit fire, a basha, and a cooked meal." At 21:30 on the night after post C (the next night if you reach C after 19:00), the DS walks through. You need a lit fire within 10 m of your basha, to be at your camp, and to have eaten a cooked rabbit since post C (or have one in your bergen). If you go to sleep before 21:30, your camp is judged as you lie down, so a fire that dies in the night doesn't count against you.
- **Leg 3, posts F to H:** "Arrive at each with at least a litre of safe water." The DS checks filtered or boiled water at each post.
- **Where the orders show:** the result line when you step off and at each post, a red pencilled line across the bottom of your map, and the pause menu. Once you are under way, the pause menu drops the opening brief and shows your condition, the orders in force and the record so far. When the circuit is complete it shows the debrief.
- The opening brief and the controls line mention the new chain: rations until post C, then building a fire and a basha.

Checks: all node tests pass. The new tests/orders.mjs covers the orders by stage, rations taken once at C, the camp deadline (same night or the next), every camp shortfall (no fire, no basha, too far apart, away from camp, no cooked meal), water at F to H, the debrief lines and saving. The save test now round-trips the orders. Browser-played start to finish: register A to C (the DS takes the ration), let the camp deadline pass with no camp (the DS notes what is missing), register D to H with too little safe water at F, then pause for the debrief. Screenshot: `artifacts/survival-orders-debrief.png`. No browser errors.

Performance: the orders are a few comparisons at the 10 Hz HUD rate and a map redraw when the stage changes. There is nothing new in the scene. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 29 to 30 before and 30 after, CPU 3.4 ms both, update phase 0.40 to 0.51 ms before and 0.39 to 0.41 ms after (`artifacts/survival-orders-before-performance.json`, `artifacts/survival-orders-after-performance.json`). 60 FPS on the development Mac is still not confirmed.

# Camp and night (overhaul phase 4)

The day now ends somewhere you made: a fire, a basha, and water boiled for the morning.

- **Basha:** with two fallen branches, open ground offers "Pitch a basha · Z" (LT on Xbox). About 4 seconds of work puts up a lean-to two steps ahead, open side towards you. If you carry the sleeping bag and bivvy, the bivvy sheet makes the roof; otherwise it is thatched with dead bracken. One basha stands at a time, and pitching another more than 40 m away moves it. Saves keep it.
- **Sleep depends on where you are:** Z under your basha after dusk ("Basha · Sleep · Z") gives a full night. Anywhere else it is a broken sleep of at most 3 hours that leaves you still tired, and the message says to pitch a basha. You still need a fire or a sleeping bag to sleep at all. Under the basha, rain and wind chill you much less, and the bivvy sheet keeps more rain off than bracken does.
- **Boiling water takes time:** with the stove and mess tin, "Boil water · F" at a lit fire pours your untreated water into the tin on the hearth stones. After about 15 minutes of game time (15 seconds) the label shows "Take boiled water", with steam over the tin, and the water goes back in your bottles, safe to drink. Saves keep a tin on the fire.
- The bag's camp row shows whether you have a basha or how many branches you have towards one, with Pitch basha and Sleep (or Sleep rough). The water row has Boil and Take boiled water.
- The tiredness advice now says to make camp after dusk with a fire and a basha from two fallen branches.

Checks: all node tests pass, with new ones for the basha (branches used, sheet or bracken roof, one at a time, saving), sleep by location (broken in the open, rain under each roof), the mess tin (one at a time, needs a lit fire, boils over time, steam when done, saving), the labels and the bag rows. Browser-played: pitch a basha with Z, build and light a fire, boil untreated water and take it off, then sleep under the basha at dusk. Screenshots: `artifacts/survival-camp-dusk.png`, `artifacts/survival-camp-boil.png`, `artifacts/survival-basha-tarp.png`, `artifacts/survival-basha-bracken.png`. No browser errors.

Performance: the basha is one mesh with both roofs prepared up front, and it is not drawn when far away. The mess tin is one small mesh shown only while it is on the fire, with two prepared shapes. There are no new lights, materials or shadow passes. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 28 to 31 before and 30 to 31 after, CPU 2.9 to 3.7 ms before and 3.1 ms after, update phase 0.39 to 0.48 ms before and 0.34 to 0.44 ms after. These are all within run-to-run noise (`artifacts/survival-camp-before-performance.json`, `artifacts/survival-camp-after-performance.json`). 60 FPS on the development Mac is still not confirmed.

# Fire from the forest (overhaul phase 3)

A fire is now built from things you find, then lit by hand.

- **Tinder:** look down at open, dry ground away from trees and water: "Pull dry grass for tinder · G". You can carry 3 handfuls. Whittling a stick also leaves shavings you keep as tinder.
- **Dead wood:** you now carry a hatchet (0.9 kg, packable like any kit). At a big tree the label says "Chop dead wood · G": a few swings over about 2 seconds, with the sound of each one, and two bundles of wood. Without the hatchet you still gather one bundle by hand.
- **Kindling:** a fallen branch, the same ones you whittle sticks from.
- **Building:** with tinder, a branch and a bundle of wood, open ground offers "Build a fire here · F". The fire lay goes down a couple of steps ahead, where you can see it above the map. It is not alight yet.
- **Striking:** "Fire lay · Strike your fire steel · G" (or F). Each strike throws a shower of sparks with a scrape. About 2 in 5 strikes catch in the dry, fewer in rain. Then it burns as before, and you feed it wood.
- **Roasting:** at a lit fire with a raw rabbit, "Roast rabbit · F" puts it on a spit over the flames. The label shows how far it has got. It needs the fire burning for about 45 minutes of game time, then "Take roast rabbit · G". Water is still boiled on the stove at the fire.
- The bag's fire row shows wood, tinder and branches, with Chop, Pull grass and Build fire, Strike steel or Add to fire. The rabbit row has Roast and Take off spit. Saves keep a fire you built but have not lit, and a rabbit on the spit.
- The cold advice lists what you still need for a fire, and the hunger advice now says to roast your rabbit.

Also fixed: with whittling also on offer, a quick tap on G during a slow frame could start whittling instead of doing the labelled action. The key's state now decides before the timer does.

Checks: all node tests pass, including new ones for the fire lay, striking, the spit, saving a laid fire and a spit, the bag rows, and the new labels. Browser-played start to finish: pull tinder, chop a tree, pick up a branch, build, strike until it catches, roast a rabbit and take it off. Screenshots: `artifacts/survival-fire-chop.png`, `artifacts/survival-fire-laid.png`, `artifacts/survival-fire-spit.png`. No browser errors.

Performance: the spit uses two prepared shapes swapped when the rabbit is done, and the sparks are one 10-point draw shown only for a moment after a strike. There are no new lights or shadow passes, and the fire's existing glow is reused. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 30 before and 30 to 31 after, CPU 2.9 to 3.5 ms before and 2.7 to 2.9 ms after, update phase 0.34 to 0.47 ms before and 0.30 to 0.35 ms after. These are all within run-to-run noise (`artifacts/survival-fire-before-performance.json`, `artifacts/survival-fire-after-performance.json`). 60 FPS on the development Mac is still not confirmed.

# Rabbit warrens and snares on runs (overhaul phase 2, part 2)

Rabbits now live somewhere. About two thirds of the 150 m map squares have a warren on level, open, dry ground: two low earth mounds with dark burrow mouths, droppings and bare scrapes, in the same faceted style as the springs (`warrens.js`). Most rabbits come out within about 18 m of the nearest warren (never right beside you), so a warren is where to hunt.

- Look at a warren: "Rabbit runs · Set snare · G". A snare set within 12 m of a warren catches 85% of the time; anywhere else only 20%, and the message says so. A catch still comes within a few hours.
- The hunger advice mentions the warren runs when you carry snare wire.

Checks: all node tests pass, with the new tests/warrens.mjs covering fixed placement (level, open, clear of rivers and trees), the nearest-warren lookup, the bounded view, snare odds on and off a run, and rabbits spawning by warrens. Browser-checked: walking up to the nearest warren to the start shows the label, G sets a snare on the run, and rabbits come out near it. Screenshot: `artifacts/survival-warren.png`. No browser errors. Placing all warrens takes about 3 ms at load.

Performance: one instanced draw for the warrens around you (at most 9 in the surrounding squares, about 180 triangles each), rewritten only after you move 10 m. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 29 to 30 both, CPU 2.5 to 2.6 ms before and 2.7 to 3.0 ms after, update phase 0.31 to 0.33 ms before and 0.29 to 0.36 ms after, all within run-to-run noise (`artifacts/survival-warrens-before-performance.json`, `artifacts/survival-warrens-after-performance.json`). 60 FPS on the development Mac is still not confirmed.

# The hunt: branch, knife, throwing stick (overhaul phase 2)

You no longer start with a throwing stick. You make one.

- **Fallen branches** lie under about 45% of the big trees, in pale weathered timber so they show in the grass (`forest-floor.js`). Each tree always drops the same branch in the same place, a branch you take stays gone, and the save remembers it. Look at one: "Pick up branch · G". Branches go in the bergen as 1×3 blocks.
- **Whittling:** you always carry a knife now. With a branch and no stick, the label offers "Whittle stick · hold G" alongside whatever you are looking at (or "Whittle a throwing stick from your branch · G" when you're looking at nothing). Whittling takes about 2.5 seconds with the stick in your right hand in place of the map; moving off or pressing G again stops it. The bag has a Whittle button too.
- **Throwing:** look at a rabbit within 12 m: "Throw stick at rabbit · hold G" (hold X on Xbox, tap on touch). Holding draws the stick back; holding for 0.6 seconds or more is a steady throw (+10% to hit), a snatched throw is −10%. The stick flies in a short arc. A hit drops the rabbit where it sat ("Pick up rabbit · G"); a miss sends it running. Either way the stick lies where it landed until you fetch it ("Pick up your stick · G").
- **Without a stick** the rabbit label says what to do: find a straight branch, or whittle the one you have. The hunger advice follows the same chain.

Checks: all node tests pass, with the new tests/forest-floor.mjs covering fixed branch spots, the instanced floor, taking, whittling, the thrown stick's flight and landing, rabbits on the ground, bounded pools, aim affecting the throw, and saving and restoring the floor (older saves load with a fresh floor). tests/fieldcraft.mjs covers the new labels. Browser-played start to finish: walk to a branch, pick it up, hold G to whittle, aim at a grazing rabbit, release, pick up the rabbit and the stick. Screenshots: `artifacts/survival-hunt-whittle.png`, `artifacts/survival-hunt-aim.png`, `artifacts/survival-hunt-landed.png`. No browser errors.

Performance: one instanced draw for every branch and dropped stick (up to 68), plus a rabbits-on-the-ground draw and a stick-in-flight draw that are hidden unless in use. No new lights, shadow passes or shaders (the branch material compiles to the same program as the camp's). Branch spots are worked out once per tree and the instances are rewritten only after you move 3 m. The stress test before and after, in cloud software rendering at the same small viewport: draw calls 28 to 29 before and 29 to 30 after, CPU 3.0 to 3.1 ms before and 3.1 to 3.4 ms after, update phase 0.33 ms before and 0.37 to 0.4 ms after (`artifacts/survival-hunt-before-performance.json`, `artifacts/survival-hunt-after-performance.json`). Real frame times still can't be measured here, so 60 FPS on the development Mac is not confirmed.

# Survival you can feel (overhaul phases 0 and 1)

The first step of the survival overhaul (plan: `survival-overhaul-plan.md` in the project files). The game now tells you what is going on while you play, and your body warns you before the bars do.

- **Look-at label:** a small line of text under the centre of the screen names what you are looking at and what G (Xbox X) does to it: "Gather dead wood · G", "Fill bottles · G", "Register post A · G", "Lift snare · rabbit caught · G", "Throw stick at rabbit · G", or at a lit fire "Campfire · Add wood · G   Cook rabbit · F   Sleep · Z". G now does exactly what the label says, and only to what you are facing. On touch the label is a button: tap it.
- **Result line:** what just happened ("Gathered dead wood · 1 bundle", "Missed. It bolts for cover.", "Dusk is coming…") shows near the bottom for a few seconds. These messages were hidden during play before.
- **Inner voice:** when a need gets worse, one line says what to do next with what you carry, for example "Getting hungry. Eat a ration, or keep it and hunt: rabbits graze at meadow edges, most at dawn and dusk." or "Thirsty. Your bottles are empty. Springs are the blue dots on your map."
- **Body cues:** a stomach growl when hungry, a dry swallow when thirsty, chattering teeth when shivering, the map and compass trembling in your hands when cold (or weak with hunger), and slow blinks when tired. Sounds are synthesised from one shared noise buffer (`body-cues.js`).
- **Condition bars fade:** the four bars stay out of sight while everything is above 60 and fade in once anything drops below it (out again above 65).
- **Hunger matters:** one ration packed by default instead of two, energy runs out in about 20 real minutes instead of 28, rations restore 30 (45 hot), raw rabbit 15, and cooked rabbit still 45 plus 10 warmth.
- **Clean-up:** the unused barrel-and-medkit survival mode (`survival.js`, `survival-threats.js` and their tests) is gone. The look-at and advice rules live in `fieldcraft.js`.

Checks: all node tests pass, with the new tests/fieldcraft.mjs covering facing, label priority and key names, campfire options, the inner-voice advice, body-cue timing and tremor, and the bar fade thresholds. Browser-checked (software rendering): facing a tree shows the label and turning away clears it, G gathers and the result line shows, dropping energy shows the advice and fades the bars in, cold and tiredness give the shivering advice, and on a touch screen tapping the label gathers wood. Screenshots: `artifacts/survival-look-label.png`, `artifacts/survival-hungry-advice.png`, `artifacts/survival-touch-label.png`. No browser errors.

Performance: no meshes, materials, lights or shadow passes were added; the label and advice are worked out at the 10 Hz HUD rate with one reused object, and body cues are timers. The `?benchmark=1&weapon=1` stress test, run before and after at the same small viewport in cloud software rendering, shows the same draw calls (29 to 30) and CPU time (2.5 to 3.5 ms) within run-to-run noise (`artifacts/survival-feedback-before-performance.json`, `artifacts/survival-feedback-after-performance.json`). Software rendering cannot measure real frame times, so 60 FPS on the development Mac is still not confirmed; the baseline there was already below 60 FPS.

# Saved games

A run is saved in the browser's local storage (`save-game.js`, key `sas-trials-save`), so closing the tab or browser does not lose it. It saves every 20 seconds while you play, when you pause, at each checkpoint you register, after sleeping, and when the page is hidden or closed. On the next visit the menu says CONTINUE EXERCISE with the saved time and next post.

The save holds your condition (hydration, energy, warmth, sleep, wet, sickness), the bergen exactly as arranged, water carried, position and facing, stamina, the time of day, a lit fire and its fuel, set snares and when they catch, checkpoints reached, distance and climb, and which trees you have already taken wood from. Wildlife and weather start fresh. Reset exercise deletes the save, and so does withdrawing. Each browser and device keeps its own save; private windows may not keep it at all.

Checks: tests/save-game.mjs round-trips a run through fake storage and covers bad saves and storage that refuses access. Browser-checked: pack a changed layout, walk, pause, reload, see CONTINUE with the saved time, continue, and reset.

# Packing the bergen by hand

The bergen is a 6 × 7 grid (`bergen-grid.js`), and everything you take is a block that has to fit: water bottles 1×2, ration packs 2×1, filter, fire steel and snare wire 1×1, stove 2×2, waterproof 3×2, sleeping bag 2×4. On the packing screen, drag kit from the list into the bergen, or tap it and tap a space. Turn the piece in hand with R, a right click or Turn. Drag a block out (or use −) to unpack it. Keyboard: Enter picks up, arrows move, Enter drops, Delete unpacks.

What you collect has to fit too: a bundle of wood is 1×3 and a rabbit 2×1. With a full bergen you cannot gather more wood, throw for a rabbit or lift a snare that holds one until you make room, by rearranging (the grid is at the top of the KIT sheet, Tab), eating or burning something. A new attempt repacks your last layout.

Checks: all node tests pass, with tests/bergen.mjs covering fitting, turning, moving, auto-placement, room checks, kit counts and repacking. Browser-checked: dragging the waterproof in, tap-and-turn for the sleeping bag, dragging a bottle out to unpack, stepping off, and gathering wood into the bergen on the move. Packing on Xbox is not supported yet.

# Bergen (backpack)

Open your bergen with Tab or I on a keyboard, the right stick click on Xbox, or the BAG button at the bottom right of the screen (it shows the Tab shortcut on a laptop). The world keeps running while it is open; the mouse is freed so you can click, and Tab, I or Close puts it away and takes the mouse back (click the scene if the browser asks).

Every survival action is in it, item by item, and greyed out when it is not possible where you stand:
- Water: drink, or fill at a spring, stream or river.
- Rations: eat one.
- Rabbit: eat cooked, cook at a fire (also boils untreated water with a mess tin), or eat raw and risk it.
- Dead wood: gather beside a big tree, light a fire (fire steel and 2 bundles, not in water), or add wood to a lit fire.
- Snare wire: set a snare, or lift one you are standing beside.
- Throwing stick: throw at a rabbit in front of you.
- Sleep: from 19:30 by a fire or in a sleeping bag.
- At a checkpoint post, registering it appears at the top.

Arrow keys (or W/S) and the D-pad move between actions; Enter, Space or A uses one; B closes it on Xbox. The keys G, F, Z, N, V and B still work as shortcuts. The sheet is ordinary page content rebuilt only when something it shows changes, so it adds no rendering work.

Checks: all node tests pass; tests/inventory.mjs now covers every backpack action, when each is available, and choosing what to eat. Browser-checked on a laptop-sized screen (open with Tab, drink and eat with the keyboard, gather wood and light a fire by clicking, close with Tab) and a phone-sized screen.

# Condition HUD

Four slim bars sit in the bottom-left corner while you play: health, stamina, food and water. On a phone they move above the joystick, or to the top left in landscape.
- Health is your overall condition. It stays full until water, food, warmth or sleep runs low, then falls with the worst of them.
- Stamina is new: about 14 seconds of sprinting from full. Run it flat and you are winded, unable to sprint, until it recovers to a third. It refills faster standing still than walking.
- Food and water are the existing energy and hydration stats.
- A bar under a quarter pulses. The bars update ten times a second, only touch the page when a value changes, and animate with transforms only, so they add no rendering work to the 3D scene.

Checks: all node tests pass, including a new stamina test in tests/movement.mjs (drain, winding, recovery). Browser-checked on desktop and a phone-sized landscape screen.

# Big map and fieldcraft

The map is now 3.2 × 3.2 km (about 4.9 times the old 1.44 km map's area), so legs between posts take real time and a journey usually spans a night. Posts, trails, landmarks and the two river systems were laid out on the old map and scaled up with it (`world-size.js`).

**Day and night.** A running clock (`daycycle.js`): one real second is one game minute, the start is 09:00, sunrise is about 05:00 and sunset about 21:00. Light, fog and sky follow the sun continuously, and the torch is only worth carrying after dark. The settings can hold it at day or night instead.

**Survival loop.** Warmth and sleep are now core stats alongside food and water:
- Warmth drains in the dark, in rain and when soaked from wading, and recovers in sunshine and beside a fire. Too long at zero and you are withdrawn for hypothermia.
- Fatigue counts hours awake. Past 16 hours you slow down; past 26 you are withdrawn for exhaustion.
- G (context action): gather dead wood from big trees, stoke the fire, check a snare, refill water, or throw a stick at a rabbit in front of you.
- F: light a fire (firesteel and 2 bundles of wood), or cook raw meat and boil water at a lit fire.
- Z: sleep from 19:30 until dawn, beside a fire or in a bedroll. A fire that dies in the night wakes you cold.
- N: set a snare. Most catch a rabbit within a few hours; come back for it.
- Rabbits come out most at dawn and dusk. Creep up crouched; running scares them off.
- On a phone, all of these are in the BAG sheet.

**Streaming forest.** The whole layout (trees, rocks, stumps, logs, every collider) is generated once for the whole map, but only drawn near you. `forest-scene.js` builds 160 m chunks within 170 m of the player, spreading each chunk over many frames (at most about 2.5 ms of work per frame) and dropping chunks beyond 260 m. All chunks feed the same pooled instanced batches, so the draw-call count does not grow with the map. The cached sun shadow map is re-baked for the loaded area when the set of chunks changes, rather than covering the whole map once. River tiles are now distance-culled like the ground.

Checks: all node tests pass (tests were updated for streaming, two main rivers and the larger map). Browser checks: loading, walking 240 m with chunks streaming in, teleporting to post A and to a spring, and the camp loop (wood, fire, snare, sleep, catch). Compared with the previous commit in software rendering: the benchmark page finished loading and running in 51 s instead of 62 s; draw calls at the start view fell from 66 to 26 with about the same triangle count; a shadow re-bake takes about 12 to 30 ms of CPU after the first one. Frame times could not be measured in the cloud (software rendering), so 60 FPS on the development Mac is not yet confirmed; a brief hitch when a shadow re-bake happens is possible.

# River network

One river crosses the map from the east edge to the south-west corner, joined by six streams (about 4.8 km of water in all). It is worked out once from the terrain when the game loads, in `hydrology.js`:

- The river finds the cheapest route downhill through the lowest ground, so it winds between the hills instead of running in a line. Flow is then gathered along that drainage, and each stream follows the valley that collects the most water and joins the first water it reaches.
- Meanders are sine-generated bends whose size depends on the slope, and they never climb the valley side.
- The water level never rises downstream and always sits below the lowest ground across the floodplain. Where the land ahead rises, the river cuts a water gap through it instead of floating. The terrain is reshaped around each channel: a bed, a low floodplain, then a smooth blend back to the original hills. The start clearing, every post and every control feature are kept dry and unchanged.
- `river.js` builds one level water ribbon per channel, with its edges hidden under the banks. It reuses the existing ripple shader and terrain-tile culling, with no new lights, shadows, reflections or transparency.
- Rivers and streams are drawn on the chart in blue beneath the tracks; tracks cross them at fords. Trees, grass, flowers and springs are kept off the water.
- Wading slows you, down to a little over half pace in the deepest water. G / Xbox X (or Fill bottles on the phone BAG sheet) refills at the river as well as at springs; the same untreated-water rule applies.

Checks: tests/river.mjs covers downhill flow on every channel, branching, matching junction levels, water over every bed, banks above the water edge, dry posts and start, and bounded water tiles. All tests pass; the forest tree count changed (24,388 to 23,544) because trees no longer grow in the channels. Browser-checked riverbanks, a junction and the chart: artifacts/river-network-bank.png, river-network-junction.png and river-network-chart.png. The `?benchmark=1&weapon=1` stress test could not be measured in the cloud (software rendering, about 3 FPS), so frame times on the development Mac still need checking.

The older river notes further down describe earlier attempts that were removed; `drainage.js` and `river-profile.js` are gone.

# Bergen packing and field condition

Every attempt now starts at a kit list. BEGIN EXERCISE opens **Pack your bergen**: a fixed 6 kg base (bergen, clothing, map, compass, torch) plus water bottles (1.15 kg full, up to 6), ration packs (0.6 kg, up to 6), a water filter, a waterproof jacket and a stove. The total weight sets walking pace: full pace up to 8 kg, then about 3% slower per kilogram, never below 60%. Weight falls as water is drunk and rations eaten. STEP OFF locks the loadout until the exercise is reset.

- Hydration and energy drain with effort (standing, walking, sprinting), climbing and load. Rain raises energy loss by up to 50% unless the jacket is packed. Below 30% either need slows you further; at zero for 60 s you are medically withdrawn and must repack.
- V / Xbox D-pad down: drink 0.5 L. B / Xbox D-pad up: eat a ration (more energy with the stove).
- Springs: small pools in natural hollows, ringed with mossy stones and reeds, with a blue-banded timber stake. They are found once from the terrain (clear of trees, tracks, posts and the start, at least 260 m apart) and marked as blue dots on the chart. G / Xbox X beside one fills every bottle. Without the filter that water is untreated: each drink has a 40% chance of making you unwell, doubling thirst for three minutes. With no bottles you can still drink at the spring.
- No new screen overlays during play. Kit and condition are pencilled along the bottom margin of the held chart (words, not gauges, so the chart texture only updates on changes); a soft dark vignette grows as either need runs low. The pause menu shows the full condition report.
- Phones and tablets get a faint BAG button above Run and Jump (laptops show it in the bottom-right corner). It opens a small paper sheet with water, rations and condition, plus Drink, Eat, Fill at spring (enabled beside a spring) and Register post (shown beside a post). `inventory-view.js`, tests/inventory.mjs.
- `kit.js` holds the rules (pure, node-testable), `springs.js` placement and models, `packing-view.js` the kit list and condition UI. `?navtest=1` adds spring teleport buttons and exposes `window.navtest` for browser checks.

Checks: tests/kit.mjs covers weight and pace, the packing lock, effort/load/climb/rain drain, drinking, eating, the stove, refills, untreated illness, withdrawal, controller pace, spring placement rules and spring culling. All existing tests pass. Browser-verified the packing screen, drinking, eating, refilling at a spring, chart notes and withdrawal. Preview: artifacts/kit-packing.png.

Performance: all springs share two draws (banks/stones/reeds/stakes on the existing landmark material, plus one water material), about 3,200 triangles in total, no lights, shadows or transparency, and both draws are skipped unless a spring is inside fog distance, like the checkpoint posts. Kit logic is a handful of arithmetic per frame with no allocations. The `?benchmark=1&weapon=1` stress test could not be measured in the cloud environment (software rendering at about 3 FPS returned zero valid samples on both the old and new builds), so frame times on the development Mac are still to be confirmed.

# Current prototype: Wilderness navigation

Run `python3 -m http.server 8080` in this folder and open http://localhost:8080/.

The active game is a navigation-only exercise on a 1,440 × 1,440 m rolling forest (5.0625 times the previous 640 m map area). Terrain tiles and nearby instanced scenery are culled to preserve local rendering cost. Enemies, weapons, loot, damage, camp survival and footprint trails are no longer loaded. No stamina or hydration systems. Rivers are currently removed, including water, bank markings, vegetation exclusions and blue chart lines. The original rolling terrain and dirt trails remain. Navigation domain logic is in `navigation.js`; checkpoint rendering, static terrain chart and instrument UI are in `navigation-view.js`.

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


River removed (no-river-1): active game no longer imports or constructs water/drainage, updates flow, tints banks, clears vegetation beside channels, cuts trail crossings or draws blue river lines on the chart. Former banks use the normal ground palette and forest planting. Navigation post clearance now considers terrain obstacles alone. Reduced decorative grass visibility from 42 m to 38 m to bound the cost of filling the former water corridors; existing shared instancing, lighting and terrain remain. Inactive river source is retained for future work.

Navigation, forest/trails, terrain, performance/culling and held-compass checks passed. Browser verified the former valley, restored trail crossings and held chart without river lines; no game/shader errors. Required `?benchmark=1&weapon=1`, Chrome 1680×962 at scale 0.8617: final 60.0 FPS average, 16.67 ms mean, 17.4 ms p95, CPU 0.98 ms, 31 draws / 48,144 triangles, GPU snapshot 6.35 ms. Original river baseline: 59.9 FPS, 16.70 ms mean, 17.5 ms p95, CPU 1.47 ms, 33 draws / 40,428 triangles, GPU 5.00 ms. Restored vegetation increases triangles and GPU time, still below budget; mean/p95 and draw calls improved. The initial unbounded-grass run measured 59.1 FPS / 16.93 ms mean / 17.6 ms p95, 30 draws, GPU 7.86 ms at adaptive scale 0.81. No strict minimum 60 FPS claim: final p95 remains above 16.67 ms. Saved artifacts/no-river-before-performance.json, no-river-initial-performance.json, no-river-performance.json, no-river.jpg and no-river-map.jpg.


Original gun arms for navigation (held-arms-1): navigation now loads the existing Arms_Glock_G48 FBX, discards the weapon mesh, and reuses its skinned Arms_Mesh plus original Idle, Walk and Run clips. A single consolidated vertex-colour material draws both arms. Shoulder placement separates the hands for the map/compass grip and for unarmed running. Equipment follows the animated hand positions; the world-north compass calculation is preserved. The chart is held lower (around 0.82 m beneath the camera at rest), with another 0.08 m walking / 0.16 m sprinting tuck. Looking forward leaves only a bottom-edge strip; looking down reveals the full chart and compass. Stowing equipment leaves the animated arms visible. Pause stops the mixer. One rig, three reused actions and cached vectors/matrices; no per-frame geometry creation, new lights or shadow passes. The play button waits for both arm assets and chart textures.

Held-compass tests verify original 1,608-vertex arm reuse with no weapon meshes, six viewmodel draws (previously seven), original running clip selection, chart position throughout the running cycle, look-down readability, visible stowed running arms, buffer/material reuse, pause and unchanged world-north bearings under look/sway/lean. Movement, look-sway, lean, navigation and performance checks passed. Browser verified held grips, forward cropping, look-down reading and unarmed running; no game/shader errors.

Required `?benchmark=1&weapon=1`, matching Chrome 1200×769 at scale 1: current-condition old/new results 37.3 / 39.0 FPS; 26.84 / 25.61 ms mean; 34.1 / 33.9 ms p95; 31 / 27 draws; 45,252 / 45,467 triangles; CPU 1.71 / 1.99 ms (animation update 0.06 / 0.20 ms), GPU snapshots 5.94 / 5.88 ms. Empty-render cadence 39.8 / 39.1 FPS. Earlier runs varied substantially: original 60 FPS with 60 empty-render FPS, then new arms 45.8 FPS with 46.4 empty-render FPS; these are saved and cannot establish a locked 60 FPS claim. Final stowed sprint stress (`?benchmark=1&weapon=1&armsrun=1&equipment=stowed`) measured 41.0 FPS, 24.41 ms mean / 34.3 ms p95, CPU 1.55 ms, GPU 6.09 ms and 24 draws, empty-render 40.2 FPS. Matching final frame times/draws improve over the old rig, while this development Mac/browser remains below the strict 60 FPS / 16.67 ms target. Results: artifacts/navigation-arms-before-performance.json, navigation-arms-matched-before-performance.json, navigation-arms-initial-performance.json, navigation-arms-performance.json, navigation-arms-run-initial-performance.json and navigation-arms-run-performance.json. Previews: navigation-arms.jpg, navigation-arms-forward.jpg and navigation-arms-running.jpg.

Recorded ambience (recorded-audio-1): uses the user's supplied storm (51.75 s) and forest (117.33 s) recordings as persistent stereo loops, replacing synthetic weather/thunder. Rain intensity fades the storm loop in and lowers forest ambience. The 0.367 s gravel recording plays at stride events with small pitch variation; landings reuse it at a lower pitch. All four samples preload and decode once in one AudioContext, with two persistent loops and at most six simultaneous transient sounds; no per-frame audio buffer allocations or rendering additions. 192 kbps AAC assets total about 4.38 MB rather than about 42 MB of WAV files. Forest volume also controls the distant howl. Pausing/backgrounding fades loops silent and stops transient sounds.

Wolf timing is a minimum quiet period plus an exponential random wait, using active play time. First howl: minimum 8 minutes, average 20 minutes. Later howls: minimum 15 minutes, average 35 minutes, with no maximum interval and no stacking. Pauses and exercise resets do not reset the timer or manufacture an immediate howl. A muted/saturated event is skipped until the next rare opportunity. Functional tests cover decoding/loop reuse, sample footsteps, bounded voices, pause/mute, and irregular quiet periods. Recorded-audio, weather, movement, look-sway, performance, held-compass, lean, navigation and torch checks pass; Chrome decoded all four AAC recordings, verified the forest volume control and paused state, and reported no game errors.

Required browser stress `?benchmark=1&weapon=1`, matched current viewport 1680×962 and adaptive scale 0.8617: previous/new both 60 FPS and 16.67 ms mean; p95 17.5 / 17.4 ms; CPU 1.25 / 1.00 ms; draws 27 / 26; empty-render 60 / 60 FPS. New run explicitly records AudioContext running and all four decoded durations. GPU snapshots 8.70 / 4.89 ms vary and are not sustained performance guarantees. No measured regression; draw variation reflects the moving/culling route, with no new rendered objects. The strict minimum 60 FPS target remains unverified: p95 exceeds 16.67 ms and earlier Mac runs were below 60 FPS. Results saved in artifacts/recorded-audio-before-performance.json and artifacts/recorded-audio-performance.json.

Compass heading HUD (compass-heading-1): reuses the previously hidden circular compass UI, now visible during play. Fixed world north is -Z and east is +X. Both the HUD and existing held dial/needle share a cached CompassHeading that reads the camera's world forward vector projected onto XZ. It ignores pitch/roll, retains the last valid heading when the horizontal projection vanishes, and accumulates the shortest angular difference without resetting at 359/0. The forward marker remains stationary; the card and red north tip rotate together opposite camera heading. N/E/S/W readings are at the top while facing those directions; facing east puts north/red left, south puts them below, west puts them right. HUD bearings use cached degree/direction labels. Typed OM reuses angle/rotation/transform objects, updates at most 30 times per second with compositor interpolation, and avoids per-frame JS string allocation; browsers without Typed OM use a bounded 20 Hz fallback. Cached camera vectors/quaternion and existing meshes/materials; no new lights, shadows, geometry or WebGL draws. Test mode ignores live gamepad input so physical controller movement cannot contaminate cardinal checks.

Functional checks passed: all four cardinal/eight intermediate bearings, three complete rotations each way, shortest 359-to-1 crossing, vertical look retention, world parent rotation, roll independence, scratch-object reuse, camera heading priority over player yaw, fixed bezel marker, six held-equipment draws, existing running/lower-map behaviour, navigation and rendering performance tests. Chrome verified eight HUD bearings and dial transforms, and preserved 315 degrees when looking straight up/down. No game errors. Browser check data: artifacts/compass-heading-browser-checks.json; east-facing preview: artifacts/compass-heading-east.jpg.

Required stress test `?benchmark=1&weapon=1`, Chrome 1680x962: initial baseline 59.2 FPS, mean 16.90 ms, p95 17.6 ms, CPU 7.25 ms, 26 draws, empty-render 58.7 FPS. Initial per-frame HUD update run measured 38.3 FPS, 26.14 ms mean, 34.3 ms p95, CPU 14.54 ms, 27 draws and empty-render 46 FPS. Dial updates were bounded to 30 Hz with smooth compositor interpolation. Final matched old/new comparison at scale 0.8617, both audio contexts running: 60 / 60 FPS, 16.67 / 16.67 ms mean, 17.4 / 17.5 ms p95, 1.16 / 1.25 ms CPU (update 0.10 / 0.13 ms), 27 / 27 draw calls, GPU snapshots 5.55 / 5.95 ms, empty-render 60 / 60 FPS. Small p95/CPU increases are recorded, with the initial large slowdown absent after optimization; browser cadence and host conditions varied between runs. No locked minimum 60 FPS claim: initial baseline was below 60 FPS and final p95 still exceeds the strict 16.67 ms budget. Saved artifacts/compass-heading-before-performance.json, compass-heading-initial-performance.json, compass-heading-matched-before-performance.json and compass-heading-performance.json.

Always-held map and compass (always-held-1): removes the equipment/stowed flags and the separate unarmed shoulder/running pose. During play the original arm rig always holds the chart and compass, including behind the assignment panel; panels freeze its animation rather than hiding or switching it to empty hands. Reset cannot stow equipment. M/K and corresponding controller shortcuts return from the assignment to the held tools instead of toggling them away. Retains original holding Idle/Walk/Run motion and the existing lower map position while running, with look-down reading. Menu/pause hides the rig and stops animation. Hand-position updates now traverse only the arm model hierarchy; equipment receives its world matrices in the existing scene update. No new objects, materials, lights or shadows; the same six equipment/arm meshes are reused.

Checks passed: held-compass (including always-held visibility, holding pose, low running map, geometry/material reuse and pause), compass-heading, performance, navigation, movement, lean and recorded-audio. Browser verified M/K cannot stow tools and opening/closing the assignment keeps them in hand; no game errors. Preview: artifacts/always-held-map-compass.jpg.

Required `?benchmark=1&weapon=1`, Chrome 1680x962: baseline 55.3 FPS, mean 18.07 ms, p95 33.2 ms, CPU 6.45 ms, 26 draws, scale 0.8617, GPU snapshot 6.33 ms, empty-render 58.7 FPS. Initial new run 54.4 FPS, mean 18.39 ms, p95 33.3 ms, CPU 8.11 ms, 26 draws at a different adaptive scale 0.71; saved rather than treated as an equivalent resolution comparison. After removing the redundant equipment hierarchy update, final run at matching scale 0.8617 measured 59.3 FPS, mean 16.87 ms, p95 17.5 ms, CPU 1.58 ms (update 0.18 ms), 27 draws, GPU snapshot 7.36 ms, empty-render 60 FPS. Frame times improved in the final run; average draw variation comes from route/culling while the equipment's six-mesh budget remains unchanged. Host/browser cadence varies, and neither baseline nor final run meets a strict minimum 60 FPS / 16.67 ms budget. Results: artifacts/always-held-before-performance.json, always-held-initial-performance.json and always-held-performance.json.

Reference-style held compass and movement defaults (baseplate-1): field of view now defaults to the slider minimum 65 degrees, stick look speed to its maximum 5, and camera motion to 1.5 (50% stronger than the previous 1). Initial camera and reset defaults use these same values. Removed the bottom-right compass DOM, CSS, cached text/Typed OM objects and its frame update. The physical compass remains always in hand and keeps the existing camera-based world-north dial/needle behaviour.

Held compass now uses a clear rectangular baseplate with etched edge rulers, fixed red travel arrow, black capsule/bezel, white degree/cardinal markings, red orientation lines, red/white needle and a small metallic pivot, matching the supplied baseplate-compass reference. Two static canvas textures are built once. The baseplate replaces the prior body mesh; the pivot is merged into the existing north needle mesh. Body/dial/needles share ordered single-face transparency so the clear plate cannot occlude the dial; no extra meshes, draws, dynamic lights or shadow passes. The arm/map/compass budget remains six meshes. Browser confirmed slider values 65/5/1.5, reset controls, removed HUD, reference appearance, and no game errors. Held-compass checks now use the narrower default FOV and verify clear rectangular baseplate, cardinal headings, low running map, look-down reading, always-held state, reuse and pause. Compass-heading, movement, look-sway, performance and navigation checks also passed.

Required `?benchmark=1&weapon=1`, same Chrome 1680x962 and scale 0.8617: baseline/new both 60 FPS and 16.67 ms mean, p95 both 17.5 ms; CPU 1.34 / 1.10 ms (update 0.14 / 0.10 ms), average draws 27 / 26, triangles 48,047 / 41,061, GPU snapshots 8.51 / 6.25 ms, empty-render 59.8 / 59.6 FPS. The narrowed FOV contributes to reduced scene visibility, so these figures compare the full requested change rather than isolating the compass artwork. No measured frame-time regression. A locked minimum 60 FPS is still unverified: p95 exceeds 16.67 ms and earlier development-Mac baselines were below 60 FPS. Results: artifacts/baseplate-before-performance.json, baseplate-performance.json and baseplate-defaults.json; preview: artifacts/baseplate-compass.jpg.
First checkpoint landmark approach (first-control-1): post A now sits east of the northern rock in a recognisable pair of boulders, a short northwest approach from the valley trail bend in grid D1. The mission log describes the approach and exact control feature. The map retains its usual checkpoint marker and coordinates, with no boulder symbols, landmark labels or detail inset. Other checkpoints retain their previous locations and behaviour. The two rocks reuse the existing instanced boulder batch, materials and colliders. A small local clearing compacts static instance buffers once at creation without changing the seeded forest elsewhere; no added draw calls, lights, shadows or frame-loop allocations.

First-control, navigation, forest, held-compass, compass-heading and performance checks pass, including wrong rock/side rejection, reachable post A and progression/reset. Chrome verified mission log wording, unchanged map style, both boulders, and successful A-to-B registration; no browser errors. Preview: artifacts/first-control-mission-log.jpg.

Required stress test `?benchmark=1&weapon=1`, matched Chrome 1200x769 at scale 1, both audio contexts running: baseline/new 60/60 FPS average, 16.67/16.67 ms mean, 17.3/17.3 ms p95, 26/25 draw calls, CPU 1.59/1.74 ms and GPU snapshots 4.77/4.49 ms. Frame times remain unchanged, with minor CPU variation and no added rendering passes. The strict minimum 60 FPS target is still unverified: p95 exceeds 16.67 ms and earlier development-Mac baselines were below 60 FPS. Initial 1680x962 baseline is retained but is not the matching comparison. Results: artifacts/first-control-before-performance.json, first-control-matched-before-performance.json and first-control-performance.json.

Second checkpoint landmark clue (second-control-1): checkpoint B in H1 now stands on the south side of a large boulder, identified by a long fallen trunk lying to its east. The mission log explains the feature and correct side; the map retains its standard checkpoint marker with no landmark symbols. B remains hidden until A is registered and unlocks C on registration. A and C–H retain their previous placement. The boulder and trunk use existing shared instanced batches/materials and a small clearing compacts buffers once at creation; no new lights, shadow passes, draw calls or per-frame allocations.

First-control, second-control, navigation, forest, held-compass, compass-heading and performance checks passed. New checks cover batch reuse, accessible placement, incorrect feature/sides, ordered unlock, B-to-C progression and reset. Chrome verified the clue after A, both physical features, the unchanged map style, and successful B registration; no browser errors. Previews: artifacts/second-control-landmark.jpg and second-control-mission-log.jpg.

Required stress test `?benchmark=1&weapon=1`, matched Chrome 1680x962 at scale 0.8617, both audio contexts suspended: baseline/new both 60 FPS average, 16.67 ms mean, 17.5 ms p95 and 26 draw calls; CPU 1.39/1.38 ms, triangles 41,075/40,985, GPU snapshots 8.89/9.05 ms, empty-render both 60 FPS. No measured frame-time or draw-call regression. Strict minimum 60 FPS remains unverified because p95 exceeds 16.67 ms and earlier development-Mac baselines were below 60 FPS. Results: artifacts/second-control-before-performance.json and second-control-performance.json.

Unique checkpoint B discovery (wreck-control-1): replaced its ordinary boulder/log pair with a single rusty burned-out car. Rust/orange panels, scorched seats, empty window frames, torn roof remnants, buckled bonnet and four wheels distinguish it from repeated forest props. The post and B coordinates stay unchanged behind the rear bumper at the south end. Mission log describes the wreck; no car symbol or landmark annotation appears on the map. Other checkpoints remain unchanged.

The car builds once as one merged vertex-colour geometry and one rough shared material, rendered as a single static instance through existing fog/frustum culling. It follows the local terrain slope, adds three bounded collision volumes, and uses no lights, shadow passes, textures or frame-loop geometry allocations. Ordinary boulder/log additions for B were removed. Functional checks passed for first-control, second-control, navigation, forest, held-compass, compass-heading and performance; wreck-specific checks cover geometry budget, single draw, uniqueness, finite buffers, nearby/distant culling, collision, wrong-side rejection, accessible post, ordered unlock and reset. Chrome verified the unique appearance, updated clue and A-to-B-to-C progression with no browser errors. Previews: artifacts/wreck-landmark.jpg and wreck-mission-log.jpg.

Required `?benchmark=1&weapon=1`, matched Chrome 1680x962 at scale 0.8617, both audio contexts suspended: baseline/new 60/60 FPS average, 16.66/16.67 ms mean, 17.5/17.5 ms p95, 26/26 draw calls, CPU 1.39/1.35 ms, GPU snapshots 6.51/6.07 ms. This standard route is distant from B. Additional `&landmark=B` benchmark holds position and turns the camera with B continuously in view; identical test setup applied to the old landmark checkout. Both audio contexts running: baseline/new 60/60 FPS, 16.67/16.66 ms mean, 18.2/18.2 ms p95, 30/30 draw calls, CPU 0.70/0.64 ms, triangles 42,056/42,027, GPU snapshots 7.71/5.24 ms. No meaningful frame-time or draw-call regression. Minimum locked 60 FPS remains unverified: p95 exceeds 16.67 ms and earlier development-Mac baselines were below 60 FPS. Saved artifacts/wreck-before-performance.json, wreck-performance.json, wreck-local-before-performance.json and wreck-local-performance.json.

Complete landmark circuit (all-controls-1): C–H now have unique discoveries and mission-log navigation tips: C raised rusty water tank, east ladder; D collapsed timber cabin, south doorway; E stone well, east hanging bucket; F crashed aircraft, south tail; G overturned blue wooden boat, west end; H broken radio mast, south blue cabinet. Each log names the feature, correct post side, approach direction or useful trail reference, and letter confirmation. Existing post positions and the ordered circuit remain intact. The map retains standard checkpoint markers without landmark symbols or labels.

Six static merged meshes total 3,412 triangles, each below 1,500. Together with B's wreck they reuse one vertex-colour material. Existing fog/frustum instance culling limits the new landmark rendering to one nearby draw; no new lights, shadow passes, textures, dynamic effects or per-frame construction. Small local clearings are compacted once, preserving the rest of the seeded world. Meaningful checks passed for full-circuit progression/reveal/completion/reset, safe post clearance, wrong-side rejection, bounded geometry, shared material and distant culling. First-control, second-control, navigation, forest, held-compass, compass-heading and performance suites passed. Chrome inspected all six landmarks, verified each mission entry and completed all eight registrations without errors. Saved artifacts/all-controls-browser-checks.json, control-C.jpg through control-H.jpg, all-controls-preview.jpg and all-controls-mission-log.jpg.

Required `?benchmark=1&weapon=1`, matched Chrome 1680x962, scale 0.8617, suspended audio: baseline/new both 60 FPS average and 16.67 ms mean; p95 18.2/17.5 ms; CPU 1.19/1.31 ms; average draws 25/26; triangles 40,212/41,137; GPU snapshots 9.09/6.73 ms. The normal route is far from C–H and their meshes are culled; draw/triangle variation reflects route timing and existing scene culling, rather than six extra active meshes. Mean/p95 do not regress. Saved artifacts/all-controls-before-performance.json and all-controls-performance.json.

Corrected the optional landmark benchmark initialization so the selected starting position is applied after reset. Earlier wreck-local benchmark artifacts measured the start area, not the wreck, and must not be used as evidence of visible-wreck cost; their standard moving-route measurements remain valid. Verified corrected `&landmark=D` run with the cabin visibly on screen: 59.8 FPS, 16.73 ms mean, 17.5 ms p95, CPU 0.77 ms, GPU snapshot 8.08 ms, 26 draws, 39,056 triangles, empty-render 60 FPS. Saved artifacts/all-controls-local-performance.json. There is no matched prior cabin landmark because it did not exist. The strict minimum 60 FPS/16.67 ms target remains unverified, including this slightly below-60 local run and earlier development-Mac baselines.


Tree and rock sunlight pass (cached-shadows-1): enabled the existing sun's shadow map, fitted to all nested terrain tiles and complete tree/rock batches across the 1,440 m world. Trees, branches, roots, stumps, logs, boulders and pebbles cast and receive; floor and vegetation receive. Full caster instances are restored before a single startup depth bake, then ordinary camera/fog culling resumes. The 4096 map is reused while moving or changing daylight/night settings; night disables sun shadow sampling. No additional lights or recurring shadow passes. Small foliage sway retains the baked silhouette. One-time bake/compile CPU time was 2,444 ms in the final run, with a 1x1 temporary colour target. Four neighbouring depth comparisons smooth edges at lower cost than the default soft filter. Small depth/normal bias keeps rock and tree contact close to their bases.

Whole-world coverage, original light reuse, complete offscreen casters, target restoration, four-tap filter, cached updates and normal culling tests pass. Shadow, performance, forest, control-landmarks, weather and torch checks passed. Chrome inspected rock contact/tree shadows and nighttime torch rendering; daylight/night settings switched without browser errors. Preview: artifacts/tree-rock-shadows.jpg.

Required ?benchmark=1&weapon=1, Chrome 1680x962, scale 0.8617. Initial development-Mac baseline was below 60 FPS: 58.8 average, 17.02 ms mean, 17.6 ms p95, CPU 7.16 ms, 26 draws, GPU snapshot 5.89 ms. Default soft filtering initially regressed to 57.5 FPS / 17.40 ms mean and GPU 6.93 ms, prompting the four-tap optimization. A fresh matched baseline and optimized run, both audio running, measured 60 / 60 FPS average, 16.67 / 16.67 ms mean, 17.5 / 17.5 ms p95, 26 / 26 draws, CPU 1.39 / 1.32 ms and GPU snapshots 6.63 / 6.33 ms. No measured frame-time or draw-call regression in this matched pair. Host load differed from the early runs; GPU snapshots are samples, not a guarantee. The strict minimum 60 FPS target is still unverified: p95 exceeds 16.67 ms and earlier baselines remain below 60. Saved tree-shadows-before-performance.json, tree-shadows-initial-performance.json, tree-shadows-matched-before-performance.json and tree-shadows-after-performance.json in artifacts/.


Sparse woodland life (forest-life-1): five reusable butterfly slots and seven falling-leaf slots add quiet encounters around the player. Amber, cream and muted blue butterflies flap and wander above the ground; leaves turn and drift with weather gusts. Encounters stay anchored in world space, fade at birth/end and respawn after irregular gaps. Butterflies fade away with rain; all details disappear at night and freeze on pause/assignment. Existing terrain sampling places new encounters above local slopes. No map markers, sounds, lights or shadow passes are added.

Wing normals follow the flap for correct sun/ambient lighting. One shared fogged Lambert material and one fixed geometry hold 132 vertices / 44 triangles. Position/normal/alpha buffers and twelve records are reused; no per-frame object construction. Double-sided transparent geometry forces one pass, bounding its visible cost to one draw. Hidden details skip geometry animation; the pool never expands. Functional tests cover long-run finite buffers, world anchoring, pause, heavy rain/night suppression and single-pass rendering. Weather, cached-shadows and performance suites also pass. Chrome renders wing motion and leaf drift without errors. Preview: artifacts/forest-life-preview.jpg.

Required ?benchmark=1&weapon=1. Final matched Chrome 1680x906, scale 0.8879, both audio contexts running: baseline/final 60/60 FPS average, 16.66/16.67 ms mean, 17.4/17.5 ms p95, CPU 1.05/1.26 ms, average draws 26/27, GPU snapshots 8.86/5.98 ms. The added mesh costs one draw and 44 triangles; total scene triangles vary with route/culling timing. Mean/p95 differences are 0.01/0.1 ms; CPU increased 0.21 ms, including culling variation. GPU snapshots vary and do not demonstrate a speedup. The initial transparent two-pass version averaged 28 draws and CPU 1.92 ms; single-pass rendering and skipping hidden animation reduced that cost. An earlier baseline at 1680x962 is retained for context, but a browser resize prompted a fresh size/scale-matched baseline. The strict 16.67 ms minimum target remains unverified: p95 exceeds budget and the development Mac has earlier below-60 baselines. Saved forest-life-before-performance.json, forest-life-matched-before-performance.json, forest-life-initial-performance.json and forest-life-after-performance.json in artifacts/.

Irregular navigation course (irregular-route-1): moved B–H and their unique landmarks from the square perimeter circuit into scattered interior/outer forest sites. A remains the initial trail-bend exercise. Subsequent legs now change bearing substantially: southeast, south-southwest, west-northwest, southeast, northwest, east-northeast and southwest. Seven diagonal legs span approximately 588–1,275 m; total straight-line course length including the start is 6,513 m. Several controls lie inside the forest, with varied distances to trails, so repeated cardinal travel no longer solves the circuit. This is a fixed, deliberately irregular layout; reset retains its coordinates. Mission-log grids and trail/compass approach advice match the relocated sites. Unique-feature descriptions and exact post sides are retained, with no landmark symbols added to the map.

Landmark mesh placement, forest clearings and collision volumes use the same updated site data. The wreck clearing now derives from its car position. Versioned imports update all scene builders, navigation and chart dependencies together on GitHub Pages. Reuses the same meshes/materials, eight posts, static clearings and cached sunlight; adds no geometry, frame-loop work, lights or shadow passes. Course tests reject axis-aligned legs and perimeter-only distributions, require varied bearing sectors and verify every clue grid. Navigation, first/second control, full landmark circuit, forest, performance and cached-shadow checks pass. Chrome registered all eight relocated posts in order and showed accurate newly revealed mission entries with no errors. Saved irregular-route-layout-checks.json, irregular-route-browser-checks.json, irregular-route-mission-log.jpg and irregular-route-wreck-preview.jpg under artifacts/.

Required ?benchmark=1&weapon=1, Chrome 1680x962. Initial baseline/new: 60/57.7 FPS average, 16.67/17.34 ms mean, p95 17.5/17.6 ms, CPU 2.81/8.45 ms and 27/27 draws; the new run's broad CPU slowdown did not correspond to increased geometry or GPU time (6.01/5.70 ms snapshots). Repeated consecutive baseline/new, both audio running at scale 0.8617: 60/60 FPS average, 16.67/16.66 ms mean, p95 17.5/17.5 ms, CPU 1.21/1.27 ms, average draws 27/26, GPU snapshots 9.59/6.14 ms. Draw/triangle variation reflects existing route timing/culling. The repeat shows no measurable frame-time regression; the initial below-60 result remains saved and is not discarded. Host load/GPU snapshots vary, and p95 exceeds 16.67 ms, so locked/minimum 60 FPS remains unverified on this development Mac. Saved irregular-route-before-performance.json, irregular-route-after-performance.json, irregular-route-repeat-before-performance.json and irregular-route-repeat-after-performance.json in artifacts/.

Woodland polish (woodland-polish-1): added small irregular groups of seven cream, muted-violet and yellow wildflowers, with individual stems and paired leaves. A separate deterministic placement stream supplies 605 candidate patches across the forest and intermittently beside trails, preserving existing tree positions and the navigation course. Initial walking areas include a few groups; checkpoint clearings remove patches locally. Flower roots sit into the terrain, reuse the foliage detail texture, existing wind uniforms, Lambert lighting and cached sunlight, and are decorative/non-colliding. One shared 105-triangle patch geometry, vertex-colour material and instanced batch are culled beyond 28 m. No new lights, textures, shadow casters or recurring shadow passes.

Conifer families gain six small needle fans attached within each existing crown's solid core. Broadleaf crowns gain sixteen pointed leaf sprays attached to the shared rounded core. Shared geometry is built once and stays in the existing tree batches/materials, preserving wind and sunlight behavior. Optimization reduces conifer core height segments from three to two, concentrating detail on the outer edge; explicit leaf back faces keep solid canopy cores front-face culled. A two-sided solid-canopy trial increased rasterization work and was replaced. Final broadleaf geometry is 144 triangles, each flower patch 105 triangles; geometry stays bounded and no per-frame allocation/construction is introduced. Forest mesh batches increase from 28 to 29.

Woodland-polish, forest, full landmark-circuit, performance, weather and cached-shadow checks passed. They cover finite geometry/normals, deterministic placement, bounded geometry, terrain alignment, post clearing, decorative flags, shadow/wind reuse, near/distant flower culling and unchanged accessible navigation. Chrome inspected flower groups, canopy details and wind rendering with no errors. Saved woodland-flowers-preview.jpg, woodland-trees-preview.jpg, woodland-leaves-preview.jpg and woodland-polish-browser-checks.json in artifacts/.

Required ?benchmark=1&weapon=1, Chrome 1680x962, scale 0.8617. Initial baseline (suspended audio): 60 FPS average, 16.67 ms mean, 17.5 ms p95, CPU 1.43 ms, 27 draws, 41,227 triangles and GPU snapshot 6.15 ms. Initial additions held mean/p95; the canopy refinement trial reached 50,757 triangles. The two-sided-core variant subsequently measured 59.2 FPS, 16.90 ms mean, 18.1 ms p95, prompting the front-face/core simplification above. Final optimized run (audio running): 60 FPS, 16.67 ms mean, 17.9 ms p95, CPU 1.30 ms, 27 draws, 42,259 triangles, GPU snapshot 6.15 ms. This removes approximately 8,500 scene triangles compared with the refinement trial while retaining the added leaf/needle edges and flower groups.

Fresh baseline at the same viewport/scale with audio running: 60 FPS, 16.67 ms mean, 18.3 ms p95, CPU 1.25 ms, 27 draws, 40,757 triangles, GPU snapshot 2.00 ms. Frame mean is unchanged and p95 does not regress against this fresh baseline. Total draw counts reflect existing route/culling timing; the nearby flower batch adds at most one draw. GPU snapshots varied substantially across runs and cannot establish a speedup or a fixed GPU cost. Minimum/locked 60 FPS remains unverified: p95 exceeds 16.67 ms, the intermediate run was below 60, and earlier development-Mac baselines also fell below 60. All raw results are preserved as woodland-polish-before-performance.json, woodland-polish-initial-performance.json, woodland-polish-refinement-performance.json, woodland-polish-two-sided-performance.json, woodland-polish-after-performance.json and woodland-polish-repeat-before-performance.json in artifacts/.

### Gravel trail surface — 11 October 2026

The path keeps its existing tan palette and terrain-aligned shape. A cached 512-square repeating gravel tile replaces the old ground-noise sample; packed irregular stones have subtle precomputed relief, with mipmaps for distant detail. Removing per-triangle colour variation and interpolating the indexed terrain's smooth normals across path subdivisions removes the angular shading. The seeded random sequence is preserved, so forest and landmark placement stays unchanged. No new geometry, draw batches, lights, or shadow passes; one texture lookup per trail fragment.

Functional checks passed: gravel texture caching/filtering, shared normal continuity, preserved forest layout, terrain-aligned trail coverage, forest batching/collision, cached tree/rock shadows, and weather. Browser preview verified at the trail fork; no console errors. Preview: artifacts/gravel-path-preview.jpg.

Required ?benchmark=1&weapon=1, Chrome 1680x962, scale 0.8617. Matching suspended-audio original baseline/final: 60/60 FPS average, 16.67/16.67 ms mean, 17.5/17.5 ms p95, 28/28 draw calls, CPU 1.95/2.03 ms. Geometry count is unchanged; visible triangle counts vary with route/culling timing (42,814/43,287). GPU snapshots 7.19/10.12 ms are individual samples, not averages. First new run with running audio measured 59.7 FPS, 16.75 ms mean and 17.5 ms p95; additional running-audio baseline measured 60 FPS, 16.67 ms mean and 18.3 ms p95. All runs are retained. Matching final results show no mean/p95 or draw-call regression. Locked/minimum 60 FPS remains unverified: p95 exceeds 16.67 ms and the development Mac has existing below-60 baseline runs. Saved gravel-before-performance.json, gravel-after-performance.json, gravel-matched-before-performance.json and gravel-matched-after-performance.json in artifacts/ (the final audio state matches the original baseline).


## Stylized nature tree groves

Selected Quaternius CC0 MegaKit trees (Pine_5, Pine_4, CommonTree_4) replace the visible procedural trees. Broad spatial fields establish pine and broadleaf stands, openings and young regeneration trees; terrain-grounded placements, restrained green/brown materials and small shade/size variation keep a consistent woodland style. Ground and dirt-path materials and geometry are unchanged, verified by an exact position-array comparison. No stone paths or kit ground cover are imported. Landmark clearings and collision remain active. Asset licence and preparation details are in assets/nature/README.md.

The six shared tree batches use Lambert lighting, shared painted textures, source material sidedness, existing weather sway, existing torch illumination, and fog/frustum culling. Fine bark geometry is reduced once at load time: 488/2160/3280 to 466/1072/1397 triangles. Foliage geometry is preserved. Tiny isolated bark-tip faces are removed. Hidden inexpensive procedural silhouettes supply the existing single cached sun shadow bake; they do not appear in the colour pass or visibility index. Shadows approximate the imported crowns. No new light or shadow pass. Asset load failure falls back to the previous procedural forest.

Validation: forest, navigation, performance/culling, gravel, weather, first/second/all control landmarks, torch and cached/whole-world shadow checks pass. The new nature-tree check additionally verifies unchanged floor/path geometry, grove coherence, finite colliders, bounded detailed instances, complete asset dependencies, silhouette bounds and no extra disconnected bark components. Browser checks show no game shader errors in the final build; previews are artifacts/nature-trees-trail.png and nature-trees-pine-grove.png.

Required ?benchmark=1&weapon=1, Chrome 1680x906, scale 0.887916, suspended audio. Initial original forest: 59.6 FPS average, 16.78 ms mean, 17.6 ms p95, CPU 2.13 ms, 28 draws / 44,284 triangles. Verified-size original repeat: 57.6 FPS, 17.37 ms mean, 17.5 ms p95, CPU 3.08 ms, 28 draws / 43,612 triangles, GPU snapshot 6.60 ms, empty-render 60 FPS. Final new forest: 60 FPS average, 16.67 ms mean, 17.6 ms p95, CPU 5.44 ms, 22 draws / 144,899 triangles, GPU snapshot 10.16 ms, empty-render 58.9 FPS. Frame mean improves against these runs; p95 matches the initial original and is 0.1 ms above the verified-size repeat. Draw calls decrease, while visible geometry, CPU and sampled GPU costs increase. These are not evidence of a locked 60 FPS or an isolated rendering speedup.

All intermediate runs are retained. A rejected initial run had a foliage shader compilation error; later runs varied from roughly 38.6 to 60 FPS, with different adaptive scales and some viewport changes. An old test tab left by an interrupted run was closed before the final measurement; its contribution is not quantified. The strict minimum 60 FPS / 16.67 ms criterion remains unmet: final p95 exceeds budget and the development Mac has slower baseline and new-scene runs. Results are saved as artifacts/nature-trees-*-performance.json.

### Reference-inspired grass

Grass uses a shared nine-blade opaque clump with broader pointed leaves, dark roots and lighter tips. Low-frequency fields group clumps into meadow patches and irregular trail margins; the floor material and dirt trail remain unchanged. Nearby instance culling and existing shared weather sway remain in use, with no new lights or shadow passes. The grass gradient avoids an additional texture lookup. The full-world grass population is 219,523 clumps, with fewer than 1,600 submitted at the tested spawn view.

Checks: `tests/grass.mjs`, `performance.mjs`, `nature-trees.mjs`, `gravel.mjs`, `weather.mjs`, `forest.mjs`, and `cached-shadows.mjs` passed; browser showed no shader errors. Preview: `artifacts/grass-trail.png`.

The `?benchmark=1&weapon=1` results are saved as `artifacts/grass-*-performance.json`. At 674×843 and render scale 1, the original grass measured 39.6 FPS / 25.26 ms mean / 33.9 ms p95 / 22 draw calls; a baseline repeat measured 38.1 FPS / 26.26 ms / 34 ms / 20 calls. Both empty-render probes remained around 39 FPS, indicating browser cadence limitations. The refined grass measured 59.3 FPS / 16.87 ms mean / 17.4 ms p95 / 21 calls, with a 59.6 FPS empty-render probe. GPU snapshots were 4.65–6.15 ms before and 7.03 ms after, so the differing cadence and instantaneous snapshots do not establish an isolated rendering speedup. Broad blades were shortened and narrowed after the first preview to reduce coverage cost. The strict 16.67 ms frame budget remains unmet; a locked minimum 60 FPS is not claimed.

The subsequent small-blade revision supersedes that initial grass appearance: each tuft now spreads 36 fine blades over a low footprint (unscaled height 0.16–0.256 m; width 0.036–0.06 m). An additional seeded placement pass fills patches, while a 30 m grass visibility range bounds the added geometry. Grass centres stay at least 1.5 m beyond the trail-clearance boundary. Later vegetation does not consume the additional fill pass's random state. The revised tests check short blade height, fewer than 500,000 world tufts, clear trail centres and fewer than 2,400 nearby instances. Grass, culling/performance, and gravel checks passed; no browser shader errors.

`artifacts/grass-fine-performance.json` records the revised stress test at the same 674×843 viewport and scale 1: 39.1 FPS, mean 25.56 ms, p95 33.9 ms, 20 draw calls, 93,599 triangles and a 5.39 ms GPU snapshot (previous broader-grass snapshot 7.03 ms, 21 calls). The empty-render probe was 37.2 FPS, so browser cadence again limits comparison with the previous 59.3 FPS run. The 60 FPS acceptance target is still unmet. Revised preview: `artifacts/grass-fine-trail.png`.

The latest grass rebuild uses the entirely local `meadow-grass.js` generator, with no asset-pack grass or downloaded grass textures. Each shared patch has 72 independently placed, tapered blades with a mid-height bend, three opaque triangles per blade and varied root/tip vertex colours. Patches follow terrain normals and overlap spatially, rather than forming radial tufts. Existing placement fields, ground material and dirt paths are retained. The grass rendering radius is limited to 26 m to offset the denser blade geometry; no additional lighting or shadows were introduced.

Grass, performance/culling, and gravel checks passed, and the browser reported no shader errors. `artifacts/grass-meadow-performance.json` saves the required stress test: at 674×843 / render scale 1, 44.5 FPS, 22.48 ms mean, 33.9 ms p95, 21 calls, 110,314 triangles, 5.46 ms GPU snapshot. Previous fine grass measured 39.1 FPS, 25.56 ms mean, 33.9 ms p95, 20 calls, 93,599 triangles and 5.39 ms GPU. CPU average decreased from 2.26 to 1.91 ms; geometry increased. Empty-render cadence varied (37.2 versus 34.4 FPS), so these results do not prove a speedup or minimum 60 FPS. The required 16.67 ms budget remains unmet. Latest visual: `artifacts/grass-meadow-trail.png`.

### Phone controls

Touch devices automatically receive a movement joystick, drag-to-look, Jump, hold-to-Run and Pause buttons. Existing equipment and torch buttons remain available. Start/resume does not require pointer lock. Multiple fingers can move, look and use actions together; cancellation, pause, focus loss and equipment opening clear held inputs. Touch state and the movement vector are reused, with no new scene objects or rendering passes. `?touch=1` enables the layout for desktop verification.

`tests/touch-controls.mjs` passed bounded joystick/dead-zone checks, simultaneous movement/look/run/jump, cancellation and paused-input clearing. Navigation checks passed. Browser start, assignment close and pause/resume were verified without pointer lock; no console errors. Phone screenshot: `artifacts/phone-controls.png`. A real phone hardware test has not been performed.

The required stress test is saved in `artifacts/phone-controls-performance.json`: reported viewport 674×843, scale 1, 33.9 FPS, 29.47 ms mean, 34.1 ms p95, 20 calls and 111,283 triangles. Previous meadow run was 44.5 FPS / 22.48 ms / 33.9 ms / 21 calls / 110,314 triangles. Empty-render cadence was 35.1 FPS versus 34.4 before, and GPU snapshots varied from 5.46 to 6.86 ms. These variable-cadence desktop runs do not establish phone performance or isolate an overlay regression. The 60 FPS requirement remains unmet.

### Grass visibility

Grass now continues to the 90 m daytime fog limit. Detailed nearby blades and a simpler distant carpet overlap over 22–32 m, with complementary opaque screen-door fading; distant blades fade out over 85–92 m before culling. The distant batch uses 24 triangles per patch and half the placement records, compared with 216 triangles for nearby patches. This avoids the former abrupt 26 m boundary while bounding distant geometry. Fog-distance culling still follows weather visibility. Ground and path materials are unchanged.

Grass and culling/performance tests passed, with no browser shader errors. `artifacts/grass-visibility-initial-performance.json` records the initial full distant population (41.6 FPS / 24.06 ms mean / 49.8 ms p95 / 7.2 ms CPU / 22 calls). After halving distant records, `artifacts/grass-visibility-performance.json` records 50.7 FPS / 19.74 ms mean / 33.7 ms p95 / 8.3 ms CPU / 22 calls / 134,821 triangles, at reported viewport 674×843, scale .95 and GPU snapshot 6.01 ms. The previous phone-overlay run measured 33.9 FPS / 29.47 ms / 34.1 ms p95 / 2.54 ms CPU / 20 calls / 111,283 triangles, at scale 1. The larger visibility radius adds geometry and culling work; CPU costs remain higher despite reducing distant records. Differing cadence and adaptive scales prevent an isolated speedup claim. The strict 16.67 ms requirement remains unmet. Preview: `artifacts/grass-visibility.png`.

### Stone route and kit details

The user's latest request replaces the dirt/gravel overlay with the specific `RockPath_Round_Wide` asset along the existing route network. The forest floor is retained. Thin terrain-aligned stone tiles keep the existing movement surface, with no new collision steps or navigation rerouting. Three imported rock shapes replace the procedural boulders visually; the pack labels all three as medium, so the third shape is scaled larger. Existing boulder placements, control landmarks, collider positions and low-cost cached shadow silhouettes remain in use.

All 31 small detail variants are bundled and placed in coherent habitats: mushrooms near trunks, pebbles and petals on the ground, flowers/clover at sunnier margins, and plants, bushes and ferns within groves. The old procedural shrub/fern/flower/pebble batches are replaced. These instanced details use shared textures, bounded visibility of 35–55 m, no new lights and no dynamic shadow passes. Custom grass remains. Source geometry/diffuse textures and CC0 license are in `assets/nature-details`; no external fetch is needed at runtime.

`tests/nature-details.mjs` passed complete dependencies, all small-detail families, stone-path replacement, three rock batches, finite matrices/colliders, proxy hiding and nearby culling. Navigation, grass, cached shadows, performance/culling and touch-control checks passed. The browser showed no shader errors. Preview: `artifacts/nature-details-trail.png`.

`artifacts/nature-details-performance.json` records the required stress test: 36.7 FPS, 27.25 ms mean, 34.1 ms p95, 3.42 ms CPU, 25 calls, 160,418 triangles, scale 1 and 6.12 ms GPU snapshot at 674×843. Previous extended-grass run: 50.7 FPS, 19.74 ms mean, 33.7 ms p95, 8.3 ms CPU, 22 calls, 134,821 triangles, scale .95 and 6.01 ms GPU snapshot. Empty-render cadence fell from 39.4 to 31 FPS; differing cadence and scales limit attribution. Geometry and draw calls increased; replacing old detail batches, sharing materials/textures and bounding small details controls the additional work. The strict 16.67 ms target remains unmet; no locked 60 FPS claim is made.

### Continuous stone sections

Stone sections now overlap by distance along each route, including bends, and explicitly cover route endpoints. A shared static float height texture reproduces the existing triangulated terrain in the stone vertex shader, so individual stones follow slopes rather than disappearing beneath the ground. The original stone geometry supplies visible top and side faces; 853 of 3,500 hidden underside triangles per section are removed to offset the additional overlapping sections. Habitat detail placement retains its previous random seed. No additional draw batches, lights or shadow passes were added.

`tests/stone-path.mjs` passed endpoint coverage and overlapping spacing for every route, finite shared height data, terrain draping and hidden-face trimming. Detail dependencies/placement, navigation and culling/performance checks also passed; browser showed no shader errors. `artifacts/stone-path-continuous-bend.png` shows a continuous section on a sloping bend.

The required stress test is saved in `artifacts/stone-path-continuity-initial-performance.json` and `artifacts/stone-path-continuity-performance.json`. Initial continuous route: 34.1 FPS / 29.3 ms mean / 34.1 ms p95 / 3.73 ms CPU / 25 calls / 203,404 triangles / 7.27 ms GPU. After hidden-face trimming: 29.6 FPS / 33.78 ms / 49.3 ms p95 / 4.24 ms CPU / 26 calls / 208,061 triangles / 6.34 ms GPU. Both reported 674×843 at scale 1. Empty-render cadence also fell (33.3 to 28.9 FPS), and final triangle/call snapshots cover different visible instances, so results do not establish an isolated overall speedup. Before continuity, the detail run measured 36.7 FPS / 27.25 ms / 34.1 ms p95 / 25 calls / 160,418 triangles / 6.12 ms GPU. Continuous coverage adds geometry; removing hidden faces reduces source triangles by 24%. The strict 60 FPS target remains unmet.

### Clear gameplay screen

Normal gameplay now hides the equipment toolbar, torch button, prompts/notices, modal paper panels and other HUD overlays. First-person equipment remains part of the world. Touch hit areas remain functional but invisible. Start/pause settings remain outside active play. Modal toggles no longer block movement, and completion does not leave the player frozen behind a hidden panel. Keyboard/controller interaction and checkpoint progression are retained.

Navigation and touch-input checks passed. Browser verified starting/resuming into an overlay-free world; screenshot: `artifacts/game-no-ui.png`. No browser errors. The required diagnostic stress test is saved in `artifacts/game-no-ui-performance.json`: 16.4 FPS, 60.81 ms mean, 83 ms p95, 4.21 ms CPU, 27 calls, 192,092 triangles, scale .8, GPU snapshot 6.21 ms, reported viewport 674×843. The empty-render probe also fell to 18.5 FPS, versus 28.9 in the previous continuous-path run, indicating substantial environment/cadence variability. No scene geometry, lights or shadow passes were added by the overlay change. These readings do not establish an isolated overlay regression; the 60 FPS budget remains unmet.

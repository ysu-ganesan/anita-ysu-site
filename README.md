# YSU site

A third ANITA page. Since 25 Sep it presents ANITA the company (one brain, at work everywhere) with the companion as one part; see "The work" below. It combines the other two pages in `anita-site`:

- **ANITA site** (the folder root) gave the story and copy: the claim, then the proof moments (Maya, Mondays, Mum's pottery class, dubbed not subtitles; since 25 Sep this page keeps two of them, Mondays and Mum's pottery class, so the memory scene is about half as long: 420vh, was 760vh), the "tap to forget" node, the robot line and the early-access door.
- **Sprite demo** (`sprite-kit/`, J's kit) gave her: the 2D sprite sheets (idle, talk, walk), her voice lines, and the colour palette (black, `#eaf6f8` ink, `#58e6ff` cyan, Orbitron + Sora).

Static. No build step, no framework, no libraries, no tracking.

## Run it

```
python serve.py 8791
```

Open http://127.0.0.1:8791/. It needs internet only for the Google Fonts.

## Where each reference went

| Reference | Where it went on this page | File |
|---|---|---|
| ausdata.ai (cursor) | The glowing cursor that trails behind the mouse, throws sparks, makes rings on click, and names what a button does | `cursor.js` |
| ausdata.ai (sphere) | Her memory as a network sphere behind the whole page. It spins, speeds up with mouse movement, can be dragged, and shows named memories | `sphere.js` |
| palmo.co.in (the travelling can) | Her memory is now the ANITA site's 3D memory graph ("Her map of you", J's release `anita-memory-graph-v1`). It sits on a fixed layer and glides to a new spot, size and turn in each section, spinning faster while it travels. It fills in as moments are kept, and a forgotten memory leaves it. As the walk arrives it dives into ANITA HQ's brain core and settles there, round the orb, for the whole walk: the scroll flies it in (and back out if you scroll up), then a copy of it in the 3D city takes over, turned exactly as the travelling one (`buildGraph` in `graph.js`, used by both). Until three.js loads (or without WebGL), the canvas sphere stands in | `graph.js`, `main.js` → `places` / `intoCore`, `city.js` |
| lobod.rocks | The hero, in two beats. First: words on the left, her on the right in front of the sphere, floating glass memory cards; her eyes follow the cursor. Second, as you scroll: "Talk to her like a person", a live call that plays out beside her while she talks (you cut her off mid-sentence) | `index.html`, `main.js` |
| techredux.co | Headlines slide up line by line from behind a mask. The first one waits for the entry screen ("Meet her") | `main.js` → `splitLines` |
| unitedcarriers.com | "As robots rise, ANITA rises with them." (big, since 25 Sep; it was "She will not stay on your phone"): the **Sprite demo's world** (the Tron floor streaming with the scroll, J's Blender city, the towers and the monorail), with **ANITA HQ** in the centre. HQ is the office from `anita-office/agent-hq/office3d.html` as a building: glass department rooms, the ANITA sign, and the office's brain core. She starts at its door and walks straight toward you at eye level while HQ, the floor and the city fall back behind her. Without WebGL, a drawn road stands in | `city.js`, `main.js` → `drawRoad` (fallback) |
| why.zero.university | The early-access section is a simple invitation. Its button (and the bottom pill, and every Early access button) slides up their join-the-waitlist panel: underline-only fields, a custom dropdown, and a pill that goes spinner → "Joined". Since 25 Sep it is in the site's own look, because the light version was off-palette: black glass with a cyan hairline and a cyan glow rising from the bottom (theirs is mint), an "Early access" label over a Sora heading with its cyan words, Space Mono labels, and the site's cyan pills. The bottom pill's email field is dark to match. The handwriting (Dancing Script) is gone, and so is its font download. Then "You're on the list." and a share step. Esc or × closes it | `index.html` `#door` / `#panel`, `main.js` |
| spur.us | Footer links: the cyan block snaps on when hovered and fades slowly after, so moving down the list leaves a trail | `styles.css` → `.foot` |

## J's rules for her, kept (`sprite.js`)

1. Never two of her at once. Clips cut; they never fade into each other.
2. Clips cut in on frame 0, the master pose.
3. One clip at a time, and each finishes its motion before the next.
4. ~~She does not follow the mouse.~~ Changed on 23 Sep by request: in the hero she looks at the cursor, done the way the reference reel does it (a Framer cursor-tracking component scrubbing one Veo clip along an axis). The cursor's left-right position scrubs through one continuous, blink-free take of her turning her head: frames 67-112 of J's `gaze` clip, re-cut into `assets/sprites/gaze-*.webp` with every frame's measured direction in `gaze.json` (`sweep`). Each screen edge is her full turn that way. A small nod drawn from her own frames adds up/down. She cuts in and out on the take's centre frame. Turn it off by not loading `gaze` in `main.js`.
5. **25 Sep, on Dee's feedback** ("she reacts one way at rest and another while scrolling; make her human, not glitches"):
   - **Scrolling doesn't change what she does.** She no longer turns forward at 20% of the hero, and no longer moves her mouth silently in the call beat. The call's words still come in with the scroll.
   - **She speaks when clicked, and stops when clicked again.** On a phone, tapping her words also stops her, because that bar sits over her feet there. A drag beside her still turns her memory. Over her the cursor says "talk to her", and "stop" while she speaks.
   - **She looks at you while the mouse moves.** After 2.5 s of stillness (`LOOK_REST`) she relaxes back into her own breathing and blinking, instead of holding a stare.
   - **Rule 1 is bent.** A clip change is a short dissolve (`BLEND` in `sprite.js`; 0 gives J's hard cut back), because hard cuts between these renders read as glitches. It lasts 0.18 s, or 0.3 s into and out of talking (`BLEND_SOFT`), since her arms move for almost all of J's talk clip. The idle loop's seam (frame 117 → 0) is dissolved too.
   - **She turns from matching frames.** She starts to look from idle frames whose head matches the gaze clip's centre (`lookFrom` in `idle.json`, measured). If none comes within 0.6 s (`LOOK_WAIT`), she turns anyway with the softer dissolve. She holds the centre pose until the dissolve ends.
   - **She stops fast.** When she stops talking she settles within 0.4 s, on the frame where her arms are lowest (`pose` in `talk.json`: her arms against frame 0).
6. **Later on 25 Sep: the glitch, and her eyes on the left.**
   - **Her head no longer jumps between clips.** The gaze and talk renders have a bigger head for their body than the idle loop, so one alignment couldn't match her head and her feet. The talk clip is drawn in 8 px strips: the head placed by `alignHead`, the legs by `align`, blending down the torso (`headTo`). All were measured against idle frame 0. The gaze frames get the same placement when the sheets are made (see "No double arms" below), so they draw like the idle loop.
   - **No more body doubling.** J's idle loop sways her from the feet, up to 24 px at the head, while the other clips stand upright, so a change mid-sway showed two of her in the dissolve. Now every change leans the new clip from the feet so her upper body stays exactly where it was (each clip's `lean`, measured per frame). She then comes back upright over 1 s (`LEAN_EASE`).
   - **No halo.** The gaze sheets had a light outline round her silhouette, 2.4× as opaque as the idle and talk clips', so a rim flashed on whenever she turned to look. It is brought down to their level.
   - **Her eyeballs follow the cursor on the left.** In J's take, her head turns left (frames 67–82) but her eyes stay on the camera. Now J's own iris, in the same frame, slides left inside J's own eye opening, and white fills in where it was.
     - **Openings, by hand:** read from the pixels at keyframes 67, 71, 75, 79 and 83 as start / white-to-iris / end per row, then carried to the frames between by the eye's measured motion.
     - **What moves:** only what's inside the opening. The lids, lashes and corners stay exactly as J drew them. Rows that are still lash in a frame are left alone.
     - **The white:** J's white colour, shaded under the lid the way he shades it.
     - **The iris:** its right edge comes back round as it leaves the corner, and its light rim is darkened next to the new white.
     - **How far:** from nothing at the centre frame (83) to the inner corner at 67, quickly at first, since eyes lead the head.
     - **The target:** J's own left look in frame 30.
     - **Earlier tries, all rejected:** swapping her whole eyes from mirrored right-turn frames (her eye shape changed), borrowing only the inside of the eye from those frames (the white sat under a dark cap of her old iris), and sliding her irises with automatically found openings (the openings were wrong at the lids).
   - **No freeze when the cursor comes back, or while she talks.** Each sheet page is 4950×4800, about 95 MB decoded. The browser drops pages it hasn't drawn for a while and decodes them again on the next draw, on the main thread. That froze her for ~0.27 s each time she turned to the cursor after resting, started talking, or reached a new page mid-line (three times in her 9 s line). Now copies are decoded off the main thread (`createImageBitmap` from the file) and kept as single frames, so drawing never waits (`keepFrames`, `_bmPage` in `sprite.js`):
     - **Her look frames:** the 46 look frames (67–112) are kept decoded on devices with a mouse, about 66 MB.
     - **Her talking:** her first talk page is decoded ahead of a click. While she talks, the next page is decoded 2.5 s before she reaches it, and pages she has left are released 3 s after she stops.
     - **The result:** measured over look → rest → look → click to talk → 9 s of talking → stop → look, no frame took over 20 ms. Before, four frames took ~270 ms each.
   - **She notices you, then turns.** When the cursor appears while she's mid-sway, her resting motion eases (forward or back, whichever is nearer, at up to 4× its speed at the fastest) into the nearest idle frame she can turn from (`lookFrom` in `idle.json`). That takes at most 0.41 s. Then she turns with a 0.18 s blend. Before, she waited up to 0.6 s, blended in from any pose, and slid back upright from as much as 19 px of lean. Until the later fix below, the settle jumped straight to 3× and could reverse her mid-sway at once.
   - **No double arms when she turns to you** (Dee: "still a glitch when I move the cursor from outside into her range"). A 60 fps recording showed the cause: J rendered the gaze take with her arms hanging straighter and closer to her body than in the idle loop, so every turn to look (and back) dissolved between two pairs of arms.
     - **Her resting arms in her look frames.** Each look frame (66–113) is laid out in the idle clip's space, and its arms are replaced by idle frame 45's. The swap is soft-edged, bounded by the vest and her hair at the shoulder and by the gap between arm and waist below. Then the gap is cleared: the resting frame's waist outline where it is wider than hers, bits of J's arm where it touched her hip, and a few stray specks. Her head, eyes, vest and legs are J's.
     - **Which frames she turns from, re-measured** against the new look frames: her arms within 2.7 px, her lean within 3.5 px, and her face at most 6 px lower. That is idle frames 0–2, 42–49 and 102–106. The old list was measured against J's own arms.
     - **Her face is lined up too.** Her whole body bobs up to 5 px in the idle loop, and the look clip's head was placed against idle frame 0. Each frame's `rise` (how much lower her face is than in idle frame 0) is measured for all three clips, and a switch stretches the new clip a hair from her feet so her face lands where it was. It eases away with the lean.
     - **Both frames fade.** Before, the new frame was drawn at full strength with the old one fading over it, so anything only the new frame had popped in at once. Now both are drawn at their share and added.
     - **Back to rest on idle frame 45** (`fromLook` in `idle.json`), the frame whose arms her look frames carry, instead of frame 0.
   - **One pass from J's originals.** The gaze sheets are rebuilt from J's originals (the sheets from commit b4d9507) in one pass (white patch, halo, eyeballs, placement, resting arms, clean-up), so his frames are re-compressed only once.

The sprite sheets in `assets/sprites/` are J's, re-packed at 450×800 per frame. The originals are 720×1280 and decode to about 240 MB per page. The format is the same as the kit's README describes. The talk clip loads after you enter, and the walk clip loads when the road is near.

## The hero (design 1, chosen 24 Sep)

Her name, huge, behind her: glass ANITA letters (thin cyan edges, see-through, so her memory graph glows through them), lettered like the logo since 25 Sep (the same Orbitron, spaced .32em apart like the top-left logo). She stands in front of them in the middle, the headline and buttons at the bottom left. The letters rise in one by one after the gate, drift gently against the cursor, and spread apart and fade as the call comes in while she glides to the right. Phones: headline at the top, her centred, her name behind her. Code: `.wordmark` in `index.html`, `.hero-v1` in `styles.css`, `HERO === 1` in `main.js`.

The other designs tried that day are kept to compare: `/?hero=0` the hero before, `2` she forms from specks of her own pixels (`heroform.js`), `4` a day with her, `5` inside her memory then the pull-back, `6` her in a scene (a framed window onto ANITA HQ). Desktop only.

## The work: Personal, Enterprise, R&D (25 Sep)

On 25 Sep the page changed from the personal companion alone to everything the team does, with the companion as one part. Dee set the structure, in two groups: **1. Personal** (the ANITA app) and **2. Enterprise**. Enterprise has two parts inside it. **AI & Physical AI** (one part) is the ERP, welding, power-plant design and sugar de-bagging. **R&D** is the agentic workflows and R&D work for any client who asks. For R&D, "we are our first customer": each workflow is built and proven on our own work, then goes into client products like the ERP. Clients are not named on the page, only the work. The page runs in this order:

1. **Hero:** "One brain. At work everywhere." The chips around her are one memory from home, one from the office and one from a plant. The buttons are See the work and Hear her.
2. **The work** (`#work`): "Personal. Enterprise." Glass cards sit in a two-column grid under heading rows. The Personal and Enterprise headings are big; the two parts inside Enterprise get smaller ones:
   - **Personal:** the ANITA app, as one wide card, led by "Ask her what you were worried about last Tuesday." It links down to the personal chapter.
   - **Enterprise / AI & Physical AI**, two by two: the ERP with agents inside, robotic welding, power-plant cooling design, and robotic sugar de-bagging.
   - **Enterprise / R&D:** agentic workflows ("we are our first customer"), and R&D for you (work on request, an email to hello@aneeta.ai).

   A soft light follows the cursor inside each card.
3. **Enterprise** (`#enterprise`): "An AI department inside your building". It gives four ways we come to work, then the road: the office → the floor → the machines → humanoids, lit where work is under way.
4. **Personal, the ANITA app** (`#personal`): the page's first hero words, "She remembers what every AI forgets." After them come the memory scene, "You choose what she forgets" and the walk, all as before.
5. **What runs today:** as before.
6. **Two doors** (`#door`): "For you" is early access, which opens the panel. "For your company" is an email to the team.

The nav is Work · Enterprise · Personal · Contact (Robots came out of it on 25 Sep, to keep it plain; the footer still links the robots section). Split headings keep a `<br>` as a forced line break (`splitLines` in `main.js`), so the hero always breaks after "One brain."

The shape comes from the vision board's ANITA Industrial page (`Dee-Nith/aneeta-vision`, `industrial.html`). The facts come from the team's own project folders. The copy only claims what those sources say:

- The welding card says **AI next**, not AI inside. Its seam finding is geometric, and camera inspection is a plan.
- The sugar de-bagging card says no more than the vision board does, since there is no repo or document for it.
- "The role remembers" is written as a design aim ("Designed to…"), because the vision board marks it as by design, not built.
- No client names, client data, pricing or project names are used.

Where the memory graph sits (`places` in `main.js`): it steps aside, small and faint in the corner, for the work and Enterprise. It comes back to the middle for Personal, where the vow picks it up.

## ANITA in 3D (try it: http://127.0.0.1:8791/?3d)

Dee's approved ANITA, exactly as drawn, standing in depth like a person. Without `?3d` the page is unchanged.

- J's sprite keeps drawing every frame (her own head-and-eye following, nod and talking), hidden, and `her3d.js` lays that canvas on a 3D surface shaped like her body.
- The shape is `assets/sprites/depth-idle.png`, a depth map of her master frame made on this laptop with Depth Anything V2 Small (free, Apache-2.0; nothing was uploaded). Her head is evened out so it turns as one piece, like a skull. Landmarks (chin, neck, shoulders, knees) are in `depth-idle.json`.
- She turns like a person: her eyes lead (J's frames), her head follows on her neck in about 0.3 s, her shoulders come round after (about 1 s), her feet stay put. Standing still she drifts a little. The camera is orthographic, so facing you she is pixel for pixel the flat sprite.
- Strength is set at the top of `her3d.js` (`DEPTH`, `HEAD_YAW`, `BODY_YAW`, nod, `RIM`). If the browser ever drops the 3D surface, the flat sprite shows again at once.

## Before it goes live

- **Sign-ups:** `SIGNUP_ENDPOINT` at the top of `main.js` is empty, so the form opens a pre-filled email to `hello@aneeta.ai`. Point it at a list that accepts `POST` JSON `{ name, email, city, phone, first }`.
- **Private material:** the pictures and voice are private company material (see the sprite kit's README). Don't publish this folder anywhere public until Dee says so.


## Her cursor-following, the reel's way (ready for a Google Flow video)

The reference reel does it in three steps. Steps 1 and 2 need Google Flow; step 3 is built (`videotrack.js`).

1. **Image (16:9).** In Gemini / Nano Banana, attach `sprite-kit/masters/anita-fullbody-idle.png`:
   > Use the attached character exactly as she is: same face, hair, outfit, colours and art style. Create a 16:9 image. She stands in the right third of the frame, shown from the waist up, facing the viewer with a calm, friendly expression, looking straight ahead. Pure black background (#000000), no floor, no props, no text. Soft cyan rim light from behind that matches her outfit's glow. Leave the left half of the frame empty.
2. **Video.** In Google Flow, from that image:
   > Keep the background, framing, lighting and character 100% identical to the image. The camera does not move. She stays still; only her head and eyes move. Over 8 seconds she slowly turns her head and eyes from looking at the far left edge of the frame to looking at the far right edge, in one smooth, continuous motion at a steady speed, looking straight at the viewer at the halfway point. No blinking, no talking, no hand or body movement. The background stays pure black.
3. **Drop it in** as `assets/anita-look.mp4` and reload. The hero switches to it by itself: the cursor's position across the screen scrubs the video (left edge = first frame, right edge = last). Settings are at the top of `main.js` (`LOOK`): `from`/`to` trim it in seconds, `reverse: true` if it turns right to left, `axis: 'vertical'` for an up/down clip. Delete the file to go back to the sprite version.

Scrubbing a compressed video can lag on fast cursor moves (seeking waits for keyframes). If it does, the video can be cut into frame sheets like her other clips, which scrub instantly.

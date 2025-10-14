# Basic Overview

- Immediate beats delayed: ADHD shows steeper delay discounting; immediate, frequent rewards are more motivating than larger delayed ones. [Springer 2024 review]

- Emphasize the moment of completion: fMRI work shows ventral striatal hyporesponsiveness during anticipation but stronger responses at reward receipt in ADHD. Make the “you did it” moment vivid. [Plichta & Scheres 2014; Furukawa et al. 2014; Furukawa et al. 2022]

- Make reinforcement signals clear and a bit bigger: Adults with ADHD show blunted reinforcement sensitivity; stronger, unambiguous positive feedback helps. [2024 fMRI RL study]

- Multi-sensory, adaptive, game-like feedback sustains engagement: FDA-cleared EndeavorRx and other digital therapeutics lean on immediate feedback, adaptivity, and varied stimuli. [Npj Ment Health Res 2024]

- Combine “tangible” tokens with praise: In pediatric attention interventions, paired material rewards (coins) plus verbal encouragement outperformed either alone. [JMIR Serious Games 2025]

- Social/affirmative feedback works at receipt: ADHD shows similar pattern for social (“affiliative”) rewards—weak anticipation, stronger response at delivery. Use timely praise at completion. [Psychiatry Res Neuroimaging 2022]

Design recommendations for your to‑do app (tree with levels):


1. 
Subtask completion (micro-reward; dozens per day)


	- Timing: 250–400 ms, immediate.

	- Cues (pick 2 max to avoid overload):
		- Visual: checkmark morph with a quick “pop” and tiny sparkle/confetti burst; progress ring pulses.

		- Haptic: light tap.

		- Audio: very short ascending chime (100–300 ms), subtle volume.


	- State change: visibly increment a progress bar/XP meter right then (goal‑gradient helps).

	- Text: short, affirmative (“Done!” “Nice!”). Social-style praise works well at delivery.


2. 
All level‑3 subtasks complete (which rolls up level‑2; medium reward)


	- Timing: 700–1000 ms.

	- Visual: radial “completion wave” around the parent node; the node glows/fills and locks in.

	- Token: drop 1–3 coins/stars into a wallet, with a tiny “clink.”

	- Praise: a brief, specific line (“Branch complete: Research”). Specificity increases perceived competence.

	- Optional novelty: 10–20% chance of a slightly fancier flourish (e.g., ribbon or badge reveal). Keep it earned (not slot‑machine random) to avoid gambling vibes.


3. 
Major task/root complete (big reward)


	- Timing: 1200–1600 ms max (celebrate, then get out of the way).

	- Visual: full‑screen confetti/fireworks, badge/trophy reveal, progress screen animates to 100%.

	- Agency: let the user pick one of a few celebration skins (fireworks, balloons, aurora), or unlock a cosmetic (“theme,” “pet,” “sticker”). Autonomy boosts intrinsic motivation.

	- Haptic: success/heavy tap sequence (optional).

	- Optional: offer a self-chosen real-world micro‑reward (e.g., “Take a 5-min break”) to pair psychological + tangible reinforcement.


Reward economy and schedule


- Always-on micro feedback for every subtask (immediate reinforcement).

- Small, guaranteed tokens at branch completions; visible wallet and simple redemptions (e.g., unlock cosmetic packs, sounds, themes).

- Occasional “rare” cosmetic flourish (earned, not random-only) to add novelty and reduce habituation.

- Streaks: consider “grace” rules (e.g., 1 skip per week) to avoid punishing inconsistency, which can backfire for ADHD.

- No punishments: avoid negative sounds, red flashes, or streak resets that feel like losses.

Sensory and accessibility notes


- Keep celebrations short: micro 0.25–0.4s; medium ~0.8s; big ~1.5s.

- Limit channels per event to 1–2 (e.g., visual + haptic). Offer toggles for sound, motion, and haptics; a “Subtle / Standard / Extra Juicy” intensity setting helps individualize.

- Rotate variants weekly to preserve novelty without constant escalation.

- Respect motion sensitivity; offer “reduced motion” mode with fades instead of bursts.

What to avoid


- Pure variable‑ratio (“lootbox”) rewards. If you add surprise, pair it with visible progress toward guaranteed rewards.

- Overlong animations that block flow.

- Punitive elements (loss aversion, streak resets) that can demotivate.

Measure what works for you (quick A/B ideas)

- Compare: baseline (no animations) vs micro-only vs tiered celebrations.

- Metrics: subtasks completed/day, percent of branches completed, depth completion rate (root completions), session return rate, time-to-return, and self-reported satisfaction.

- Personalize: if a user’s rate improves with “Extra Juicy,” keep it; if not, dial back automatically.

# Coming Back After a "Slump"

- Fresh-start framing helps re‑engagement. Temporal landmarks (new week/month, birthdays, first day back) create a natural “clean slate” that boosts goal pursuit. Build an explicit fresh-start moment after gaps. Sources: Dai, Milkman, Riis 2014 (Management Science) [PDF], SSRN.

- Self‑compassion improves motivation after setbacks. Brief, non‑judgy prompts increase willingness to try again and study/work longer after failure. Use kind, matter‑of‑fact language on return. Sources: Breines & Chen 2012 (Pers Soc Psychol Bull) [PDF]; 2019 replication on failure beliefs (J Happiness Studies).

- Behavioral Activation (BA) beats rumination. The evidence-based way out of a slump is scheduling small, specific, doable activities that create contact with reward and rebuild momentum. Sources: Dimidjian et al. 2006; Dobson et al. 2008 (J Consult Clin Psychol) [PMC].

- If‑then “restart plans” bridge intention and action. Pre‑decide exactly how you’ll restart after gaps: “If I miss 3+ days, then I do one 2‑minute task at 9:00 a.m. and mark the day ‘re‑entry’.” Implementation intentions have medium–large effects on follow‑through. Sources: Gollwitzer & Sheeran meta‑analysis 2006; Gollwitzer 1999.

How to design your app so streaks don’t backfire

Replace brittle streaks with forgiving, comeback‑friendly mechanics:


- Use rolling targets instead of daily streaks
	- Example: “4 days this week” or “20 focus blocks this month.” Gaps don’t nuke progress; you still have a path to a win.


- Add “grace” and “freeze” options
	- 1–2 automatic skip tokens per week/month; “sick mode” that pauses streaks without penalty.


- Never reset to zero
	- Keep lifetime counts and longest‑streak history visible. After a gap, show “streak paused” and a “Return streak: day 1” that grows separately from “longest.”


- Celebrate the return, not just the run
	- After N idle days, trigger a Fresh Start screen: “Welcome back—new week, clean slate.” Give a tiny “return bonus” animation for the first micro‑task completed.


- Bake in Behavioral Activation
	- On tough days, surface 3 tiny, value‑aligned actions (1–3 minutes each) with immediate, salient feedback. Label them “re‑entry tasks.”


- Count recovery as progress
	- When you’re sick or depleted, offer a “care tasks” set (water, meds, a 5‑minute walk, inbox triage). Checking one keeps the “never‑zero” streak alive.


- Pre‑commit If‑Then restart plans
	- Let users define: “If idle ≥ 3 days, then prompt me at 9:00 with ‘Do 2‑min tidy’ and one-tap start.” Make this plan visible and easy to accept when the gap happens.


- Gentle copy and visuals
	- Swap “You broke your streak” for “You’re back—one tiny win reboots momentum.” Keep the animation short, warm, and immediate.

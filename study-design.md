# Drishti — Research Framing and Study Design

*Working draft for advisor review. Nothing here has been run yet.*

---

## 1. The framing

The weak pitch is "I built a meditation app." The strong pitch is:

> **Attention is normally measured once, in a lab, on a task nobody would repeat voluntarily.
> Drishti is an attempt to measure an oculomotor correlate of attentional stability *densely* —
> every day, on consumer hardware, inside a task people will actually come back to.**

The contribution is not the meditation. It is the **sampling density**. A lab session gives one
noisy point per participant. Drishti gives ~30 points per participant over a month, which turns a
between-subject comparison (weak, needs large N) into a within-person time series (strong, works
at N≈25).

Trataka is doing a specific job in this design: it is the **adherence vehicle**. Sustained fixation
is a standard psychophysics task — participants just will not do a standard psychophysics task for
thirty consecutive days. A contemplative framing, a candle, and a streak counter solve the hardest
problem in ambulatory measurement, which is getting people to show up.

That inversion is the argument to lead with: *the wellness surface is not a distraction from the
science, it is the instrument's data-collection mechanism.*

### What the system honestly measures

It does **not** measure attention. It measures **behavioral compliance with a fixation
instruction** — whether the eyes stayed near a target, and how often they blinked. Whether that
covaries with attention is the empirical question, not an assumption. Stating this explicitly is
what separates a research prototype from a wellness claim.

---

## 2. Why a wearable belongs in this

The wearable is not decoration. It supplies the **independent variable that varies naturally
within a person, day to day, without any manipulation**: overnight physiological recovery.

This is what makes the study tractable for a student project:

- no intervention arm to administer
- no deception, no manipulation, minimal risk
- every participant is their own control
- nature randomizes the predictor for you — nobody chooses to sleep badly on a Tuesday

---

## 3. Primary hypothesis

> **H1.** Within an individual, overnight physiological recovery (HRV, total sleep time) predicts
> next-morning oculomotor stability during a standardized fixation task — and this coupling is
> **stronger than** the coupling between recovery and the participant's own self-reported state.

The second clause is what makes it worth doing. If it holds, the claim is: *a short webcam fixation
task detects day-to-day variation in attentional capacity that people cannot detect in themselves.*
That is a useful finding, and it is falsifiable.

**Directional prediction:** a 1-SD within-person decrease in overnight rMSSD predicts a decrease in
total held-gaze seconds and an increase in blink rate during fixation, with the gaze effect
surviving adjustment for self-reported feeling.

### Secondary hypotheses

| | Hypothesis | Why it matters |
|---|---|---|
| **H2** | Same-day gaze stability correlates negatively with PVT lapses and RT variability (within-person). | Convergent validity against the field's standard sleep-sensitive attention measure. Without this, the gaze metric is uninterpretable. |
| **H3** | Gaze-stability metrics show acceptable within-person test–retest reliability (ICC ≥ 0.6) across consecutive days; blink rate is less stable. | Establishes the instrument measures a trait-plus-state, not noise. |
| **H4** | Across 4–6 weeks of daily practice, within-person gaze stability increases beyond the first-week device-familiarity curve. | The practice-effect question. Deliberately *secondary* — it is the least controlled claim. |
| **H5** | Blink rate and gaze stability load on separable factors. | Blink rate has a dopaminergic and an ocular-surface story that is not attention. Treating them as one construct would be a mistake. |

**Choose H1 as the single primary endpoint.** Registering five co-primaries is a multiplicity
problem the first reviewer will name.

---

## 4. Design

**Type:** observational, within-subject, intensive longitudinal (daily diary + sensor).

| | |
|---|---|
| Participants | 25–30 adults, normal or corrected-to-normal vision, owning a compatible wearable (or loaned one) |
| Duration | 30 consecutive days |
| Daily burden | 11-min Drishti session + 3-min PVT-B + 3 self-report items ≈ 17 min |
| Setting | Participant's own laptop, same room and time of day each morning |
| Wearable | Oura or Whoop — both expose a documented API; Oura v2 is the friendlier one |
| Lab visits | Two — intake (consent, screening, calibration, eye-tracker cross-validation) and exit |

### Measures

**Exposure — wearable, previous night:** total sleep time, sleep efficiency, overnight rMSSD/HRV,
resting HR, respiratory rate.

**Outcome — Drishti, same morning:** total held-gaze seconds, longest unbroken gaze streak, blink
rate during fixation, mean blink duration, iris-deviation variance, and the per-second stability
series (already persisted as `gaze_stability_samples`).

**Validity anchor — same morning:** PVT-B — lapses (RT > 355 ms), mean 1/RT, RT coefficient of
variation. The sleep → PVT-lapse relationship is among the most replicated effects in sleep
science, which makes PVT the right yardstick: if the gaze metric tracks it, the gaze metric
inherits its interpretation.

**Self-report:** the existing Calm / Neutral / Restless item, plus a 0–10 alertness rating and a
0–10 perceived-focus rating.

**Covariates:** time of day, caffeine, ambient light (self-report is adequate), measured frame
rate, glasses/contacts, day-in-study.

### Analysis

Linear mixed-effects models with random intercepts and random slopes by participant:

```
gaze_stability ~ HRV_z_within + sleep_z_within + day_in_study
                 + time_of_day + caffeine + fps
                 + (1 + HRV_z_within | participant)
```

Predictors are **person-mean-centered**, so the coefficient is a genuinely within-person effect and
not contaminated by between-person differences in baseline HRV. H1's comparison clause is tested by
refitting with self-reported alertness as the outcome and comparing standardized effect sizes.

**Power.** With 25 participants × ~25 usable days ≈ 625 observations, a within-person effect of
β ≈ 0.15 SD is detectable at 80% power. Adherence is the real risk, not N — budget for ~20% missing
days and recruit accordingly.

---

## 5. What has to be fixed before any of this is defensible

These are instrument problems, and an advisor will find every one of them. Better to arrive with
the list already written.

1. **No gaze calibration.** Iris position is measured relative to a per-session baseline captured
   before the session starts. That makes *within-session* change interpretable but leaves
   *cross-session magnitudes* shaky, because the baseline itself moves. Needs a fixed calibration
   routine at session start, a rigidly standardized seating distance, or both.
2. **Fixed blink threshold.** `EAR > 0.18` is a single global constant. Eyelid anatomy, eye shape,
   and glasses all shift EAR. This needs a per-participant threshold fit at intake, validated
   against hand-coded video.
3. **Frame rate varies by machine.** Blink-duration resolution is a function of fps. Log achieved
   fps per session and carry it as a covariate — do not assume 30.
4. **Resolution is being thrown away.** The per-second signal is persisted as a *binary* pass/fail
   against the held-gaze criteria. The underlying continuous values — iris deviation magnitude,
   EAR, head-rotation delta — are computed and then discarded. **Persist the continuous series.**
   A thresholded signal cannot be re-analyzed under a better threshold later; the raw one can.
5. **No ground truth.** At minimum, cross-validate a subset of sessions at intake against a
   research eye tracker, and hand-code a random sample of video for blinks.
6. **Screen-induced dry eye is a live confound.** Sustained screen fixation mechanically suppresses
   blinking regardless of attentional state. A passive-fixation control condition — same duration,
   same target, no contemplative framing — separates the two.
7. **Ethics and data handling.** Human-subjects review is required. Two features help the
   application considerably: video never leaves the device, and only derived numeric features are
   stored. The current Privacy page states the developer can read participant notes; that access
   model has to be rewritten for research use, and notes kept out of the research dataset entirely.

---

## 6. Staging

**Phase 0 — instrument work (now).** Fixes 1–4 above, plus a research data export. Nothing else
matters until the numbers mean something.

**Phase 1 — validation, N≈10, 2 weeks.** H2 and H3 only. Does the webcam signal track PVT, and is
it stable day to day? This is the study that has to exist before the interesting one — and it is
small enough to finish in a semester.

**Phase 2 — main study, N≈25, 30 days.** H1, with H4 and H5 exploratory.

Pitch Phase 1 to the advisor and show Phase 2 as where it goes. Asking for the 30-day study on day
one invites a conversation about feasibility instead of a conversation about the idea.

---

## 7. Questions for the advisor

1. Is PVT the right validity anchor, or would gradCPT / SART better match a *sustained* fixation task?
2. Is the "objective measure beats self-report" clause in H1 enough to carry a paper, or does it need a manipulation to be convincing?
3. Does the passive-fixation control need to be within-subject (alternating days), or is a between-subject arm acceptable?
4. What eye-tracking hardware is available for the intake cross-validation?
5. Is there existing IRB coverage for webcam-based behavioral data collection, or does this need a fresh protocol?

---

## Related documents

- [`algorithm-overview.md`](algorithm-overview.md) — signal extraction pipeline
- [`protocol-and-questions.md`](protocol-and-questions.md) — protocol rationale and open measurement questions
- [`system-diagrams.md`](system-diagrams.md) — architecture

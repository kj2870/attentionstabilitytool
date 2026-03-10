# Algorithm Overview

## Objective

Estimate simple behavioral indicators of attentional stability during a visual fixation task using webcam video.

## Proposed Inputs

- webcam video stream
- fixed on-screen target position
- session time window

## Proposed Processing Stages

### 1. Face and eye localization
Detect the face and isolate the eye region on each frame.

### 2. Landmark / eye-state extraction
Estimate eye-related features that can support blink detection and gaze approximation.

### 3. Blink detection
Identify likely blink events from rapid changes in eye openness or temporary landmark disappearance.

### 4. Gaze stability estimation
Approximate whether gaze remains near the intended target region over time.

### 5. Time-series feature extraction
Compute summary features across the session, such as:
- blink count
- blink rate
- periods of stable fixation
- deviation variability
- interruptions in target engagement

### 6. Session summary
Combine the features into a simple descriptive session output such as:
- stable / moderately stable / unstable
or
- a normalized exploratory score

## Design Philosophy

The current design prioritizes:
- interpretability
- feasibility with low-cost hardware
- repeated measurement
- simple, explainable features

rather than complex black-box modeling.

## Known Technical Challenges

- eye tracking with ordinary webcams is noisy
- head motion can confound gaze estimates
- lighting strongly affects detection reliability
- blink detection thresholds may vary across users
- calibration may be required for more meaningful comparisons

## Validation Questions

Important validation questions include:
- Do these features track observable attentional lapses?
- Are measurements stable within the same user across repeated sessions?
- Which features are robust enough for practical use?
- How sensitive are the outputs to camera setup and lighting?

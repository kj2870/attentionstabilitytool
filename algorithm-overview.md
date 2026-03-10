# Algorithm Overview

## Objective

The purpose of the algorithm is to extract simple behavioral signals from webcam video recorded during a visual fixation task. These signals are intended to describe how stable a participant’s visual engagement remains over the course of a session.

The system does not attempt to measure attention directly. Instead, it focuses on observable patterns such as blink behavior and changes in eye position that occur while the user maintains fixation on a visual target.

---

## Inputs

The prototype currently uses a minimal set of inputs:

- webcam video recorded during the fixation task  
- the location of the visual fixation target on the screen  
- session timing information  

No specialized eye-tracking hardware or calibration procedures are required in the current version.

---

## Processing Pipeline

### Frame Processing

Video frames are processed sequentially. Each frame is analyzed to locate the face and isolate the region containing the eyes. Restricting analysis to this region reduces the influence of unrelated motion elsewhere in the frame.

---

### Eye-State Feature Extraction

Within the eye region, frame-level features are estimated that describe the current state of the eyes. These may include measures related to eye openness, landmark geometry, or approximate eye position.

These signals provide the basis for detecting blink events and identifying changes in eye position relative to the fixation target.

---

### Blink Event Detection

Blink events are detected by identifying rapid transitions in eye openness across consecutive frames. When the eye closes and reopens within a short time window, the system records a blink event.

From these events, additional metrics can be derived such as blink count, blink rate, and blink duration.

---

### Target-Relative Eye Position

Eye position is estimated relative to the screen location of the fixation target. The goal is not precise gaze tracking but rather a coarse indication of whether the eye remains near the intended target region.

Changes in this estimate can indicate brief interruptions in fixation.

---

### Time-Series Feature Construction

Frame-level signals are aggregated across the session to create behavioral time-series features. These features describe how eye behavior evolves over the duration of the task.

Examples include:

- blink rate across the session  
- frequency of fixation interruptions  
- variability of eye position relative to the target  
- duration of continuous fixation intervals  

---

### Session-Level Summary

The time-series features can be combined into a small number of descriptive session-level metrics. These summaries are intended to reflect the overall stability of eye behavior during the task rather than produce a definitive measure of attention.

In the current prototype, these outputs are best understood as exploratory indicators that can be compared across repeated sessions.

---

## Design Approach

The system is intentionally simple and interpretable. The focus is on behavioral features that can be inspected directly rather than complex models that are difficult to interpret.

This approach makes it easier to evaluate whether the extracted signals behave in reasonable ways before introducing more advanced analysis methods.

---

## Technical Constraints

Several practical factors influence the reliability of the extracted signals:

- variability in webcam quality and frame rate  
- sensitivity to lighting conditions  
- head movement affecting apparent eye position  
- limited spatial resolution of consumer cameras  

Because of these constraints, the current implementation should be viewed as a feasibility prototype rather than a precise eye-tracking system.

---

## Next Steps

Further development will likely focus on:

- improving robustness of eye region detection  
- introducing simple calibration procedures  
- evaluating signal stability across repeated sessions  
- identifying which behavioral features remain reliable under different recording conditions

These steps will help determine whether webcam-derived signals can support meaningful behavioral measurements over time.

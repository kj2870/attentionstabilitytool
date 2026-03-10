# Attention Stability Prototype

## Repository Structure

- `README.md` – project overview  
- `algorithm-overview.md` – description of the signal-processing pipeline  
- `protocol-and-open-questions.md` – explanation of the fixation protocol and related research questions  
- `system-diagrams.md` – diagrams illustrating the system architecture and protocol structure  

---

## Project Overview

This repository documents an early-stage prototype exploring whether simple behavioral signals related to attentional stability can be estimated using a standard webcam during a sustained visual fixation task.

In the current concept, a user maintains gaze on a visual target for a short session while webcam video is recorded. From this video, the system attempts to estimate basic behavioral features such as:

- blink events  
- blink frequency  
- gaze deviation from the target  
- variability in fixation over time  
- brief interruptions in visual engagement  

The broader motivation is to explore whether behavioral signals like these could eventually be studied alongside physiological signals from wearable devices to better understand attention, regulation, and changes in state across repeated sessions.

---

## Current Status

This project is still in an early exploratory stage rather than a finished system.

Right now the focus is on:

1. identifying behavioral features that can be measured reliably  
2. designing a simple signal-processing pipeline  
3. testing feasibility using consumer-grade webcam input  
4. thinking through sources of noise, measurement limitations, and possible validation approaches  

The system is not clinically validated and is not intended for diagnosis or medical use.

---

## High-Level Pipeline

At a high level, the prototype follows this process:

1. Record webcam video while the user performs a visual fixation task  
2. Detect the face and localize the eye region  
3. Estimate eye landmarks or related eye features frame-by-frame  
4. Detect blink events  
5. estimate gaze-related features relative to the fixation target  
6. Aggregate these signals across the session  
7. Generate simple session-level behavioral summaries  

The goal is not to measure “attention” directly, but to observe behavioral patterns that may relate to steadiness of engagement during the task.

---

## Example Behavioral Features

Some of the exploratory features of interest include:

- total blink count  
- blink rate over time  
- duration of gaze interruptions  
- short-term variability in eye position  
- duration of stable fixation periods  
- percentage of time spent near the target region  

These should be understood as **behavioral markers**, not definitive measures of attention.

---

## Why This Project Interests Me

I’m interested in how behavioral and physiological signals can be measured repeatedly over time to better understand changes in attention, regulation, and overall state.

This project started as a small independent exploration into whether meaningful behavioral markers could be extracted using widely available hardware. It has also been a way for me to think more concretely about digital phenotyping, signal quality, repeated measurements, and feature design.

---

## Current Limitations

Several limitations are important to keep in mind:

- variability in webcam quality and frame rate  
- sensitivity to lighting conditions  
- changes in head position and posture  
- noise introduced by consumer hardware  
- uncertainty in estimating gaze without calibration  
- lack of formal validation  

Because of these factors, the project should currently be viewed as a feasibility-oriented prototype.

---

## Possible Next Steps

Future improvements could include:

- more robust face and eye tracking  
- simple user-specific calibration procedures  
- improved blink detection methods  
- session-to-session baseline comparisons  
- signal quality checks  
- validation against behavioral tasks or reference measures  
- integration with wearable-derived physiological signals

---

## Intended Use

This repository is primarily meant to document the concept, signal-processing approach, and protocol design behind the prototype. It serves as a place to organize the project and share the reasoning behind its current direction.

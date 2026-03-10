# Attention Stability Prototype

This repository documents an early-stage exploratory prototype for estimating simple behavioral markers of attentional stability during a sustained visual fixation task using a standard webcam.

## Project Overview

The goal of this project is to investigate whether low-cost camera-based measurements can be used to extract basic signals related to visual attention during repeated fixation sessions.

In the current concept, a user maintains gaze on a visual target for a short session while webcam video is used to estimate simple behavioral features such as:

- blink events
- blink frequency
- gaze deviation from target
- fixation instability over time
- loss-of-focus events

The broader motivation is to explore whether these behavioral signals could eventually be studied alongside physiological data from wearables to better understand attention, regulation, and state changes across sessions.

## Current Status

This is an early prototype and research exploration rather than a validated product.

At this stage, the emphasis is on:

1. defining measurable behavioral features
2. designing a basic signal-processing pipeline
3. testing feasibility using consumer-grade webcam input
4. identifying limitations, sources of noise, and next steps for validation

The system is not yet clinically validated and is not intended for diagnosis or medical decision-making.

## High-Level Pipeline

A high-level conceptual pipeline is:

1. Capture webcam video during sustained fixation
2. Detect face and eye regions
3. Estimate eye landmarks / pupil-related features
4. Detect blink events
5. Estimate gaze deviation or instability relative to a fixed target
6. Aggregate time-series features across the session
7. Produce a simple session-level attention stability summary

## Example Behavioral Features of Interest

Possible features include:

- total blink count
- blink rate over time
- duration of gaze interruptions
- short-term gaze variance
- fixation stability windows
- percentage of time spent near target region

These features are intended as exploratory behavioral markers rather than definitive measures of attention.

## Why this project interests me

I am interested in how behavioral and physiological signals can be measured repeatedly over time to better understand changes in attention, regulation, and health state.

This project started as a small independent exploration into whether meaningful behavioral markers can be extracted using widely available hardware. It also serves as a way to think more concretely about digital phenotyping, signal quality, repeated measurement, and feature design.

## Current Limitations

Important limitations include:

- webcam quality and frame-rate constraints
- lighting sensitivity
- head pose variation
- consumer-device noise
- uncertainty in estimating gaze accurately without calibration
- limited current validation

The project is best viewed as a feasibility-oriented prototype.

## Future Directions

Potential next steps include:

- improved face / eye tracking robustness
- user-specific calibration
- cleaner blink detection logic
- session-to-session baseline comparisons
- signal quality checks
- validation against task performance or other reference measures
- possible integration with wearable-derived physiological data

## Intended Use

This repository is meant to document the project concept, algorithm design thinking, and prototype direction.

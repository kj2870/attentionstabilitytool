# System Diagrams

This section provides visual summaries of the current prototype design, including the measurement pipeline, eye-feature extraction process, protocol structure, and how repeated sessions might be compared over time.

---

## Figure 1. High-Level Measurement Pipeline

The overall processing pipeline from webcam video acquisition to session-level behavioral summaries.

```mermaid
flowchart TD
    A[Visual fixation task begins] --> B[Webcam video acquisition]
    B --> C[Face detection]
    C --> D[Eye region localization]
    D --> E[Frame-wise eye feature extraction]

    E --> F[Blink event detection]
    E --> G[Gaze-related feature estimation]

    F --> H[Feature aggregation across the session]
    G --> H

    H --> I[Session-level behavioral markers]
    I --> J[Exploratory session summary metric]
    J --> K[Within-subject tracking across sessions]
```

---

## Figure 2. Eye Feature Extraction Pathway

Example decomposition of eye-region signals into blink-related and target-relative position features.

```mermaid
flowchart TD
    A[Eye region frames] --> B[Eye landmark or eye-state estimation]

    B --> C1[Eye openness signal]
    B --> C2[Pupil or iris position estimate]
    B --> C3[Eye region geometry over time]

    C1 --> D1[Blink event detection]
    C1 --> D2[Blink duration estimates]

    C2 --> D3[Target-relative eye position features]
    C3 --> D4[Frame-to-frame position variability]

    D1 --> E[Feature time series]
    D2 --> E
    D3 --> E
    D4 --> E

    E --> F[Session summary statistics]
```

---

## Figure 3. Protocol Structure

Temporal structure of the current protocol, including preparatory phases, sustained fixation, and post-fixation integration.

```mermaid
flowchart LR
    A[Posture settling<br/>~10 s] --> B[Whole-body tension and release<br/>~30 s]
    B --> C[Paced breathing<br/>~30 s]
    C --> D[Sustained visual fixation<br/>~5 min]
    D --> E[Open-awareness / integration period<br/>~2 min]
```

---

## Figure 4. Repeated Session Comparison

Conceptual framework for comparing exploratory session metrics within the same individual across multiple sessions.

```mermaid
flowchart LR
    A[Session 1] --> B[Session summary metric]
    C[Session 2] --> D[Session summary metric]
    E[Session 3] --> F[Session summary metric]

    B --> G[Within-subject comparison across sessions]
    D --> G
    F --> G

    G --> H[Trends in behavioral stability over time]
```

```mermaid
flowchart TD
    A[User begins fixation session] --> B[Webcam video stream]
    B --> C[Face detection]
    C --> D[Eye region extraction]
    D --> E[Frame-wise eye feature estimation]

    E --> F[Blink detection]
    E --> G[Gaze stability estimation]

    F --> H[Feature aggregation across time]
    G --> H

    H --> I[Session-level behavioral markers]

    I --> J[Exploratory attention stability score]
    J --> K[Longitudinal tracking across sessions]

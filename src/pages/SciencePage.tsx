const findings = [
  {
    claim: "Steady gazing appears to reduce mind-wandering",
    detail:
      "A randomised controlled trial of 106 adults found that two weeks of trataka practice significantly reduced mind-wandering and improved state mindfulness compared to a control group. The same study found reductions in visual fatigue from screen use.",
    citation: "Saoji et al., 2022 — Work",
    href: "https://consensus.app/papers/details/e39add0984d552c99968bf26c91b1b82/",
  },
  {
    claim: "Working memory and spatial attention may improve after a single session",
    detail:
      "Participants showed improvements in both forward and backward spatial memory spans after one trataka session, more so than after an equivalent period of eye exercises. This suggests the effect comes from focused visual attention, not just eye movement.",
    citation: "Swathi et al., 2021 — Frontiers in Psychology",
    href: "https://consensus.app/papers/details/8c0708514e6d54c5913f5b6bb8609ba8/",
  },
  {
    claim: "Eye stability during fixation correlates with sustained attention",
    detail:
      "A 2025 eye-tracking study found that how steadily a person holds a visual fixation point predicts their sustained attention performance on a separate task. This provides some basis for using eye drift as a meaningful signal, which is what this app measures.",
    citation: "Zhang et al., 2025 — International Journal of Psychophysiology",
    href: "https://consensus.app/papers/details/cd820347342f58a58d8c1ed21cd0e04c/",
  },
  {
    claim: "Anxiety and concentration improved across 8 weeks of practice",
    detail:
      "A study of 100 adolescents across two culturally distinct schools found that 15 minutes of trataka per day over 8 weeks reduced anxiety and improved concentration scores in both groups. The consistency across different backgrounds is encouraging, though replication in larger samples is needed.",
    citation: "Tripathi, 2024",
    href: "https://consensus.app/papers/details/75a67666fc7758e4880c89cf9b4613a1/",
  },
  {
    claim: "Fixation-based attention training benefits children over 12 weeks",
    detail:
      "82 elementary school students who practiced fixation focus training once a week for 12 weeks showed significant improvements in focused and selective attention compared to controls. Participants also reported better concentration in class and improved ability to fall asleep.",
    citation: "Lai et al., 2020 — International Journal of Environmental Research and Public Health",
    href: "https://consensus.app/papers/details/ce83f0b28e8857edaec76d0afe7d982a/",
  },
  {
    claim: "Mindfulness practices broadly improve executive function, across 56 studies",
    detail:
      "A meta-analysis of 56 randomised mindfulness studies (2,931 participants) found reliable improvements in executive function and working memory. Effect sizes were modest, and the authors note that mindfulness outperformed inactive but not always active comparators. Trataka is a specific form of this broader category.",
    citation: "Whitfield et al., 2021 — Neuropsychology Review",
    href: "https://consensus.app/papers/details/174089e46f3a5c3194db0973d31764a8/",
  },
];

export default function SciencePage() {
  return (
    <div
      style={{
        padding: "60px 24px 100px",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "clamp(40px, 6vw, 56px)",
            fontWeight: 400,
            marginBottom: "20px",
            lineHeight: 1.08,
          }}
        >
          The research
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "17px",
            lineHeight: 1.75,
            margin: "0 0 12px",
          }}
        >
          Trataka is a traditional yogic practice with a small but growing body
          of research behind it. Early studies suggest it may support attention
          and reduce mind-wandering, though the evidence is still emerging and
          not yet definitive.
        </p>
      </div>

      {/* Findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "48px" }}>
        {findings.map((f) => (
          <div
            key={f.claim}
            className="glass-card"
            style={{ padding: "26px 28px" }}
          >
            <div
              style={{
                fontSize: "18px",
                fontFamily: '"Instrument Serif", Georgia, serif',
                marginBottom: "12px",
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              {f.claim}
            </div>

            <p
              style={{
                color: "var(--muted)",
                fontSize: "15px",
                lineHeight: 1.75,
                margin: "0 0 14px",
              }}
            >
              {f.detail}
            </p>

            <a
              href={f.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "13px",
                color: "var(--accent)",
                opacity: 0.7,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {f.citation} ↗
            </a>
          </div>
        ))}
      </div>

      {/* Closing reflection */}
      <div className="glass-card" style={{ padding: "32px 28px" }}>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "16px",
            lineHeight: 1.8,
            margin: "0 0 20px",
          }}
        >
          Most studies on trataka are small, short-term, and conducted without
          blinding. The reported effects are modest. The research is promising
          enough to take seriously, but not strong enough to support firm claims.
        </p>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "16px",
            lineHeight: 1.8,
            margin: "0 0 20px",
          }}
        >
          At the same time, meditation is best understood through direct
          experience. Notice what changes in your body, mind, attention, and
          daily life over time.
        </p>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "16px",
            lineHeight: 1.8,
            margin: "0 0 20px",
          }}
        >
          For that reason, we recommend practicing trataka for a 48-day mandala,
          then evaluating it for yourself. Results often compound slowly, and a
          daily practice can reveal more than a single session.
        </p>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "16px",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          Trataka is only one form of meditation. Yogic traditions describe many
          methods, and this is just one doorway. If it does not resonate with
          you, try another. The methods may differ, but the deeper aim is often
          the same: stability, clarity, focus, presence, and connection.
        </p>
      </div>
    </div>
  );
}

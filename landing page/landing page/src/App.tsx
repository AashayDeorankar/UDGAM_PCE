import { useEffect, useRef, useState } from "react";
import { SD } from "./data";
import { initScene } from "./scene";

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labs = useRef<HTMLDivElement[]>([]);
  const tags = useRef<HTMLDivElement[]>([]);
  const recLab = useRef<HTMLDivElement>(null);
  const aiLab = useRef<HTMLDivElement>(null);
  const [noGL, setNoGL] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const PIPELINE_STEPS = [
    { title: "JOB DESCRIPTION", subtitle: "Target Role & Requirements" },
    { title: "JD ANALYSIS", subtitle: "Extracting Core & Desired Competencies" },
    { title: "RESUME ANALYSIS", subtitle: "Parsing Parsed Experience & Skills" },
    { title: "SKILL NORMALIZATION", subtitle: "Ontology Alignment & Taxonomy Mapping" },
    { title: "EVIDENCE AGENT", subtitle: "Validating Proof Points & Project Impact" },
    { title: "MATCHING AGENT", subtitle: "Multi-factor Scoring & Relevance Fit" },
    { title: "NOISE DETECTION", subtitle: "Filtering Buzzwords & Unsupported Claims" },
    { title: "SHORTLIST", subtitle: "Ranked Candidate Recommendation" },
    { title: "INTERVIEW", subtitle: "Targeted Question Generation & Prep" }
  ];

  useEffect(() => {
    return initScene(
      rootRef.current!,
      {
        labs: labs.current,
        tags: tags.current,
        rec: recLab.current!,
        ai: aiLab.current!,
        onOpenPipeline: () => {
          setShowPipeline(true);
          setScanStep(0);
        }
      },
      () => setNoGL(true)
    );
  }, []);

  // Step scanning progress simulation when opened
  useEffect(() => {
    if (!showPipeline) return;
    setScanStep(0);
    const interval = setInterval(() => {
      setScanStep((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 700);
    return () => clearInterval(interval);
  }, [showPipeline, PIPELINE_STEPS.length]);

  return (
    <div id="sc" ref={rootRef}>
      <div id="st">
        <div id="cap"><h1></h1><p></p></div>
        <div id="scan" className="pill">
          <b>Aarav Sharma</b><br /><small style={{ color: "var(--mut)" }}>Resume 01 · scanning</small>
          <ul><li>Python</li><li>Machine Learning</li><li>SQL</li><li>TensorFlow</li><li className="q">AWS</li><li>Experience</li><li>Projects</li></ul>
        </div>
        <div id="dots"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div id="hint">Scroll</div>
        <div id="fin">
          <h2>AI-SELECTED CANDIDATES</h2>
          <p>3 candidates selected from 6 resumes</p>
          <div className="row3">
            <div className="fc pill"><div><small>#1</small><h3>Aarav Sharma</h3></div><div className="n">93%</div><ul><li>✓ Python</li><li>✓ Machine Learning</li><li>✓ SQL</li></ul></div>
            <div className="fc pill"><div><small>#2</small><h3>Priya Mehta</h3></div><div className="n">87%</div><ul><li>✓ Python</li><li>✓ Deep Learning</li><li style={{ color: "var(--wn)" }}>⚠ AWS Evidence Limited</li></ul></div>
            <div className="fc pill"><div><small>#3</small><h3>Rahul Verma</h3></div><div className="n">81%</div><ul><li>✓ SQL</li><li>✓ Machine Learning</li><li style={{ color: "var(--wn)" }}>⚠ Limited Experience</li></ul></div>
          </div>
          <p id="bye">Your shortlist is ready.</p>
        </div>

        {/* 3D overlay labels (created in script and appended to the stage in the original) */}
        {SD.map((d, i) => (
          <div key={"l" + i} className="t3 pill" ref={(el) => { if (el) labs.current[i] = el; }}>
            <b>{d[0]}</b><small>{d[1]}</small>
          </div>
        ))}
        <div className="t3 pill" ref={recLab}>
          <b>Sarah Wilson</b><small>Hiring Manager</small><span className="chip">AI / ML Engineer</span>
        </div>
        <div className="t3 ail" ref={aiLab}>RECRUIT AI</div>
        {SD.map((d, i) => (
          <div key={"t" + i} className="t3" ref={(el) => { if (el) tags.current[i] = el; }}>
            <span className={"vd " + (d[6] ? "s" : "x")}>{d[6] ? "SELECTED ✓" : "INSUFFICIENT EVIDENCE"}</span>
          </div>
        ))}
        {noGL && <p style={{ padding: "110px 24px" }}>3D is not available in this browser.</p>}

        {/* Pipeline flowchart modal */}
        {showPipeline && (
          <div className="pipeline-backdrop" onClick={() => setShowPipeline(false)}>
            <div className="pipeline-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pipeline-header">
                <div className="pipeline-title-group">
                  <span className="pipeline-badge">RECRUIT AI ENGINE</span>
                  <h2>Autonomous Talent Screening Architecture</h2>
                  <p>Real-time autonomous evaluation pipeline from Job Description to Interview Shortlist</p>
                </div>
                <button
                  className="pipeline-close-btn"
                  onClick={() => setShowPipeline(false)}
                  title="Close pipeline"
                >
                  ✕
                </button>
              </div>

              <div className="pipeline-flow">
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = idx < scanStep;
                  const isCurrent = idx === scanStep;
                  const isPending = idx > scanStep;

                  return (
                    <div key={step.title} className="pipeline-node-wrapper">
                      <div
                        className={`pipeline-card ${
                          isCurrent ? "current" : isDone ? "done" : "pending"
                        }`}
                      >
                        <div className="pipeline-card-indicator">
                          {isDone ? (
                            <span className="check">✓</span>
                          ) : isCurrent ? (
                            <span className="pulse-dot"></span>
                          ) : (
                            <span className="step-num">{idx + 1}</span>
                          )}
                        </div>
                        <div className="pipeline-card-content">
                          <div className="pipeline-card-top">
                            <span className="pipeline-card-title">{step.title}</span>
                          </div>
                          <span className="pipeline-card-sub">{step.subtitle}</span>
                        </div>
                        {isCurrent && (
                          <div className="scanning-pill-tag">
                            <span className="scan-radar-line"></span>
                            SCANNING
                          </div>
                        )}
                      </div>

                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className={`pipeline-arrow ${idx < scanStep ? "active" : ""}`}>
                          <div className="arrow-stem"></div>
                          <div className="arrow-head">▼</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pipeline-footer">
                <div className="pipeline-status">
                  <span className="status-indicator"></span>
                  {scanStep < PIPELINE_STEPS.length - 1
                    ? `Processing: ${PIPELINE_STEPS[scanStep].title}...`
                    : "✓ Full Pipeline Completed - 3 Candidates Shortlisted"}
                </div>
                <div className="pipeline-actions">
                  <button
                    className="restart-btn"
                    onClick={() => setScanStep(0)}
                  >
                    Restart Scan
                  </button>
                  <button
                    className="done-btn"
                    onClick={() => setShowPipeline(false)}
                  >
                    Close View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

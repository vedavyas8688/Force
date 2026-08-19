import { BrainCircuit, FileSearch, Sparkles } from "lucide-react";

export default function AiSummary() {
  return (
    <>
      <h1 className="page-title">AI Summary</h1>
      <p className="page-subtitle">AI analysis will summarize tickets after Git code context is connected.</p>

      <section className="settings-grid">
        <article className="panel stack-panel">
          <div className="module-heading">
            <FileSearch size={22} />
            <div>
              <h2>Code Context</h2>
              <p>Repository files, chunks, and embeddings will feed the ticket analysis workflow.</p>
            </div>
          </div>
          <div className="id-tag">NEEDS GIT SYNC</div>
        </article>

        <article className="panel stack-panel">
          <div className="module-heading">
            <BrainCircuit size={22} />
            <div>
              <h2>Ticket Diagnosis</h2>
              <p>Each ticket can store suspected files, summary, confidence, and suggested next steps.</p>
            </div>
          </div>
          <div className="id-tag">MODEL PIPELINE NEXT</div>
        </article>

        <article className="panel stack-panel">
          <div className="module-heading">
            <Sparkles size={22} />
            <div>
              <h2>Developer Handoff</h2>
              <p>AI output will appear on assigned tickets so developers can move faster with context.</p>
            </div>
          </div>
          <div className="id-tag">READY FOR PHASE 5</div>
        </article>
      </section>
    </>
  );
}

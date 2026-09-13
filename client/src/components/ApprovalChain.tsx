import type { ApprovalStep } from "../types";
import { IconCheckCircle } from "../icons";

export function ApprovalChain({ chain }: { chain: ApprovalStep[] }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <div className="card-title">Approval chain</div>
        </div>
      </div>
      <div className="card-body">
        {chain.map((step, i) => (
          <div className="chain-step" key={step.id}>
            <div className="chain-dot-col">
              <span className={`chain-dot ${step.state}`}>{step.state === "done" ? <IconCheckCircle /> : i + 1}</span>
              {i < chain.length - 1 && <span className="chain-connector" />}
            </div>
            <div className="chain-body">
              <div className="chain-role-row">
                <span className="chain-role">{step.role}</span>
                <span className={`chain-state-chip ${step.state}`}>
                  {step.state === "done" ? "Done" : step.state === "active" ? "Waiting on you" : "Not started"}
                </span>
              </div>
              <div className="chain-person">{step.person}</div>
              <div className="chain-note">{step.note}</div>
              {step.decidedAt && <div className="chain-decided">Approved {new Date(step.decidedAt).toLocaleString("th-TH")}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

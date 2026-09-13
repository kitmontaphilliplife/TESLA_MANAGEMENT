import { Fragment } from "react";
import type { RailSection } from "./SectionsRail";
import { IconCheck } from "../icons";

export function SectionStepper({ sections, active }: { sections: RailSection[]; active: string }) {
  function scrollTo(id: string) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="section-stepper">
      {sections.map((s, i) => (
        <Fragment key={s.id}>
          <button
            className={`stepper-item ${s.id === active ? "active" : ""} ${s.ready ? "ready" : ""}`}
            onClick={() => scrollTo(s.id)}
          >
            <span className={`stepper-dot ${s.ready ? "ready" : ""}`}>{s.ready && <IconCheck />}</span>
            <span className="stepper-label">{s.label}</span>
          </button>
          {i < sections.length - 1 && <span className="stepper-connector" />}
        </Fragment>
      ))}
    </div>
  );
}

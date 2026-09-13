import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { findPackageRow, log } from "./packages.js";

export const approvalsRouter = Router();

function serializeStep(row: any) {
  return {
    id: row.id,
    role: row.role,
    person: row.person,
    state: row.state,
    note: row.note,
    decidedAt: row.decided_at,
  };
}

function serializeComment(row: any) {
  return {
    id: row.id,
    sectionId: row.section_id,
    sectionLabel: row.section_label,
    author: row.author,
    body: row.body,
    createdAt: row.created_at,
    resolved: !!row.resolved,
  };
}

// Queue — every package that has ever been submitted (pending_approval / active / inactive),
// doubling as approval history once a decision has been made.
approvalsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, pr.name_th, pr.name_en, pr.category FROM packages p
       JOIN products pr ON pr.plan_code = p.plan_code
       WHERE p.status != 'draft'
       ORDER BY p.updated_at DESC`
    )
    .all() as any[];
  res.json(
    rows.map((r) => {
      const activeStep = db
        .prepare(`SELECT role FROM approval_steps WHERE package_id = ? AND state = 'active' ORDER BY step_order ASC LIMIT 1`)
        .get(r.id) as { role: string } | undefined;
      const openComments = (
        db.prepare(`SELECT COUNT(*) AS n FROM package_comments WHERE package_id = ? AND resolved = 0`).get(r.id) as { n: number }
      ).n;
      return {
        planCode: r.plan_code,
        nameTh: r.name_th,
        nameEn: r.name_en,
        category: r.category,
        status: r.status,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
        currentStep: activeStep?.role ?? null,
        openComments,
      };
    })
  );
});

// One package's approval chain, comments, and audit log.
approvalsRouter.get("/:planCode", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });

  const chain = (db.prepare(`SELECT * FROM approval_steps WHERE package_id = ? ORDER BY step_order ASC`).all(pkgRow.id) as any[]).map(
    serializeStep
  );
  const comments = (
    db.prepare(`SELECT * FROM package_comments WHERE package_id = ? ORDER BY created_at DESC`).all(pkgRow.id) as any[]
  ).map(serializeComment);
  const auditLog = db
    .prepare(`SELECT message, created_at FROM audit_log WHERE package_id = ? ORDER BY created_at DESC`)
    .all(pkgRow.id) as any[];

  res.json({
    planCode: pkgRow.plan_code,
    status: pkgRow.status,
    updatedAt: pkgRow.updated_at,
    updatedBy: pkgRow.updated_by,
    chain,
    comments,
    auditLog,
  });
});

// Approve (advance the chain, auto-publishing after Compliance) or send back to draft.
approvalsRouter.post("/:planCode/decision", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  const decision = req.body?.decision;
  if (decision !== "approve" && decision !== "changes") return res.status(400).json({ error: "invalid_decision" });

  const steps = db.prepare(`SELECT * FROM approval_steps WHERE package_id = ? ORDER BY step_order ASC`).all(pkgRow.id) as any[];
  const activeStep = steps.find((s) => s.state === "active");
  if (!activeStep) return res.status(409).json({ error: "no_active_step" });

  const now = new Date().toISOString();
  if (decision === "approve") {
    db.prepare(`UPDATE approval_steps SET state = 'done', decided_at = ? WHERE id = ?`).run(now, activeStep.id);
    if (activeStep.role === "Compliance") {
      const publishStep = steps.find((s) => s.role === "Publish");
      db.prepare(`UPDATE approval_steps SET state = 'done', decided_at = ? WHERE id = ?`).run(now, publishStep.id);
      db.prepare(`UPDATE packages SET status = 'active', updated_at = datetime('now') WHERE id = ?`).run(pkgRow.id);
      log(pkgRow.id, `[Approval] ${activeStep.role} อนุมัติ — Package ขึ้น Active แล้ว`);
    } else {
      const next = steps.find((s) => s.step_order === activeStep.step_order + 1);
      db.prepare(`UPDATE approval_steps SET state = 'active' WHERE id = ?`).run(next.id);
      log(pkgRow.id, `[Approval] ${activeStep.role} อนุมัติ — ส่งต่อให้ ${next.role}`);
    }
  } else {
    db.prepare(`UPDATE packages SET status = 'draft', updated_at = datetime('now') WHERE id = ?`).run(pkgRow.id);
    const openComments = (
      db.prepare(`SELECT COUNT(*) AS n FROM package_comments WHERE package_id = ? AND resolved = 0`).get(pkgRow.id) as { n: number }
    ).n;
    log(pkgRow.id, `[Approval] ${activeStep.role} ขอให้แก้ไข — ส่งกลับเป็น Draft (${openComments} comment ค้าง)`);
  }

  res.json({ ok: true });
});

approvalsRouter.post("/:planCode/comments", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  const { sectionId, sectionLabel, body } = req.body ?? {};
  if (!sectionId || !sectionLabel || !body) return res.status(400).json({ error: "missing_required_fields" });
  const id = nanoid(10);
  db.prepare(
    `INSERT INTO package_comments (id, package_id, section_id, section_label, author, body) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, pkgRow.id, sectionId, sectionLabel, "Phil (BA)", body);
  res.status(201).json(serializeComment({ id, section_id: sectionId, section_label: sectionLabel, author: "Phil (BA)", body, created_at: new Date().toISOString(), resolved: 0 }));
});

approvalsRouter.patch("/:planCode/comments/:id", (req, res) => {
  const pkgRow = findPackageRow(req.params.planCode);
  if (!pkgRow) return res.status(404).json({ error: "not_found" });
  const resolved = req.body?.resolved;
  db.prepare(`UPDATE package_comments SET resolved = ? WHERE id = ? AND package_id = ?`).run(resolved ? 1 : 0, req.params.id, pkgRow.id);
  res.json({ ok: true });
});

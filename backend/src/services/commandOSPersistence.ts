import type { CommandOSReportRecordInput, CommandOSSnapshotInput } from "../schemas.js";

export type CommandOSReportPersistenceRecord = CommandOSReportRecordInput & {
  reportCreatedAt: Date;
};

type ReportCarrier = {
  reportHistory?: unknown;
  reports?: unknown;
};

function isPlainReport(value: unknown): value is CommandOSReportRecordInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<CommandOSReportRecordInput>;

  return typeof report.id === "string"
    && typeof report.sourceEntityId === "string"
    && typeof report.destinationEntityId === "string"
    && typeof report.situation === "string"
    && typeof report.analysis === "string"
    && typeof report.recommendation === "string"
    && Array.isArray(report.nextActions)
    && typeof report.createdAt === "string";
}

export function dateFromCommandTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function collectCommandReports(state: CommandOSSnapshotInput["state"]): CommandOSReportPersistenceRecord[] {
  const byId = new Map<string, CommandOSReportPersistenceRecord>();
  const carriers: ReportCarrier[] = [...state.nodes, ...state.tasks];

  for (const carrier of carriers) {
    const reports = [
      ...(Array.isArray(carrier.reportHistory) ? carrier.reportHistory : []),
      ...(Array.isArray(carrier.reports) ? carrier.reports : [])
    ];

    for (const report of reports) {
      if (!isPlainReport(report)) continue;
      byId.set(report.id, {
        ...report,
        commanderId: report.commanderId ?? null,
        generalId: report.generalId ?? null,
        marshalId: report.marshalId ?? null,
        soldierId: report.soldierId ?? null,
        reportCreatedAt: dateFromCommandTimestamp(report.createdAt)
      });
    }
  }

  return [...byId.values()].sort((left, right) => right.reportCreatedAt.getTime() - left.reportCreatedAt.getTime()).slice(0, 100);
}

export function publicCommandOSSnapshot(input: {
  createdAt: Date;
  id: string;
  source: string;
  stateJson: string;
  stateVersion: number;
  updatedAt: Date;
}) {
  return {
    createdAt: input.createdAt,
    id: input.id,
    source: input.source,
    state: JSON.parse(input.stateJson) as CommandOSSnapshotInput["state"],
    stateVersion: input.stateVersion,
    updatedAt: input.updatedAt
  };
}

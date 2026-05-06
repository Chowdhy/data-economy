export type ResearcherDisplayStatus =
  | "pending"
  | "issues_raised"
  | "open"
  | "ongoing"
  | "closed"
  | "rejected";

export type ResearcherDisplayStatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "purple"
  | "muted";

export function getResearcherDisplayStatus(
  status: string,
  issueCount = 0,
): ResearcherDisplayStatus {
  if (status === "pending") {
    return issueCount > 0 ? "issues_raised" : "pending";
  }

  if (status === "complete" || status === "closed") {
    return "closed";
  }

  if (status === "open") {
    return "open";
  }

  if (status === "ongoing") {
    return "ongoing";
  }

  if (status === "rejected") {
    return "rejected";
  }

  return "pending";
}

export function getResearcherDisplayStatusMeta(
  displayStatus: ResearcherDisplayStatus,
): {
  label: string;
  tone: ResearcherDisplayStatusTone;
  description: string;
} {
  switch (displayStatus) {
    case "pending":
      return {
        label: "Pending",
        tone: "warning",
        description: "Awaiting approval.",
      };

    case "issues_raised":
      return {
        label: "Issues raised",
        tone: "danger",
        description: "A regulator has raised issues.",
      };

    case "open":
      return {
        label: "Open",
        tone: "purple",
        description: "Open for participants to join.",
      };

    case "ongoing":
      return {
        label: "Ongoing",
        tone: "success",
        description: "Collecting or analysing study data.",
      };

    case "closed":
      return {
        label: "Closed",
        tone: "neutral",
        description: "This study has finished.",
      };

    case "rejected":
      return {
        label: "Rejected",
        tone: "muted",
        description: "This study was rejected.",
      };
  }
}
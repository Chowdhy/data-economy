export type ResearcherDisplayStatus =
  | "awaiting_approval"
  | "changes_requested"
  | "open"
  | "ongoing"
  | "closed"
  | "rejected";

export function getResearcherDisplayStatus(
  status: string,
  issueCount = 0,
): ResearcherDisplayStatus {
  if (status === "pending") {
    return issueCount > 0 ? "changes_requested" : "awaiting_approval";
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

  return "awaiting_approval";
}

export function getResearcherDisplayStatusMeta(
  displayStatus: ResearcherDisplayStatus,
): {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  description: string;
} {
  switch (displayStatus) {
    case "awaiting_approval":
      return {
        label: "Awaiting approval",
        tone: "warning",
        description: "This study is waiting for regulator review.",
      };

    case "changes_requested":
      return {
        label: "Changes requested",
        tone: "danger",
        description:
          "A regulator has requested changes before this study can be approved.",
      };

    case "open":
      return {
        label: "Open",
        tone: "success",
        description:
          "This study is approved and open for participant data collection.",
      };

    case "ongoing":
      return {
        label: "Ongoing",
        tone: "neutral",
        description:
          "Data collection has ended and the research period is ongoing.",
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
        tone: "danger",
        description: "This study was rejected.",
      };
  }
}
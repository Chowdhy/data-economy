import { Link } from "react-router";

import { mockParticipantStudies } from "~/data/mockParticipantStudies";

export default function ParticipantDashboard() {
  return (
    <div>
      <h1>Participant Dashboard</h1>

      <h2>These are the fake studies:</h2>
      <ul>
        {mockParticipantStudies.map((study) => (
          <li key={study.id}>
            {study.title}
            {study.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

{
  /* <Link to={`/participant/study/${study.id}`}>{study.title}</Link> —{" "} */
}

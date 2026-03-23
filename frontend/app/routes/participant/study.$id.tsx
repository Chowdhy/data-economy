import { useParams } from "react-router";
import { Link } from "react-router";
import { mockParticipantStudies } from "../../data/mockParticipantStudies";

export default function ParticipantStudyDetail() {
  const { id } = useParams();

  const study = mockParticipantStudies.find((s) => s.id === id);

  if (!study) {
    return (
      <div>
        <h1>Study not found</h1>
        <Link to="/participant/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{study.title}</h1>
      <p>Status: {study.status}</p>

      <Link to="/participant/dashboard">Back to dashboard</Link>
    </div>
  );
}

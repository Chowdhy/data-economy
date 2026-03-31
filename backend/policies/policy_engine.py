import json
import os

class PolicyEngine:
    # Load .json file: 
    def __init__(self, policy_file):
        with open(policy_file, "r") as f:
            self.policies = json.load(f)["policies"]

    def is_allowed(self, action, context):
        for policy in self.policies:
            if policy.get("action") != action:
                continue

        
            constraints = policy.get("constraints", [])
            matches = self._check_constraints(constraints, context)
            # Prohibition check (deny if a match is found):
            if policy.get("permission") is False and matches:
                return False
            # Permission check (allow if a match is found):
            if policy.get("permission") is True and not matches:
                return False
            # Duty check (must satisfy):
            if policy.get("duty"):
                if policy.get("duty") and not matches:
                    return False

        return True

    def _check_constraints(self, constraints, context):
        for c in constraints:
            field = c["field"]
            operator = c["operator"]
            value = c["value"]

            context_value = context.get(field)

            if operator == "eq" and context_value != value:
                return False
            if operator == "neq" and context_value == value:
                return False

        return True


# Loading helper: 
def get_policy_engine():
    base_dir = os.path.dirname(__file__)
    policy_path = os.path.join(base_dir, "policies.json")
    return PolicyEngine(policy_path)
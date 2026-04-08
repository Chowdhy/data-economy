import json
import os

# Class PolicyDecision functionality: 
# - Encapsulates the result of a policy evaluation, including whether the action is allowed, which permissions and prohibitions matched, any duties that need to be fulfilled, and any failures that occurred during evaluation.
class PolicyDecision:
    def __init__(self, allowed=False, matched_permissions=None, matched_prohibitions=None, duties=None, failures=None):
        self.allowed = allowed
        self.matched_permissions = matched_permissions or []
        self.matched_prohibitions = matched_prohibitions or []
        self.duties = duties or []
        self.failures = failures or []

    def to_dict(self):
        return {
            "allowed": self.allowed,
            "matched_permissions": self.matched_permissions,
            "matched_prohibitions": self.matched_prohibitions,
            "duties": self.duties,
            "failures": self.failures,
        }


# Class PolicyEngine functionality:
# - Loads policies from a JSON file and evaluates whether a given action is allowed or denied based on the provided context.
# - The evaluation process checks for matching prohibitions first (which deny the action), then checks for matching permissions (which allow the action if no prohibitions matched), and finally checks any associated duties that must be fulfilled for the permissions to be valid.
# - The engine supports various constraint operators (e.g., eq, neq, lt, lte, gt, gte, in, notIn, contains, exists) to evaluate conditions against the context.
class PolicyEngine:
    def __init__(self, policy_file):
        with open(policy_file, "r") as f:
            payload = json.load(f)
        self.policy_sets = payload.get("policySets", [])

    def evaluate(self, action, context):
        matched_permissions = []
        matched_prohibitions = []
        unmet_duties = []

        for policy_set in self.policy_sets:
            for prohibition in policy_set.get("prohibition", []):
                if prohibition.get("action") != action:
                    continue
                if self._rule_matches(prohibition, context):
                    matched_prohibitions.append(prohibition["uid"])

            for permission in policy_set.get("permission", []):
                if permission.get("action") != action:
                    continue
                if self._rule_matches(permission, context):
                    matched_permissions.append(permission["uid"])

                    for duty in permission.get("duty", []):
                        if not self._duty_satisfied(duty, context):
                            unmet_duties.append({
                                "permission": permission["uid"],
                                "duty": duty.get("action", "unknownDuty")
                            })

        if matched_prohibitions:
            return PolicyDecision(
                allowed=False,
                matched_permissions=matched_permissions,
                matched_prohibitions=matched_prohibitions,
                duties=unmet_duties,
                failures=["matched prohibition"]
            )

        if not matched_permissions:
            return PolicyDecision(
                allowed=False,
                matched_permissions=[],
                matched_prohibitions=[],
                duties=[],
                failures=["no matching permission"]
            )

        if unmet_duties:
            return PolicyDecision(
                allowed=False,
                matched_permissions=matched_permissions,
                matched_prohibitions=[],
                duties=unmet_duties,
                failures=["unmet duty"]
            )

        return PolicyDecision(
            allowed=True,
            matched_permissions=matched_permissions,
            matched_prohibitions=[],
            duties=[],
            failures=[]
        )

    def is_allowed(self, action, context):
        return self.evaluate(action, context).allowed

    def _rule_matches(self, rule, context):
        constraints = rule.get("constraint", [])
        return self._check_constraints(constraints, context)

    def _duty_satisfied(self, duty, context):
        constraints = duty.get("constraint", [])
        return self._check_constraints(constraints, context)

    def _check_constraints(self, constraints, context):
        for c in constraints:
            left = c["leftOperand"]
            op = c["operator"]
            right = c["rightOperand"]

            left_value = self._resolve_context_value(context, left)

            if op == "eq" and left_value != right:
                return False
            if op == "neq" and left_value == right:
                return False
            if op == "lt" and not (left_value < right):
                return False
            if op == "lte" and not (left_value <= right):
                return False
            if op == "gt" and not (left_value > right):
                return False
            if op == "gte" and not (left_value >= right):
                return False
            if op == "in" and left_value not in right:
                return False
            if op == "notIn" and left_value in right:
                return False
            if op == "contains" and right not in left_value:
                return False
            if op == "exists":
                exists = left_value is not None
                if exists != right:
                    return False

        return True

    def _resolve_context_value(self, context, path):
        current = context
        for part in path.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
        return current


# Helper function to initialize the policy engine with the policies.json file
def get_policy_engine():
    base_dir = os.path.dirname(__file__)
    policy_path = os.path.join(base_dir, "policies.json")
    return PolicyEngine(policy_path)
import json
import os


class PolicyDecision:
    """The outcome of evaluating an action against the policy engine.
    Captures whether the action was allowed, which permission and
    prohibition rules matched, any duties that were not satisfied, and
    any high-level failure reasons describing why a denial occurred.
    """
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



class PolicyEngine:
    """Evaluates actions against a set of ODRL-style policies loaded from policies.json.
    A decision is taken by:
      1. Collecting every prohibition rule that targets the action and
         whose constraints match the context. Any match denies.
      2. Collecting every permission rule that targets the action and
         whose constraints match the context.
      3. For each matched permission, checking that every associated duty
         is satisfied by the context.
    The action is allowed only if at least one permission matched, no
    prohibition matched, and every duty on the matched permissions is
    satisfied. Constraint operators that are used are eq, neq, lt, lte, gt,
    gte, in, notIn, contains and exists.
    """
    def __init__(self, policy_file):
        with open(policy_file, "r") as f:
            payload = json.load(f)
        self.policy_sets = payload.get("policySets", [])

    def evaluate(self, action, context):
        matched_permissions = []
        matched_prohibitions = []
        unmet_duties = []

        for policy_set in self.policy_sets:
            # Prohibitions, any match means the action will be denied:
            for prohibition in policy_set.get("prohibition", []):
                if prohibition.get("action") != action:
                    continue
                if self._rule_matches(prohibition, context):
                    matched_prohibitions.append(prohibition["uid"])

            # Permissions, collect matches and check their duties: 
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
        # Any matched prohibition wins over permissions: 
        if matched_prohibitions:
            return PolicyDecision(
                allowed=False,
                matched_permissions=matched_permissions,
                matched_prohibitions=matched_prohibitions,
                duties=unmet_duties,
                failures=["matched prohibition"]
            )
        # Without a positive match, the action is not allowed:
        if not matched_permissions:
            return PolicyDecision(
                allowed=False,
                matched_permissions=[],
                matched_prohibitions=[],
                duties=[],
                failures=["no matching permission"]
            )
        # Permission matched but a required duty is unmet: 
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
        """Wrapper around "evaluate" returning only the boolean outcome."""
        return self.evaluate(action, context).allowed

    def _rule_matches(self, rule, context):
        """True if every constraint on "rule" is satisfied by "context"."""
        constraints = rule.get("constraint", [])
        return self._check_constraints(constraints, context)

    def _duty_satisfied(self, duty, context):
        """True if every constraint on "duty" is satisfied by "context"."""
        constraints = duty.get("constraint", [])
        return self._check_constraints(constraints, context)

    def _check_constraints(self, constraints, context):
        """Evaluate a list of constraints with AND semantics.
 
        Each constraint is a {leftOperand, operator, rightOperand} triple
        where leftOperand is a dotted path resolved against context".
        Returns True only if every constraint passes; an empty list passes
        trivially.
        """
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
        """Handles nested dicts in "context".
        Returns None if any segment is missing or traverses a non-dict
        value, so missing keys never raise.
        """
        current = context
        for part in path.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
        return current


def get_policy_engine():
    """Build a PolicyEngine from "policies.json" next to this module."""
    base_dir = os.path.dirname(__file__)
    policy_path = os.path.join(base_dir, "policies.json")
    return PolicyEngine(policy_path)

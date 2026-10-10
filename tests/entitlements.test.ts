import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePlans, isTrialPlan, tenantHasAccess } from "../lib/platform/plans";

describe("plans", () => {
  it("parses entitlements with defaults", () => {
    const plans = parsePlans([{ key: "pro", label: "Pro" }]);
    assert.equal(plans[0].maxUsers, 50);
    assert.equal(plans[0].allowApiAccess, true);
  });

  it("identifies trial keys", () => {
    assert.equal(isTrialPlan("trial"), true);
    assert.equal(isTrialPlan("pro"), false);
  });
});

describe("access", () => {
  it("allows active subscription even after trial", () => {
    assert.equal(
      tenantHasAccess({
        planKey: "trial",
        trialEndsAt: new Date(Date.now() - 1000),
        hasActiveSubscription: true,
      }),
      true
    );
  });

  it("allows in-window trial without subscription", () => {
    assert.equal(
      tenantHasAccess({
        planKey: "trial",
        trialEndsAt: new Date(Date.now() + 86400000),
        hasActiveSubscription: false,
      }),
      true
    );
  });

  it("denies paid badge without subscription or trial", () => {
    assert.equal(
      tenantHasAccess({
        planKey: "pro",
        trialEndsAt: null,
        hasActiveSubscription: false,
      }),
      false
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  BUCKET_LABEL_PREFIX,
  bucketCardLabel,
  bucketForProfile,
  listBuckets,
  profileForBucket,
  spandaBucketProfileIds,
} from "@/lib/bucket-profile";

describe("spandaBucketProfileIds", () => {
  it("is exactly the 4 spanda profiles in surface order", () => {
    expect(spandaBucketProfileIds()).toEqual([
      "do",
      "coordinate",
      "followup",
      "decide",
    ]);
  });

  it("returns a fresh array each call (no shared mutable state)", () => {
    const first = spandaBucketProfileIds();
    first.push("autopilot");
    expect(spandaBucketProfileIds()).toEqual([
      "do",
      "coordinate",
      "followup",
      "decide",
    ]);
  });
});

describe("profileForBucket", () => {
  it("maps work:* bucket labels to the profile id", () => {
    expect(profileForBucket("work:do")).toBe("do");
    expect(profileForBucket("work:coordinate")).toBe("coordinate");
    expect(profileForBucket("work:followup")).toBe("followup");
    expect(profileForBucket("work:decide")).toBe("decide");
  });

  it("tolerates a bare profile id without the work: prefix", () => {
    expect(profileForBucket("do")).toBe("do");
    expect(profileForBucket("coordinate")).toBe("coordinate");
    expect(profileForBucket("followup")).toBe("followup");
    expect(profileForBucket("decide")).toBe("decide");
  });

  it("normalizes case and surrounding whitespace (locked policy)", () => {
    expect(profileForBucket("work:Do")).toBe("do");
    expect(profileForBucket("WORK:DO")).toBe("do");
    expect(profileForBucket("  work:do  ")).toBe("do");
    expect(profileForBucket("Do")).toBe("do");
  });

  it("throws FOOLERY-style on an unknown bucket, naming bad value + valid set", () => {
    let message = "";
    try {
      profileForBucket("work:autopilot");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("FOOLERY");
    expect(message).toContain("work:autopilot");
    expect(message).toContain("work:do");
    expect(message).toContain("work:decide");
  });

  it("throws on a bare unknown id (e.g. autopilot)", () => {
    expect(() => profileForBucket("autopilot")).toThrow(/FOOLERY/);
  });

  it("throws on an empty string", () => {
    expect(() => profileForBucket("")).toThrow(/FOOLERY/);
    expect(() => profileForBucket("   ")).toThrow(/FOOLERY/);
  });

  it("throws on a non-bucket label namespace", () => {
    expect(() => profileForBucket("with:khilan")).toThrow(/FOOLERY/);
  });
});

describe("bucketForProfile", () => {
  it("maps the 4 spanda profile ids to work:* bucket labels", () => {
    expect(bucketForProfile("do")).toBe("work:do");
    expect(bucketForProfile("coordinate")).toBe("work:coordinate");
    expect(bucketForProfile("followup")).toBe("work:followup");
    expect(bucketForProfile("decide")).toBe("work:decide");
  });

  it("normalizes case and whitespace", () => {
    expect(bucketForProfile("Do")).toBe("work:do");
    expect(bucketForProfile("  DECIDE ")).toBe("work:decide");
  });

  it("throws FOOLERY-style for ids outside the spanda 4", () => {
    let message = "";
    try {
      bucketForProfile("autopilot");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("FOOLERY");
    expect(message).toContain("autopilot");
    expect(message).toContain("do");
    expect(message).toContain("decide");
  });

  it("throws on empty / blank", () => {
    expect(() => bucketForProfile("")).toThrow(/FOOLERY/);
    expect(() => bucketForProfile("  ")).toThrow(/FOOLERY/);
  });

  it("round-trips identity for each of the 4 buckets", () => {
    for (const id of spandaBucketProfileIds()) {
      expect(profileForBucket(bucketForProfile(id))).toBe(id);
    }
  });

  it("round-trips identity for each bucket label", () => {
    for (const label of listBuckets()) {
      expect(bucketForProfile(profileForBucket(label))).toBe(label);
    }
  });
});

describe("listBuckets", () => {
  it("returns the 4 work:* bucket labels in surface order", () => {
    expect(listBuckets()).toEqual([
      "work:do",
      "work:coordinate",
      "work:followup",
      "work:decide",
    ]);
  });

  it("excludes upstream (non-spanda) profiles", () => {
    const buckets = listBuckets();
    expect(buckets).not.toContain("work:autopilot");
    expect(buckets).not.toContain("work:semiauto");
  });

  it("uses the canonical work: prefix", () => {
    for (const label of listBuckets()) {
      expect(label.startsWith(BUCKET_LABEL_PREFIX)).toBe(true);
    }
  });

  it("returns a fresh array each call", () => {
    const first = listBuckets();
    first.push("work:bogus");
    expect(listBuckets()).toHaveLength(4);
  });
});

describe("bucketCardLabel", () => {
  it("returns the display form for the single work:* label", () => {
    expect(bucketCardLabel(["work:do"])).toBe("Do");
    expect(bucketCardLabel(["work:coordinate"])).toBe("Coordinate");
    expect(bucketCardLabel(["work:followup"])).toBe("Follow-up");
    expect(bucketCardLabel(["work:decide"])).toBe("Decide");
  });

  it("picks the work:* label out of a mixed label set", () => {
    expect(
      bucketCardLabel(["project:agent-studio", "work:followup", "with:khilan"]),
    ).toBe("Follow-up");
  });

  it("returns null when there is no work:* label", () => {
    expect(bucketCardLabel([])).toBeNull();
    expect(bucketCardLabel(["project:personal", "with:khilan"])).toBeNull();
  });

  it("returns null for an unknown work:* label (data outside the 4)", () => {
    expect(bucketCardLabel(["work:autopilot"])).toBeNull();
  });

  it("ignores blank / malformed bucket labels", () => {
    expect(bucketCardLabel(["work:"])).toBeNull();
  });

  it("deterministically picks the surface-first bucket when two work:* labels exist", () => {
    // do precedes followup in surface order regardless of input order.
    expect(bucketCardLabel(["work:followup", "work:do"])).toBe("Do");
    expect(bucketCardLabel(["work:do", "work:followup"])).toBe("Do");
    expect(bucketCardLabel(["work:decide", "work:coordinate"])).toBe(
      "Coordinate",
    );
  });

  it("tolerates case/whitespace in stored labels", () => {
    expect(bucketCardLabel(["WORK:DO"])).toBe("Do");
    expect(bucketCardLabel([" work:decide "])).toBe("Decide");
  });
});

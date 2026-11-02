import { describe, expect, it } from "vitest";
import { isSameProduct, numericSignature, trackingQuery } from "@/lib/naver";
import { cleanTitle } from "@/lib/format";

describe("title helpers", () => {
  it("strips Naver <b> tags and entities", () => {
    expect(cleanTitle("<b>하기스</b> 네이처메이드 &amp; 4단계")).toBe("하기스 네이처메이드 & 4단계");
  });
  it("tracking query drops bracketed promo text", () => {
    expect(trackingQuery("[무료배송] 하기스 네이처메이드 밴드형 4단계 (특가)")).toBe("하기스 네이처메이드 밴드형 4단계");
  });
});

describe("isSameProduct", () => {
  const t = "하기스 네이처메이드 밴드형 4단계 남녀공용 56매 3팩";
  it("matches same product from another mall with reordered words", () => {
    expect(isSameProduct(t, "[하기스] 네이처메이드 밴드형 4단계 56매 3팩 남녀공용")).toBe(true);
  });
  it("rejects different stage / count", () => {
    expect(isSameProduct(t, "하기스 네이처메이드 밴드형 5단계 남녀공용 56매 3팩")).toBe(false);
    expect(isSameProduct(t, "하기스 네이처메이드 밴드형 4단계 남녀공용 56매 4팩")).toBe(false);
  });
  it("rejects unrelated product with same numbers", () => {
    expect(isSameProduct(t, "팸퍼스 베이비드라이 4단계 56매 3팩")).toBe(false);
  });
  it("numeric signature normalizes spacing", () => {
    expect(numericSignature("800 g 3 팩")).toBe(numericSignature("800g 3팩"));
  });
});

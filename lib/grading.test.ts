import { describe, expect, it } from "vitest";
import { gradeOne, normalize, summarize } from "./grading";

describe("normalize", () => {
  it("동그라미 숫자와 일반 숫자를 같게 본다", () => {
    expect(normalize("③")).toBe(normalize("3"));
  });
  it("공백·전각·괄호·마침표를 무시한다", () => {
    expect(normalize(" （４） ")).toBe("4");
    expect(normalize("x = 2.")).toBe("x=2");
  });
  it("복수 정답 순서를 무시한다", () => {
    expect(normalize("②, ④")).toBe(normalize("4,2"));
  });
});

describe("gradeOne", () => {
  it("정답/오답/미응답", () => {
    expect(gradeOne("③", "3")).toBe("correct");
    expect(gradeOne("③", "2")).toBe("wrong");
    expect(gradeOne("③", "  ")).toBe("unanswered");
    expect(gradeOne("Apple", "apple")).toBe("correct");
  });
});

describe("summarize", () => {
  it("맞은 개수와 전체 개수", () => {
    expect(summarize(["correct", "wrong", "unanswered", "correct"])).toEqual({ score: 2, total: 4 });
  });
});

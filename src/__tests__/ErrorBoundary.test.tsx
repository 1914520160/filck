import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function BrokenComponent(): React.ReactElement {
  throw new Error("Test crash");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello World")).toBeDefined();
  });

  it("renders error UI when child crashes", () => {
    // Suppress console.error for expected crash
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("界面渲染异常")).toBeDefined();
    expect(screen.getByText("Test crash")).toBeDefined();

    spy.mockRestore();
  });

  it("shows retry button on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("🔄 重试渲染")).toBeDefined();

    spy.mockRestore();
  });
});

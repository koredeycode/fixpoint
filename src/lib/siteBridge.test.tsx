import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EMPTY_STATE, useSiteState } from "./siteBridge";

function Probe() {
  const state = useSiteState();
  return <output>{state.kit.version}</output>;
}

describe("useSiteState", () => {
  it("falls back to an empty state when the bridge is absent", () => {
    render(<Probe />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("reads the shared store through window.__FIXPOINT__", () => {
    window.__FIXPOINT__ = {
      getState: () => ({ ...EMPTY_STATE, kit: { items: [], version: 7 } }),
      subscribe: () => () => {},
      page: {},
    };
    render(<Probe />);
    expect(screen.getByText("7")).toBeInTheDocument();
    delete window.__FIXPOINT__;
  });
});

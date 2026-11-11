import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./avatar";

describe("UserAvatar", () => {
  it("shows initials from the first and last name", () => {
    render(<UserAvatar name="  ada   lovelace byron " />);

    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("uses a question mark when the name is missing", () => {
    render(<UserAvatar />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

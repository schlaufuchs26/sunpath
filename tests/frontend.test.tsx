import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../frontend";

function startGame() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
}

function submitGuess() {
  fireEvent.click(screen.getByRole("button", { name: "Submit guess" }));
}

function advance() {
  const button = screen.queryByRole("button", { name: "Next round" })
    ? screen.getByRole("button", { name: "Next round" })
    : screen.getByRole("button", { name: "See results" });
  fireEvent.click(button);
}

describe("App", () => {
  test("explains the game before the first round", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Sunpath/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("starts a round with a chart and a dial", () => {
    startGame();
    expect(screen.getByText("Round 1 / 8")).toBeVisible();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByLabelText("Your latitude guess")).toBeInTheDocument();
    expect(screen.getByText("40.0° N")).toBeVisible();
  });

  test("the dial moves the guess", () => {
    startGame();
    fireEvent.change(screen.getByLabelText("Your latitude guess"), {
      target: { value: "-33.5" },
    });
    expect(screen.getByText("33.5° S")).toBeVisible();
  });

  test("the overlay draws and hides the player's curve", () => {
    startGame();
    expect(screen.queryByTestId("guess-curve")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Overlay my curve/ }));
    expect(screen.getByTestId("guess-curve")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hide my curve/ }));
    expect(screen.queryByTestId("guess-curve")).toBeNull();
  });

  test("the clue names a latitude band and cannot be bought twice", () => {
    startGame();
    fireEvent.click(screen.getByRole("button", { name: /^Clue/ }));
    expect(screen.getByText(/^Clue: This place/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Clue shown" })).toBeDisabled();
  });

  test("a submitted guess is scored and revealed", () => {
    startGame();
    fireEvent.change(screen.getByLabelText("Your latitude guess"), {
      target: { value: "60" },
    });
    submitGuess();
    expect(screen.getByText(/off,/)).toBeVisible();
    expect(screen.getByText(/Longest day:/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Next round" })).toBeVisible();
  });

  test("eight rounds end in a summary that can be replayed", () => {
    startGame();
    for (let round = 1; round <= 8; round++) {
      if (round === 1) {
        fireEvent.click(
          screen.getByRole("button", { name: /Overlay my curve/ }),
        );
        fireEvent.click(screen.getByRole("button", { name: /^Clue/ }));
      }
      fireEvent.change(screen.getByLabelText("Your latitude guess"), {
        target: { value: "10" },
      });
      submitGuess();
      advance();
    }

    expect(screen.getByRole("heading", { name: "Result" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(9);
    expect(
      screen.queryByRole("button", { name: /Overlay my curve/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(screen.getByText("Round 1 / 8")).toBeVisible();
  });
});

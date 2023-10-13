import userEvent from "@testing-library/user-event";
import { checkNotNull } from "metabase/core/utils/types";
import { getIcon, render, screen } from "__support__/ui";
import { createMockEntitiesState } from "__support__/store";
import { getMetadata } from "metabase/selectors/metadata";
import type { Expression } from "metabase-types/api";
import { createMockState } from "metabase-types/store/mocks";
import {
  createSampleDatabase,
  ORDERS_ID,
} from "metabase-types/api/mocks/presets";
import { ExpressionWidgetHeader } from "./ExpressionWidgetHeader";
import type { ExpressionWidgetProps } from "./ExpressionWidget";
import { ExpressionWidget } from "./ExpressionWidget";

describe("ExpressionWidget", () => {
  it("should render proper controls", () => {
    setup();

    expect(screen.getByText("Expression")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("should not render Name field", () => {
    setup();

    expect(screen.queryByText("Name")).not.toBeInTheDocument();
  });

  it("should render help icon with tooltip which opens documentation page", () => {
    setup();

    const icon = getIcon("info");
    expect(icon).toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: "Open expressions documentation",
    });
    expect(link).toBeInTheDocument();

    expect(link).toHaveAttribute(
      "href",
      "https://www.metabase.com/docs/latest/questions/query-builder/expressions.html",
    );

    userEvent.hover(link);

    expect(
      screen.getByText(
        "You can reference columns here in functions or equations, like: floor([Price] - [Discount]). Click for documentation.",
      ),
    ).toBeInTheDocument();
  });

  it("should trigger onChangeExpression if expression is valid", () => {
    const { onChangeExpression } = setup();

    const doneButton = screen.getByRole("button", { name: "Done" });
    expect(doneButton).toBeDisabled();

    const expressionInput = screen.getByRole("textbox");
    expect(expressionInput).toHaveClass("ace_text-input");

    userEvent.type(expressionInput, "1 + 1");
    userEvent.tab();

    expect(doneButton).toBeEnabled();

    userEvent.click(doneButton);

    expect(onChangeExpression).toHaveBeenCalledTimes(1);
    expect(onChangeExpression).toHaveBeenCalledWith("", ["+", 1, 1]);
  });

  it(`should render interactive header if it is passed`, () => {
    const mockTitle = "Some Title";
    const onClose = jest.fn();
    setup({
      header: <ExpressionWidgetHeader title={mockTitle} onBack={onClose} />,
      onClose,
    });

    const titleEl = screen.getByText(mockTitle);
    expect(titleEl).toBeInTheDocument();

    userEvent.click(titleEl);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("withName=true", () => {
    it("should render Name field", () => {
      setup({ withName: true });

      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("should validate name value", () => {
      const expression: Expression = ["+", 1, 1];
      const { onChangeExpression } = setup({ expression, withName: true });

      const doneButton = screen.getByRole("button", { name: "Done" });

      expect(doneButton).toBeDisabled();

      userEvent.type(screen.getByDisplayValue("1 + 1"), "{enter}");

      // enter in expression editor should not trigger "onChangeExpression" as popover is not valid with empty "name"
      expect(onChangeExpression).toHaveBeenCalledTimes(0);

      // Type characters with lowercase, uppercase, numbers, and special characters
      userEvent.type(
        screen.getByPlaceholderText("Something nice and descriptive"),
        "Some n_am!e for-expression_123!@#$%^&*()Zxcbyut",
      );

      expect(doneButton).toBeEnabled();

      userEvent.click(doneButton);

      // Spaces must be removed from the name
      expect(onChangeExpression).toHaveBeenCalledTimes(1);
      expect(onChangeExpression).toHaveBeenCalledWith(
        "Somen_am!efor-expression_123!@#$%^&*()Zxcbyut",
        expression,
      );

      // Paste text with spaces
      userEvent.paste(
        screen.getByPlaceholderText("Something nice and descriptive"),
        " added- another pasted text",
      );

      userEvent.click(doneButton);

      // Pasted text must be added to the previous name
      // and its spaces must be removed
      expect(onChangeExpression).toHaveBeenCalledTimes(2);
      expect(onChangeExpression).toHaveBeenCalledWith(
        "Somen_am!efor-expression_123!@#$%^&*()Zxcbyutadded-anotherpastedtext",
        expression,
      );
    });
  });
});

const createMockQueryForExpressions = () => {
  const state = createMockState({
    entities: createMockEntitiesState({
      databases: [createSampleDatabase()],
    }),
  });

  const metadata = getMetadata(state);
  const query = checkNotNull(metadata.table(ORDERS_ID)).query();

  return query;
};

function setup(additionalProps?: Partial<ExpressionWidgetProps>) {
  const mocks = {
    onClose: jest.fn(),
    onChangeExpression: jest.fn(),
  };

  const props = {
    expression: undefined,
    name: undefined,
    query: createMockQueryForExpressions(),
    reportTimezone: "UTC",
    ...mocks,
    ...additionalProps,
  };

  render(<ExpressionWidget {...props} />);

  return mocks;
}

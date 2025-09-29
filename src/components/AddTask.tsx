/** @jsxImportSource @emotion/react */
import React, { FormEventHandler } from "react";
import { css } from "@emotion/react";

export interface AddTaskComponentProps {
  handleNewItem: FormEventHandler;
}

const container = css`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  gap: 12px;
`;

const form = css`
  flex: 1;
`;

const textField = css`
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--accent);
  }

  &::placeholder {
    color: var(--muted);
  }
`;

const addButton = css`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const AddTaskComponent = React.forwardRef<
  HTMLInputElement,
  AddTaskComponentProps
>(({ handleNewItem }, ref) => {
  return (
    <div css={container}>
      <form css={form} onSubmit={handleNewItem} id="add-task-form">
        <input
          css={textField}
          placeholder="New Item"
          autoFocus
          autoComplete="on"
          autoCapitalize="words"
          ref={ref}
        />
      </form>
      <button css={addButton} type="submit" form="add-task-form">
        +
      </button>
    </div>
  );
});

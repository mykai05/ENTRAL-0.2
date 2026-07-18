import React, { type InputHTMLAttributes, type Ref, useId } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
};

export function TextField({ id, label, error, inputRef, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId.replaceAll(":", "")}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} ref={inputRef} {...props} />
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

import { useState, useCallback } from "react";

export type ValidatorFn<T> = (value: T) => string | null;
export type Validators<T extends Record<string, any>> = {
  [K in keyof T]?: ValidatorFn<T[K]>;
};

export default function useFormFields<T extends Record<string, any>>(
  initialValues: T,
  validators: Validators<T> = {}
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>(() => {
    const errs = {} as Record<keyof T, string | null>;
    for (const key in initialValues) {
      errs[key as keyof T] = null;
    }
    return errs;
  });

  const handleChange = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      const validate = validators[field];
      if (validate) {
        setErrors((prev) => ({ ...prev, [field]: validate(value) }));
      }
    },
    [validators]
  );

  const validateAll = useCallback(() => {
    let valid = true;
    const newErrors = {} as Record<keyof T, string | null>;
    for (const key in values) {
      const validator = validators[key];
      const value = values[key];
      const error = validator ? validator(value) : null;
      newErrors[key as keyof T] = error;
      if (error) valid = false;
    }
    setErrors(newErrors);
    return valid;
  }, [values, validators]);

  return { values, errors, handleChange, setValues, validateAll };
}
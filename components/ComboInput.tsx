"use client";

import { useId } from "react";

/** 엑셀 드롭다운처럼 목록에서 고르거나 새 값을 직접 입력 */
export function ComboInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{props.label}</span>
      <input
        list={id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder ?? "선택 또는 직접 입력"}
        required={props.required}
        className="input"
      />
      <datalist id={id}>
        {props.options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}

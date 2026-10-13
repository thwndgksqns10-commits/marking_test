"use client";

import { useRef } from "react";

/** 휴대폰에서는 카메라가 바로 열리고, PC에서는 파일 선택 */
export function PhotoUploader(props: { onPick: (file: File) => void; disabled?: boolean; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onPick(f);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn-primary w-full py-4 text-base" disabled={props.disabled} onClick={() => ref.current?.click()}>
        📷 {props.label}
      </button>
    </>
  );
}

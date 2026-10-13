"use client";

import { useParams } from "next/navigation";
import { CaptureStep } from "@/components/CaptureStep";

export default function AnswerKeyPage() {
  const { id } = useParams<{ id: string }>();
  return <CaptureStep sessionId={id} kind="answer" />;
}

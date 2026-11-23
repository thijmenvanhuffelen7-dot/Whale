"use client";
import { CountUp } from "@/components/ui/count-up";
import { formatUsd } from "@/lib/format";

const int = new Intl.NumberFormat("nl-NL");

export function CountUpUsd({ value }: { value: number }) {
  return <CountUp value={value} format={(n) => formatUsd(n)} />;
}
export function CountUpInt({ value }: { value: number }) {
  return <CountUp value={value} format={(n) => int.format(Math.round(n))} />;
}

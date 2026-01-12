import React from "react";

export function OptimizedComponent({ name }: { name: string }) {
  return <div>Hello, {name}!</div>;
}

export function AnotherOptimized({ count }: { count: number }) {
  const doubled = count * 2;
  return <span>{doubled}</span>;
}

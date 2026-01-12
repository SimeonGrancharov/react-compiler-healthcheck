import React, { useRef } from "react";

// This component mutates a ref during render, which React Compiler cannot optimize
export function UnoptimizedComponent({ value }: { value: number }) {
  const renderCount = useRef(0);
  renderCount.current += 1; // Mutation during render - not allowed

  return <div>Value: {value}, Renders: {renderCount.current}</div>;
}

import React, { useRef, useState } from "react";

// This one should optimize fine
export function GoodComponent({ title }: { title: string }) {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      {title}: {count}
    </button>
  );
}

// This one has a problem - mutating during render
export function BadComponent({ items }: { items: string[] }) {
  const seen = useRef(new Set<string>());

  // Mutating ref during render
  items.forEach(item => seen.current.add(item));

  return <div>{seen.current.size} unique items</div>;
}

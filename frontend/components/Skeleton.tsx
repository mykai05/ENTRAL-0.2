import React from "react";

type SkeletonListProps = {
  count?: number;
  label: string;
};

export function SkeletonList({ count = 3, label }: SkeletonListProps) {
  return (
    <div className="skeleton-list" role="status" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <span />
          <strong />
          <small />
        </div>
      ))}
    </div>
  );
}

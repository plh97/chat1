import { Skeleton, SkeletonCircle } from "@/components/ui/chakra-compat";

export const Item = () => {
  return (
    <li className="flex h-14 flex-row items-center rounded-lg px-2 py-1">
      <SkeletonCircle size="12" flexShrink="0" />
      <div className="ml-2 flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton height="4" width="55%" borderRadius="md" />
        <Skeleton height="3" width="78%" borderRadius="md" />
      </div>
    </li>
  );
};

export const Loading = () => {
  return (
    <ul
      aria-label="Loading rooms"
      aria-busy="true"
      className="min-h-0 flex-1 overflow-hidden px-2"
    >
      {Array.from({ length: 7 }, (_, index) => (
        <Item key={index} />
      ))}
    </ul>
  );
};

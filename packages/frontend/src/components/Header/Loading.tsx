import { SkeletonCircle, SkeletonText } from "@/components/ui/chakra-compat";

export const Loading = () => {
  return (
    <>
      <SkeletonCircle size="12" />
      <SkeletonText
        className="flex-1 ml-2"
        mr="2"
        lineClamp={2}
        gap="4"
        height="3"
      />
    </>
  );
};

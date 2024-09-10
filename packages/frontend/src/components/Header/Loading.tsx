import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";

export const Loading = () => {
  return (
    <>
      <SkeletonCircle size="12" />
      <SkeletonText
        className="flex-1 ml-2"
        mr="2"
        noOfLines={2}
        spacing="4"
        skeletonHeight="3"
      />
    </>
  );
};

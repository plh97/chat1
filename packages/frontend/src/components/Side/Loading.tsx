import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";

export const Item = () => {
  return (
    <li className="flex flex-row items-center rounded-lg px-2 py-1">
      <SkeletonCircle size="10" />
      <SkeletonText
        className="flex-1 ml-2 inline-flex flex-col leading-4"
        mr="2"
        noOfLines={2}
        spacing="2"
        skeletonHeight="4"
      />
    </li>
  );
};

export const Loading = () => {
  return (
    <ul className="flex-1 overflow-y-auto px-2">
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
    </ul>
  );
};

import React from "react";
import { Portal } from "@chakra-ui/react";

export const WithProfile = ({
  profile,
  children,
}: React.PropsWithChildren<{ profile?: IUser }>) => {
  if (!profile) {
    return children;
  }
  return (
    <Popover>
      <PopoverTrigger>
        <span className="cursor-pointer">{children}</span>
      </PopoverTrigger>
      <Portal>
        <PopoverContent>
          <PopoverBody>
            <Profile className="px-2 py-2" profile={profile} />
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

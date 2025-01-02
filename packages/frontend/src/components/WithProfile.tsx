import React from "react";
import { Portal } from "@chakra-ui/react";

export const WithProfile = ({
  profile,
  children,
}: React.PropsWithChildren<{ profile?: IUser }>) => {
  const [open, setOpen] = useState(false);
  if (!profile) {
    return children;
  }
  return (
    <Popover closeOnEsc onClose={() => setOpen(false)} isOpen={open}>
      <PopoverTrigger>
        <button onClick={() => setOpen(true)} className="cursor-pointer">
          {children}
        </button>
      </PopoverTrigger>
      {open && (
        <Portal>
          <PopoverContent>
            <PopoverBody>
              <Profile className="px-2 py-2" profile={profile} />
            </PopoverBody>
          </PopoverContent>
        </Portal>
      )}
    </Popover>
  );
};

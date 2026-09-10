import React from "react";
import { Portal } from "@/components/ui/chakra-compat";

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
        <button
          aria-label={`View ${profile.userName}'s profile`}
          className="cursor-pointer"
          onClick={() => setOpen(true)}
          type="button"
        >
          {children}
        </button>
      </PopoverTrigger>
      {open && (
        <Portal>
          <PopoverContent className="max-h-[calc(100dvh-1rem)] w-[min(22rem,calc(100vw-1rem))] overflow-hidden border border-slate-600 bg-slate-800 text-slate-50 shadow-2xl">
            <PopoverBody className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
              <Profile profile={profile} />
            </PopoverBody>
          </PopoverContent>
        </Portal>
      )}
    </Popover>
  );
};

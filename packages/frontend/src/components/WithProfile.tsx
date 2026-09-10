import React from "react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/chakra-compat";

export const WithProfile = ({
  profile,
  children,
}: React.PropsWithChildren<{ profile?: IUser }>) => {
  const [open, setOpen] = useState(false);
  if (!profile) {
    return children;
  }
  return (
    <>
      <button
        aria-label={`View ${profile.userName}'s profile`}
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} size="sm">
        <ModalOverlay className="bg-black/70 backdrop-blur-sm" />
        <ModalContent className="max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-hidden border border-slate-600 bg-slate-800 text-slate-50 shadow-2xl">
          <ModalHeader className="border-b border-slate-700 px-5 py-4 text-lg font-semibold">
            User Profile
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
            <Profile profile={profile} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

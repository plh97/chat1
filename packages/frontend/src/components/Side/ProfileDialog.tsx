import { Profile } from "@/components/Profile";

export const ProfileDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const myInfo = useAppSelector((state) => state.user.data);
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Profile profile={myInfo} edit onClose={onClose} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

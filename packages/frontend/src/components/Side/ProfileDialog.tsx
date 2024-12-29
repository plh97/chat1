import Api from "@/Api";
import { IUser } from "@/interfaces";
import { setUserInfoThunk } from "@/store/reducer/user";
import { FaCamera } from "react-icons/fa";
import { Form } from "react-router-dom";

export const ProfileDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const profile = useAppSelector((state) => state.user.data);
  const dispatch = useThunkDispatch();
  const fileRef = useRef<HTMLInputElement>(null);
  const config = [
    {
      label: "Username",
      value: profile.username,
      name: "username",
    },
    {
      label: "Bio",
      value: profile.bio,
      name: "bio",
    },
    {
      label: "Github",
      value: profile.github,
      name: "github",
    },
    {
      label: "QQ",
      value: profile.QQ,
      name: "QQ",
    },
    {
      label: "WeChat",
      value: profile.WeChat,
      name: "WeChat",
    },
    {
      label: "Permission",
      value: profile.permission,
      name: "permission",
    },
  ];
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const infoList = [...form.entries()];
    const data = infoList.reduce((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, {} as IUser);
    dispatch(setUserInfoThunk(data));
  };
  const handleChangeAvatar = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const { url } = await Api.uploadFile(file);
    dispatch(setUserInfoThunk({ image: url }));
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Profile</ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalCloseButton />
          <ModalBody className="flex flex-col gap-2">
            <FormControl className="relative flex justify-center flex-col items-center mb-5">
              <AvatarComponent
                size="lg"
                name={profile.username}
                src={profile.image}
                className="relative"
              >
                <label
                  htmlFor="avatar"
                  className="absolute bottom-0 left-[50%] transform translate-y-1/2 -translate-x-1/2"
                >
                  <IconButton
                    isRound
                    variant="solid"
                    colorScheme="teal"
                    aria-label="Change Avatar"
                    fontSize="10px"
                    width={"5"}
                    minW={"5"}
                    height={"5"}
                    icon={<FaCamera />}
                    onClick={() => {
                      fileRef.current?.click();
                    }}
                  />
                  <input
                    id="avatar"
                    ref={fileRef}
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={handleChangeAvatar}
                  />
                </label>
              </AvatarComponent>
              {/* <span className="pt-2">{profile.username}</span> */}
            </FormControl>
            {config.map(({ label, value, name }) => {
              return (
                <FormControl
                  className="flex justify-center"
                  id={name}
                  key={name}
                >
                  <FormLabel>{label}</FormLabel>
                  <Input
                    autoComplete="off"
                    size="sm"
                    defaultValue={value}
                    // value={value}
                    name={name}
                    placeholder={`User's ${name}`}
                  />
                </FormControl>
              );
            })}
          </ModalBody>
          <ModalFooter>
            <Button type="submit">Save</Button>
          </ModalFooter>
        </Form>
      </ModalContent>
    </Modal>
  );
};

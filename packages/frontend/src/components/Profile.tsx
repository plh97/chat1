import { Form } from "react-router-dom";
import Api from "@/Api";
import { IUser } from "@/interfaces";
import { setUserInfoThunk } from "@/store/reducer/user";

export const Profile = ({
  edit = false,
  profile,
  className,
  onClose,
}: {
  edit?: boolean;
  profile?: IUser;
  className?: string;
  onClose?: () => void;
}) => {
  const dispatch = useThunkDispatch();
  const config = useMemo(() => {
    if (!profile) return [];
    return [
      {
        label: "Username",
        value: profile.userName,
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
      {
        label: "Email",
        value: profile.email,
        name: "email",
      },
    ];
  }, [profile]);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const infoList = [...form.entries()];
    const data = infoList.reduce((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, {} as IUser);
    dispatch(setUserInfoThunk(data));
    // close dialog
    onClose?.();
  };
  const handleChangeAvatar = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    const { pre_signed_url, endpoint_url } = await Api.getPreSignUrl({
      file_ext: "png",
      upload_scene: 1,
    });
    await fetch(pre_signed_url, {
      method: "PUT",
      body: file,
    });
    dispatch(setUserInfoThunk({ image: endpoint_url }));
  };
  if (!profile) return null;
  return (
    <Form
      className={clsx("flex flex-col gap-2", className)}
      onSubmit={handleSubmit}
    >
      <FormControl className="relative flex justify-center mb-5">
        <Avatar
          size="lg"
          name={profile.userName}
          src={profile.image}
          className="relative"
          onChange={edit ? handleChangeAvatar : undefined}
        />
      </FormControl>
      {config.map(({ label, value, name }) => {
        return (
          <FormControl className="flex justify-center" id={name} key={name}>
            <FormLabel>{label}</FormLabel>
            <Input
              autoComplete="off"
              size="sm"
              defaultValue={value}
              disabled={!edit}
              // value={value}
              name={name}
              placeholder={`User's ${name}`}
            />
          </FormControl>
        );
      })}
      {edit && (
        <FormControl className="flex justify-end">
          <Button type="submit">Save</Button>
        </FormControl>
      )}
    </Form>
  );
};

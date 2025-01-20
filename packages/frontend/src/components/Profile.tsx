import { Form } from "react-router-dom";
import Api from "@/Api";
import { IUser } from "@/interfaces";
import { setUserInfoThunk } from "@/store/reducer/user";

export const Profile = ({
  edit = false,
  profile,
  className,
}: {
  edit?: boolean;
  profile?: IUser;
  className?: string;
}) => {
  const dispatch = useThunkDispatch();
  const config = useMemo(() => {
    if (!profile) return [];
    return [
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
  }, [profile]);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const infoList = [...form.entries()];
    const data = infoList.reduce((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, {} as IUser);
    dispatch(setUserInfoThunk(data));
  };
  const handleChangeAvatar = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    const { url } = await Api.uploadFile(file);
    dispatch(setUserInfoThunk({ image: url }));
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
          name={profile.username}
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

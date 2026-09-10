import { Form } from "react-router-dom";
import { IUser } from "@/interfaces";
import { setUserInfoThunk, uploadImageThunk } from "@/store/reducer/user";

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
        name: "userName",
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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const infoList = [...form.entries()];
    const data = infoList.reduce((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, {} as IUser);
    try {
      await dispatch(setUserInfoThunk(data)).unwrap();
      onClose?.();
    } catch {
      // The API interceptor already presents the request error. Keep the
      // dialog open so the user can retry without losing their edits.
    }
  };
  const handleChangeAvatar = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    try {
      await dispatch(
        uploadImageThunk({ file, updateUserImage: true })
      ).unwrap();
    } catch {
      // Upload/profile errors are already shown by the API layer. The old
      // avatar remains active because the update action was never dispatched.
    }
  };
  if (!profile) return null;
  const fieldClassName =
    "border-slate-600 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 read-only:cursor-default read-only:text-slate-200";
  return (
    <Form
      className={clsx("flex min-w-0 flex-col gap-3", className)}
      onSubmit={handleSubmit}
    >
      <FormControl className="relative mb-4 flex shrink-0 justify-center">
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
          <FormControl className="min-w-0" id={name} key={name}>
            <FormLabel className="text-sm font-medium text-slate-200">
              {label}
            </FormLabel>
            {name === "bio" ? (
              <Textarea
                autoComplete="off"
                className={clsx(
                  fieldClassName,
                  "min-h-20 resize-y whitespace-pre-wrap break-words"
                )}
                defaultValue={value}
                name={name}
                placeholder={`User's ${name}`}
                readOnly={!edit}
                rows={3}
              />
            ) : (
              <Input
                autoComplete="off"
                className={fieldClassName}
                defaultValue={value}
                name={name}
                placeholder={`User's ${name}`}
                readOnly={!edit}
                size="sm"
              />
            )}
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

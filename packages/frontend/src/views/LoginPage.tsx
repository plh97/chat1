import { Properties } from "csstype";
import { ChangeEvent } from "react";
import Api from "@/Api";
import { loginThunk } from "@/store/reducer/user";

const style: { [key: string]: Properties } = {
  container: {
    width: "100%",
    textAlign: "center",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  Wrapper: {
    maxWidth: "400px",
    width: "90vw",
    margin: "0 auto",
    position: "relative",
  },
  AvatarContainer: {
    left: "31%",
    bottom: "100%",
    textAlign: "center",
  },
};

export function LoginPage() {
  const isDev = import.meta.env.DEV;
  const [email, setEmail] = useState(isDev ? "admin@gmail.com" : "");
  const [password, setPassword] = useState(isDev ? "123456" : "");
  const [imageUrl, setImageUrl] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  useAuth();
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Warning.",
        description: "Please Input Email & password.",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    dispatch(
      loginThunk({
        email,
        password,
      })
    );
  };
  const handleRegister = () => {
    return navigate("/register");
  };
  async function handleInputEmail(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    setEmail(input);
    const userImage = await Api.getUserImage(input);
    setImageUrl(userImage);
  }
  return (
    <div style={style.container} data-testid="login">
      <div style={style.Wrapper} className="flex flex-col gap-2">
        <div style={style.AvatarContainer}>
          <Avatar size="xl" name="?" src={imageUrl} />
        </div>
        <h1 className="text-4xl">Login</h1>
        <form
          autoComplete="on"
          onSubmit={handleLogin}
          className="flex flex-col gap-2"
        >
          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              name="username"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={handleInputEmail}
            />
          </FormControl>
          <FormControl id="password" isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              name="current-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          <FormControl id="button">
            <FormLabel></FormLabel>
            <Stack spacing={2} direction="row" align="center">
              <Button type="submit" colorScheme="green">
                Login
              </Button>
              <Button
                onClick={handleRegister}
                colorScheme="green"
                variant="outline"
              >
                Register
              </Button>
            </Stack>
          </FormControl>
        </form>
      </div>
    </div>
  );
}

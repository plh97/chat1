import CSS from "csstype";
import { ChangeEvent, SyntheticEvent } from "react";

import { registerThunk } from "@/store/reducer/user";

const style: { [key: string]: CSS.Properties } = {
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
    opacity: 0,
  },
};

export function RegisterPage() {
  useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const toast = useToast();
  const handleRegister = async (e: SyntheticEvent) => {
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
      registerThunk({
        email,
        password,
      }) as any
    );
  };
  const navigate = useNavigate();
  function handleLogin() {
    return navigate("/login");
  }
  async function handleInputEmail(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    setEmail(input);
  }
  return (
    <div style={style.container} data-testid="register">
      <div style={style.Wrapper} className="flex flex-col gap-2">
        <div style={style.AvatarContainer}>
          <Avatar size="xl" name="?" src={""} />
        </div>
        <h1 className="text-4xl">Register</h1>
        <form onSubmit={handleRegister} className="flex flex-col gap-2">
          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              autoComplete="off"
              autoFocus
              value={email}
              onChange={handleInputEmail}
            />
          </FormControl>
          <FormControl id="password" isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              autoComplete="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          <FormControl id="button">
            <FormLabel></FormLabel>
            <Stack spacing={2} direction="row" align="center">
              <Button
                onClick={handleLogin}
                colorScheme="green"
                variant="outline"
              >
                Login
              </Button>
              <Button
                type="submit"
                onClick={handleRegister}
                colorScheme="green"
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

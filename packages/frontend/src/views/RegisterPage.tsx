import CSS from "csstype";
import { ChangeEvent, useState } from "react";
import { useDispatch } from "react-redux";

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
  Title: {
    fontSize: "revert",
    fontWeight: "initial",
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const toast = useToast();
  async function handleRegister() {
    if (!username || !password) {
      toast({
        title: "Warning.",
        description: "Please Input Username & password.",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    dispatch(
      registerThunk({
        username,
        password,
      }) as any
    );
  }
  const navigate = useNavigate();
  function handleLogin() {
    return navigate("/login");
  }
  async function handleInputUsername(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    setUsername(input);
  }
  return (
    <div style={style.container} data-testid="register">
      <div style={style.Wrapper}>
        <div style={style.AvatarContainer}>
          <Avatar size="xl" name="?" />
        </div>
        <h1 style={style.Title}>Register</h1>
        <FormControl id="username" isRequired>
          <FormLabel>User Name</FormLabel>
          <Input
            type="text"
            autoComplete="true"
            autoFocus
            value={username}
            onChange={handleInputUsername}
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
            <Button onClick={handleLogin} colorScheme="green" variant="outline">
              Login
            </Button>
            <Button onClick={handleRegister} colorScheme="green">
              Register
            </Button>
          </Stack>
        </FormControl>
      </div>
    </div>
  );
}

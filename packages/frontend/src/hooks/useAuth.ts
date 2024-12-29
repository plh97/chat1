import { useMatch } from "react-router-dom";
import { fetchUserInfoThunk } from "@/store/reducer/user";
import { useAppSelector } from "./app";

export default function useAuth() {
  const dispatch = useThunkDispatch();
  const isLogin = useMatch("login");
  const isRegister = useMatch("register");
  const navigation = useNavigate();
  const userinfo = useAppSelector((state) => state.user);
  useEffect(() => {
    dispatch(fetchUserInfoThunk());
  }, []);
  useEffect(() => {
    if (isLogin || isRegister) {
      if (userinfo.auth === true) {
        navigation("/");
      }
    } else {
      if (userinfo.auth === false) {
        navigation("/login");
      }
    }
  }, [userinfo.auth]);
}

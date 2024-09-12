import { Dispatch } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { setDraft } from "@/store/reducer/user";

export const useDraft = (text: string, setText: React.Dispatch<React.SetStateAction<string>>) => {
  const { draftMap } = useAppSelector((state) => state.user);
  const dispatch = useDispatch<Dispatch<any>>();
  const afterRoute = useRef("");
  const { id = "" } = useParams();
  useEffect(() => {
    const draft = draftMap[id];
    if (draft?.textMessage?.text) {
      setText(draft.textMessage?.text);
    } else {
      setText("");
    }
    if (text) {
      // set draft here
      dispatch(
        setDraft({
          channelId: afterRoute.current,
          textMessage: {
            text,
            methion: [],
          },
        })
      );
    }
    afterRoute.current = id;
  }, [id]);
  return {
    after: afterRoute.current,
  };
};
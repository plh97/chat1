let t = 0;

const map: Record<number, any> = {};

export function useRecord() {
  const [time, setTime] = useState(0);
  const [audio, setAudio] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const startRecording = () => {
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        t = window.setInterval(() => {
          setTime((prev) => {
            const newTime = Number(prev + 0.1);
            return +newTime.toFixed(1);
          });
        }, 100);
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        mediaRecorder.ondataavailable = (e) => {
          const file = new File([e.data], Date.now().toString(), {
            type: e.data.type,
          });
          map[t]?.(file);
        };
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
        };
        setAudio(mediaRecorder);
      })
  };
  const stopRecording = () => {
    if (audio) {
      clearInterval(t);
      setTime(0);
      audio.stop();
    }
    return new Promise<File>((resolve) => {
      map[t] = resolve;
    });
  };
  return {
    time,
    startRecording,
    stopRecording,
    mediaRecorder: mediaRecorderRef.current,
  };
}

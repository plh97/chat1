type AudioPlayerState = {
  messageId: string | null;
  src: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
};

type AudioPlayerListener = () => void;

const initialState: AudioPlayerState = {
  messageId: null,
  src: null,
  playing: false,
  currentTime: 0,
  duration: 0,
};

class AudioPlayerController {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<AudioPlayerListener>();
  private state: AudioPlayerState = initialState;

  private ensureAudio() {
    if (this.audio) return this.audio;
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.addEventListener("play", () => {
      this.patch({ playing: true });
    });
    this.audio.addEventListener("pause", () => {
      this.patch({ playing: false });
    });
    this.audio.addEventListener("timeupdate", () => {
      this.patch({ currentTime: this.audio?.currentTime ?? 0 });
    });
    this.audio.addEventListener("loadedmetadata", () => {
      this.patch({ duration: this.audio?.duration ?? this.state.duration });
    });
    this.audio.addEventListener("ended", () => {
      this.patch({ playing: false, currentTime: 0 });
    });
    return this.audio;
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private patch(partial: Partial<AudioPlayerState>) {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emit();
  }

  subscribe(listener: AudioPlayerListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return this.state;
  }

  async toggle(messageId: string, src: string, fallbackDuration = 0) {
    const audio = this.ensureAudio();
    const isCurrent =
      this.state.messageId === messageId && this.state.src === src;

    if (isCurrent && this.state.playing) {
      audio.pause();
      return;
    }

    if (!isCurrent) {
      audio.pause();
      audio.src = src;
      this.patch({
        messageId,
        src,
        currentTime: 0,
        duration: fallbackDuration,
      });
    }

    await audio.play();
  }
}

export const audioPlayer = new AudioPlayerController();

export const useAudioPlayer = () => {
  const [state, setState] = useState(audioPlayer.getState());

  useEffect(() => {
    return audioPlayer.subscribe(() => {
      setState(audioPlayer.getState());
    });
  }, []);

  return state;
};

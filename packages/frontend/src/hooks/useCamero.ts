import { useState, useEffect, useRef } from "react";

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null); // Reference to the video element
  const [error, setError] = useState(null); // Error state
  const [isStreaming, setIsStreaming] = useState(false); // Camera streaming state

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null); // Clear any previous error
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error("Error accessing the camera:", err);
      setError(err.message || "Error accessing the camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop()); // Stop all tracks
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  return { videoRef, startCamera, stopCamera, error, isStreaming };
};

export default useCamera;

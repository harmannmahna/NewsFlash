"use client";

import { useEffect, useState } from "react";

export function ReadAloudButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const toggle = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const speech = new SpeechSynthesisUtterance(text);
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => setSpeaking(false);
    // Web Speech is the no-cost first pass; a hosted TTS API can replace this later.
    window.speechSynthesis.speak(speech);
    setSpeaking(true);
  };
  return <button className="read-aloud" onClick={toggle}>{speaking ? "■ Stop reading" : "◖ Read aloud"}</button>;
}

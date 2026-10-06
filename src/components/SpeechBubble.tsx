interface Props {
  text: string;
}

export default function SpeechBubble({ text }: Props) {
  return (
    <div className="bubble-pop relative mb-3 whitespace-nowrap rounded-2xl border-2 border-sky-400 bg-white px-4 py-2 text-base font-semibold text-sky-700 shadow-xl">
      💧 {text}
      {/* Tail */}
      <span className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-sky-400 bg-white" />
    </div>
  );
}

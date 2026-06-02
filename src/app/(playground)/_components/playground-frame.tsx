import "@/styles/playground.css";

export default function PlaygroundFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="playground-container" data-testid="playground-container">
      {children}
    </div>
  );
}

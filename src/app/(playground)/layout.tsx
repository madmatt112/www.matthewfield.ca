import "@/styles/playground.css";

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="playground-container" data-testid="playground-container">
      {children}
    </div>
  );
}

import { LeftPanel } from "./components/left/LeftPanel";
import { RightPanel } from "./components/right/RightPanel";

export default function App() {
  return (
    <div
      className="flex overflow-hidden bg-gray-950"
      style={{ width: "1920px", height: "1080px" }}
    >
      <LeftPanel />
      <RightPanel />
    </div>
  );
}

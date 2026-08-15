import { useCallSocket } from './hooks/useCallSocket.js';
import CallScreen from './components/CallScreen.jsx';
import ReportView from './components/ReportView.jsx';

export default function App() {
  const callState = useCallSocket();

  if (callState.status === 'ended' && callState.report) {
    return <ReportView report={callState.report} onRestart={() => window.location.reload()} />;
  }

  return <CallScreen callState={callState} />;
}

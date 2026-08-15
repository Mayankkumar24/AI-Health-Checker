const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.9 2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.4v-.48z"/>
  </svg>
);

export default function ReportView({ report, onRestart }) {
  if (!report) return null;

  const completenessLabel =
    report.completeness === 'complete' ? 'Complete'
    : report.completeness === 'partial' ? 'Partial'
    : 'Minimal';

  return (
    <div className="card">
      <div className="report">

        {/* Header */}
        <div className="report-header">
          <div className="report-icon">
            <ClipboardIcon />
          </div>
          <div className="report-header-text">
            <h1>Screening Report</h1>
            <span className={`completeness-badge ${report.completeness}`}>
              {completenessLabel}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="report-section">
          <h2>Summary</h2>
          <p className="report-summary">{report.summary}</p>
        </div>

        {/* Details grid */}
        <div className="report-section">
          <h2>Details</h2>
          <div className="report-grid">
            <div className="report-item">
              <div className="report-item-label">Main concern</div>
              <div className="report-item-value">{report.mainConcern || 'Not discussed'}</div>
            </div>
            <div className="report-item">
              <div className="report-item-label">Duration</div>
              <div className="report-item-value">{report.duration || 'Not discussed'}</div>
            </div>
            <div className="report-item">
              <div className="report-item-label">Severity</div>
              <div className="report-item-value">{report.severity || 'Not discussed'}</div>
            </div>
            <div className="report-item">
              <div className="report-item-label">Related symptoms</div>
              <div className="report-item-value">
                {report.keySymptoms?.length ? report.keySymptoms.join(', ') : 'None reported'}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-up flags */}
        {report.followUpFlags?.length > 0 && (
          <div className="report-section">
            <h2>Flagged for follow-up</h2>
            <div className="report-flags">
              {report.followUpFlags.map((flag, i) => (
                <div key={i} className="report-flag">{flag}</div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer>
          <button className="btn-primary" onClick={onRestart}>
            <PhoneIcon />
            Start a new call
          </button>
        </footer>

      </div>
    </div>
  );
}

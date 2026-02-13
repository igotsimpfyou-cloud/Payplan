import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LearnMoreToggle = ({ summary, children, className = '' }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      {summary && <p className="text-slate-700 text-sm">{summary}</p>}
      <button
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
      >
        {expanded ? 'Hide details' : 'Learn more'}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && <div className="mt-3 text-sm text-slate-700">{children}</div>}
    </div>
  );
};

export default LearnMoreToggle;

import React from 'react';

const SectionCard = ({ id, title, summary, children, className = '' }) => {
  return (
    <section id={id} className={`bg-white rounded-2xl shadow-xl p-6 scroll-mt-28 ${className}`}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        {summary && <p className="text-slate-600 text-sm">{summary}</p>}
      </div>
      {children}
    </section>
  );
};

export default SectionCard;

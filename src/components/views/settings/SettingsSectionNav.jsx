import React from 'react';

const SettingsSectionNav = ({ sections }) => {
  const jumpToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-4 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => jumpToSection(section.id)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SettingsSectionNav;

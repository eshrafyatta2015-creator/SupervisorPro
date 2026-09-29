import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
}

interface SearchableSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'اختر من القائمة...',
  disabled = false,
  emptyMessage = 'لا توجد نتائج مطابقة',
  className = '',
  id,
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.id === value);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const matchLabel = opt.label.toLowerCase().includes(q);
    const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
    const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
    return matchLabel || matchSub || matchBadge;
  });

  const handleSelect = (optId: string) => {
    onChange(optId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} dir="rtl">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-right py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs text-slate-900'
            : selectedOption
            ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 shadow-2xs'
            : 'bg-slate-50 hover:bg-white border-slate-300 hover:border-slate-400 text-slate-400'
        }`}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-[11px] font-normal text-slate-400 shrink-0">
                  ({selectedOption.subLabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!disabled && selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e as any); }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="إلغاء التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 w-full min-w-[240px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث هنا بالكتابة السريعة..."
                className="w-full text-xs py-1.5 pr-8 pl-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex-1 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${opt.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

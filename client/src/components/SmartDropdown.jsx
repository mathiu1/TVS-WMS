import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const SmartDropdown = ({ 
  value, 
  onChange, 
  suggestions = [], 
  placeholder, 
  icon: Icon, 
  required = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value && value.length > 0) {
      const matches = suggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
      );
      setFiltered(matches);
    } else {
      setFiltered(suggestions);
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { name: placeholder, value: val } });
    setIsOpen(false);
  };

  return (
    <div className={`smart-dropdown-wrapper ${className}`} ref={wrapperRef}>
      <div className="input-group relative">
        {Icon && <Icon size={18} className="input-icon" />}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          required={required}
          autoComplete="off"
          className="premium-input-large w-full"
        />
        <ChevronDown 
          size={16} 
          className={`dropdown-chevron ${isOpen ? 'rotate-180' : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="smart-dropdown-list">
          {filtered.map((item, idx) => (
            <li 
              key={idx} 
              onClick={() => handleSelect(item)}
              className="smart-dropdown-item"
            >
              <Search size={14} className="text-slate-400 mr-2" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SmartDropdown;

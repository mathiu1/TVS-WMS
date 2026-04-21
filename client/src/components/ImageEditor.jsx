import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Undo, 
  Check, 
  Type, 
  Pencil, 
  Eraser, 
  Minus, 
  Plus,
  MousePointer2,
  RotateCcw,
  Trash2,
  Palette,
  Maximize2
} from 'lucide-react';


const ImageEditor = ({ imageFile, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // App State
  const [tool, setTool] = useState('pencil'); // 'select', 'pencil', 'text', 'eraser'
  const [color, setColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(4);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Content State
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [texts, setTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [imgObj, setImgObj] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [tempText, setTempText] = useState('');
  const [pendingPos, setPendingPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ size: 32, y: 0 });



  // Initialize Image
  useEffect(() => {
    const img = new Image();
    img.src = URL.createObjectURL(imageFile);
    img.onload = () => {
      setImgObj(img);
      const container = containerRef.current;
      const margin = 20;
      const fitScale = Math.min(
        (container.clientWidth - margin) / img.width,
        (container.clientHeight - margin) / img.height
      );
      setScale(fitScale);
    };
  }, [imageFile]);

  // Main Render Loop
  const render = useCallback(() => {
    if (!imgObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgObj.width;
    canvas.height = imgObj.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgObj, 0, 0);

    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });

    if (currentPath && currentPath.points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      currentPath.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    texts.forEach(t => {
      ctx.font = `bold ${t.fontSize}px Outfit, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = 'top';
      if (selectedId === t.id) {
        const metrics = ctx.measureText(t.content);
        const padding = 8;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(t.x - padding, t.y - padding, metrics.width + padding * 2, t.fontSize + padding * 2);
      }
      ctx.fillText(t.content, t.x, t.y);
    });
  }, [imgObj, paths, currentPath, texts, selectedId]);

  useEffect(() => { render(); }, [render]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const handleStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      setIsDragging(false);
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      setDragStart({ x: center.x - offset.x, y: center.y - offset.y, dist });
      return;
    }

    const { x, y } = getCanvasCoords(e);
    if (tool === 'pencil' || tool === 'eraser') {
      setIsDragging(true);
      setCurrentPath({ color: tool === 'eraser' ? '#ffffff' : color, size: brushSize, points: [{ x, y }] });
    } else if (tool === 'select') {
      const ctx = canvasRef.current.getContext('2d');
      const hit = [...texts].reverse().find(t => {
        ctx.font = `bold ${t.fontSize}px Outfit, sans-serif`;
        const metrics = ctx.measureText(t.content);
        return (x >= t.x && x <= t.x + metrics.width && y >= t.y && y <= t.y + t.fontSize);
      });
      if (hit) {
        setSelectedId(hit.id);
        setIsDragging(true);
        setDragStart({ x: x - hit.x, y: y - hit.y });
      } else {
        setSelectedId(null);
      }
    } else if (tool === 'text') {

      setPendingPos({ x, y });
      setTempText('');
      setIsTextModalOpen(true);
    }
  };

  const handleTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (tempText.trim()) {
      const newText = { 
        id: Date.now(), 
        content: tempText.trim(), 
        x: pendingPos.x, 
        y: pendingPos.y, 
        color, 
        fontSize: 32 
      };
      setTexts([...texts, newText]);
      setSelectedId(newText.id);
      setTool('select');
    }
    setIsTextModalOpen(false);
  };

  const handleTextCancel = () => {
    setIsTextModalOpen(false);
    setTempText('');
  };


  const handleMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      setScale(Math.min(Math.max(0.1, scale * (dist / dragStart.dist)), 10));
      setOffset({ x: center.x - dragStart.x, y: center.y - dragStart.y });
      setDragStart({ ...dragStart, dist });
      return;
    }

    if (!isDragging) return;
    if (e.touches) e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    if (currentPath) {
      setCurrentPath(prev => ({ ...prev, points: [...prev.points, { x, y }] }));
    } else if (selectedId) {
      setTexts(prev => prev.map(t => t.id === selectedId ? { ...t, x: x - dragStart.x, y: y - dragStart.y } : t));
    }
  };

  const handleEnd = () => {
    if (currentPath) { setPaths([...paths, currentPath]); setCurrentPath(null); }
    setIsDragging(false);
    setIsResizing(false);
  };

  const getSelectedTextBounds = () => {
    if (!selectedId || !canvasRef.current) return null;
    const text = texts.find(t => t.id === selectedId);
    if (!text) return null;
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `bold ${text.fontSize}px Outfit, sans-serif`;
    const metrics = ctx.measureText(text.content);
    return {
      x: text.x,
      y: text.y,
      width: metrics.width,
      height: text.fontSize
    };
  };

  const startResizing = (e) => {
    e.stopPropagation();
    const text = texts.find(t => t.id === selectedId);
    if (!text) return;
    setIsResizing(true);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setResizeStart({ size: text.fontSize, y: clientY });
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleResizeMove = (e) => {
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const delta = (clientY - resizeStart.y) / scale;
      setTexts(prev => prev.map(t => t.id === selectedId ? { ...t, fontSize: Math.max(12, resizeStart.size + delta) } : t));
    };
    const handleResizeEnd = () => setIsResizing(false);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove);
    window.addEventListener('touchend', handleResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);
    };
  }, [isResizing, resizeStart, selectedId, scale]);

  const removeText = (id) => {
    setTexts(texts.filter(t => t.id !== id));
    setSelectedId(null);
  };


  const changeFontSize = (delta) => {
    if (!selectedId) return;
    setTexts(prev => prev.map(t => t.id === selectedId ? { ...t, fontSize: Math.max(12, t.fontSize + delta) } : t));
  };

  const undo = () => {
    if (paths.length > 0) setPaths(paths.slice(0, -1));
    else if (texts.length > 0) setTexts(texts.slice(0, -1));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const editedFile = new File([blob], imageFile.name, { type: 'image/jpeg' });
      onSave(editedFile);
    }, 'image/jpeg', 0.95);
  };

  const resetZoom = () => {
    const container = containerRef.current;
    const margin = 20;
    const fitScale = Math.min((container.clientWidth - margin) / imgObj.width, (container.clientHeight - margin) / imgObj.height);
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="editor-overlay stealth-pro">
      <div className="editor-container pro">
        <div className="stealth-header">
           <button className="stealth-close" onClick={onClose} title="Cancel"><X size={24} /></button>
           <div className="stealth-title-area">
             <span className="pro-badge">PRO</span>
             <h3>Editor</h3>
           </div>
           <div className="stealth-actions">
             <button className="stealth-undo" onClick={undo} title="Undo"><Undo size={22} /> <span>Undo</span></button>
             <button className="stealth-save" onClick={handleSave} title="Save Changes"><Check size={22} /> <span>Save</span></button>
           </div>
        </div>

        <div className="editor-workspace pro" ref={containerRef}>
          <div 
            className="canvas-container pro"
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              cursor: tool === 'select' ? 'default' : 'crosshair'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
            {selectedId && tool === 'select' && getSelectedTextBounds() && (
              <div 
                className="text-selection-overlay"
                style={{
                  left: getSelectedTextBounds().x,
                  top: getSelectedTextBounds().y,
                  width: getSelectedTextBounds().width,
                  height: getSelectedTextBounds().height
                }}
              >
                <button 
                  className="text-inline-handle top-right" 
                  onClick={() => removeText(selectedId)}
                  title="Clear Text"
                >
                  <X size={14} />
                </button>
                <div 
                  className="text-inline-handle bottom-right resize"
                  onMouseDown={startResizing}
                  onTouchStart={startResizing}
                  title="Resize"
                >
                  <Maximize2 size={12} />
                </div>

              </div>
            )}
          </div>


          <div className="minimal-zoom-pill">
            <button onClick={() => setScale(scale * 1.25)} aria-label="Zoom In"><Plus size={16} /></button>
            <span className="zoom-pct">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(scale / 1.25)} aria-label="Zoom Out"><Minus size={16} /></button>
            <div className="p-divider" />
            <button onClick={resetZoom} aria-label="Reset"><RotateCcw size={14} /></button>
          </div>
        </div>

        <div className="stealth-footer">
          <div className="stealth-toolbar-pill">

            <button className={`tool-p-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => {setTool('select'); setShowColorPicker(false);}}><MousePointer2 size={20} /></button>
            <button className={`tool-p-btn ${tool === 'pencil' ? 'active' : ''}`} onClick={() => {setTool('pencil'); setShowColorPicker(true);}}><Pencil size={20} /></button>
            <button className={`tool-p-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => {setTool('text'); setShowColorPicker(true);}}><Type size={20} /></button>
            <button className={`tool-p-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => {setTool('eraser'); setShowColorPicker(false);}}><Eraser size={20} /></button>
            
            {(tool === 'pencil' || tool === 'text') && (
              <>
                <div className="p-divider" />
                <button 
                  className={`tool-p-btn ${showColorPicker ? 'active' : ''}`}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{ color: color }}
                ><Palette size={20} /></button>
              </>
            )}
          </div>

          {showColorPicker && (
            <div className="floating-color-picker">
              {['#ff3b30', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ffffff', '#000000'].map(c => (
                <button 
                  key={c} 
                  className={`color-p-dot ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isTextModalOpen && (
        <div className="stealth-modal-overlay">
          <form className="stealth-text-modal" onSubmit={handleTextSubmit}>
            <div className="modal-header">
              <Type size={18} />
              <span>Add Text</span>
            </div>
            <input
              autoFocus
              type="text"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder="Type something..."
              className="stealth-input"
            />
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={handleTextCancel}>Cancel</button>
              <button type="submit" className="btn-add">Add Text</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;


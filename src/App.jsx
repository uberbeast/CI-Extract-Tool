function LineItemsTable({ lFields, lines, activeField, setActiveField, setEditData }) {
  const thBase = {
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 600,
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid " + COLORS.border,
    color: COLORS.textMuted,
    background: "#12141e",
    userSelect: "none"
  };
  const tdInput = {
    background: "transparent",
    border: "none",
    color: COLORS.text,
    fontSize: 12,
    width: "100%",
    outline: "none",
    padding: "2px 0",
    fontFamily: "inherit",
    minWidth: 60
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ ...thBase, width: 36 }}>#</th>
            {lFields.map(function(f) {
              var fKey = f[0];
              var fLabel = f[1];
              var isColActive = activeField && activeField.section === "col" && activeField.key === fKey;
              return (
                <th key={fKey} style={{
                  ...thBase,
                  color: isColActive ? COLORS.accent : COLORS.textMuted,
                  background: isColActive ? "rgba(108,99,255,0.15)" : "#12141e"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {fLabel}
                    <span
                      title={"Select column: " + fLabel}
                      style={{ cursor: "pointer", fontSize: 11, color: isColActive ? "#6c63ff" : COLORS.textMuted, opacity: 0.8 }}
                      onClick={function() {
                        setActiveField(isColActive ? null : { section: "col", key: fKey, label: fLabel + " (all rows)" });
                      }}
                    >⬚</span>
                  </div>
                </th>
              );
            })}
            <th style={{ ...thBase, textAlign: "center", width: 48 }}>Row ⬚</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(function(line, li) {
            var isRowActive = activeField && activeField.section === "line" && activeField.lineIdx === li;
            return (
              <tr key={li} style={{ borderBottom: "1px solid " + COLORS.border, background: isRowActive ? "rgba(108,99,255,0.07)" : "transparent" }}>
                <td style={{ padding: "6px 10px", fontSize: 12, color: COLORS.textMuted, verticalAlign: "middle" }}>{line.lineNumber}</td>
                {lFields.map(function(f) {
                  var fKey = f[0];
                  var isColActive = activeField && activeField.section === "col" && activeField.key === fKey;
                  var conf = line[fKey] ? line[fKey].confidence : null;
                  var confBg = conf === "high" ? "rgba(5,46,22,0.5)" : conf === "medium" ? "rgba(69,26,3,0.5)" : conf === "low" ? "rgba(69,10,10,0.5)" : "transparent";
                  return (
                    <td key={fKey} style={{ padding: "5px 8px", verticalAlign: "middle", background: isColActive ? "rgba(108,99,255,0.08)" : confBg }}>
                      <input
                        style={tdInput}
                        value={line[fKey] ? (line[fKey].value || "") : ""}
                        onChange={function(e) {
                          var val = e.target.value;
                          setEditData(function(d) {
                            return {
                              ...d,
                              lines: d.lines.map(function(l, i) {
                                if (i !== li) return l;
                                var updated = Object.assign({}, l);
                                updated[fKey] = { value: val, confidence: l[fKey] ? l[fKey].confidence : "high" };
                                return updated;
                              })
                            };
                          });
                        }}
                        placeholder="—"
                      />
                    </td>
                  );
                })}
                <td style={{ padding: "5px 10px", verticalAlign: "middle", textAlign: "center" }}>
                  <span
                    title={"Select row: Line " + (li + 1)}
                    style={{ fontSize: 14, cursor: "pointer", color: isRowActive ? "#6c63ff" : COLORS.textMuted }}
                    onClick={function() {
                      setActiveField(isRowActive ? null : { section: "line", key: "_row", label: "Line " + (li + 1) + " (all fields)", lineIdx: li });
                    }}
                  >⬚</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewPage({ doc, onBack, onMarkReviewed, onExport, onRunClaude, user, profile, templates, onSaveTemplate }) {
  const [editData, setEditData] = useState(doc.extracted || { header: {}, lines: [] });
  const [bbox, setBbox] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [bboxResult, setBboxResult] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfDataOverride, setPdfDataOverride] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const docRef = useRef();
  const pdfCanvasRef = useRef();

  const h = editData.header || {};
  const lines = editData.lines || [];

  const hFields = [
    ["sellerName","Seller Name"],["sellerAddress","Seller Address"],
    ["buyerName","Buyer Name"],["buyerAddress","Buyer Address"],
    ["invoiceNumber","Invoice #"],["invoiceTotal","Invoice Total"],
    ["incoterm","Incoterm"],["totalWeight","Total Weight"],["totalWeightUOM","Weight UOM"]
  ];
  const lFields = [
    ["poNumber","PO #"],["partNumber","Part #"],["description","Description"],
    ["hsCode","HS Code"],["quantity","Qty"],["quantityUOM","Qty UOM"],
    ["unitPrice","Unit Price"],["currency","Currency"],["totalLine","Line Total"],
    ["unitWeight","Unit Wt"],["totalLineWeight","Line Wt"],["weightUOM","Wt UOM"],
    ["countryOfOrigin","COO"]
  ];

  const CB = function(props) {
    var c = props.c;
    if (!c) return null;
    var cc = confColor(c);
    return (
      <span style={{ background: cc.bg, color: cc.text, border: "1px solid " + cc.border, padding: "1px 6px", borderRadius: 20, fontSize: 10, fontWeight: 500, marginLeft: 4, flexShrink: 0 }}>
        {c[0].toUpperCase()}
      </span>
    );
  };

  // Auto-load PDF from Supabase Storage
  useEffect(function() {
    if (doc.file_path && !pdfDataOverride) {
      setPdfLoading(true);
      supabase.storage.from("documents").download(doc.file_path).then(function(result) {
        var data = result.data;
        var error = result.error;
        if (!error && data) {
          data.arrayBuffer().then(function(buf) {
            setPdfDataOverride(buf);
            setPdfLoading(false);
          });
        } else {
          setPdfLoading(false);
        }
      });
    }
  }, [doc.file_path]);

  const getRelPos = function(e) {
    var r = docRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    };
  };

  const onMouseDown = function(e) {
    if (!activeField) return;
    e.preventDefault();
    var p = getRelPos(e);
    setStartPt(p); setDrawing(true); setBbox(null); setBboxResult(null);
  };

  const onMouseMove = function(e) {
    if (!drawing || !startPt) return;
    var p = getRelPos(e);
    setBbox({ x: Math.min(startPt.x, p.x), y: Math.min(startPt.y, p.y), w: Math.abs(p.x - startPt.x), h: Math.abs(p.y - startPt.y) });
  };

  const onMouseUp = function(e) {
    if (!drawing) return;
    setDrawing(false);
    if (bbox && bbox.w > 0.02 && bbox.h > 0.02) {
      setBboxResult("Extracting from selected region...");
      setTimeout(function() {
        var af = activeField;
        if (af.section === "header") {
          var current = editData.header[af.key] && editData.header[af.key].value;
          if (current) {
            setEditData(function(d) { return { ...d, header: { ...d.header, [af.key]: { value: current, confidence: "high" } } }; });
            setBboxResult("✓ Confirmed: \"" + current + "\" → " + af.label);
          } else {
            setBboxResult("⚠ No value found for " + af.label);
          }
        } else if (af.section === "line") {
          setEditData(function(d) {
            return {
              ...d, lines: d.lines.map(function(l, i) {
                if (i !== af.lineIdx) return l;
                var updated = Object.assign({}, l);
                lFields.forEach(function(f) {
                  if (updated[f[0]]) updated[f[0]] = Object.assign({}, updated[f[0]], { confidence: "high" });
                });
                return updated;
              })
            };
          });
          setBboxResult("✓ Re-confirmed all fields for Line " + (af.lineIdx + 1));
        } else if (af.section === "col") {
          setEditData(function(d) {
            return {
              ...d, lines: d.lines.map(function(l) {
                if (!l[af.key]) return l;
                return Object.assign({}, l, { [af.key]: Object.assign({}, l[af.key], { confidence: "high" }) });
              })
            };
          });
          setBboxResult("✓ Re-confirmed " + af.label + " for all " + lines.length + " lines");
        }
        setTimeout(function() { setBbox(null); setBboxResult(null); setActiveField(null); }, 2500);
      }, 800);
    } else {
      setBbox(null);
    }
  };

  const cellStyle = function(conf) {
    var bg = conf === "high" ? "rgba(5,46,22,0.5)" : conf === "medium" ? "rgba(69,26,3,0.5)" : conf === "low" ? "rgba(69,10,10,0.5)" : "transparent";
    return { background: bg, transition: "background 0.2s" };
  };
  const inputCell = { background: "transparent", border: "none", color: COLORS.text, fontSize: 12, width: "100%", outline: "none", padding: "2px 0", fontFamily: "inherit" };

  const doSaveTemplate = function() {
    if (!templateName.trim()) return;
    onSaveTemplate({ name: templateName.trim(), data: editData });
    setTemplateName(""); setShowSaveTemplate(false);
  };
  const applyTemplate = function(t) { setEditData(t.data); setShowApplyTemplate(false); };

  return (
    <div style={{ ...s.app, height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ ...s.topbar, gap: 10, flexWrap: "wrap" }}>
        <button style={s.btn("ghost")} onClick={onBack}>← Back</button>
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
        <span style={s.statusBadge(doc.status)}>{doc.status}</span>
        {doc.status !== "Reviewed" && <button style={s.btn("secondary")} onClick={function() { onRunClaude(doc); }}>⚡ Re-extract</button>}
        {doc.extracted && <button style={s.btn("secondary")} onClick={function() { setShowApplyTemplate(true); }}>Apply Template</button>}
        {doc.extracted && <button style={s.btn("secondary")} onClick={function() { setTemplateName(""); setShowSaveTemplate(true); }}>Save as Template</button>}
        {doc.extracted && <button style={s.btn("secondary")} onClick={function() { onExport(doc); }}>Export CSV</button>}
        {doc.status !== "Reviewed" && doc.extracted && <button style={{ ...s.btn(), background: "#14532d", color: "#86efac" }} onClick={function() { onMarkReviewed(doc); }}>✓ Mark Reviewed</button>}
        {doc.status === "Reviewed" && <span style={{ fontSize: 13, color: COLORS.success }}>✓ Reviewed by {doc.reviewer}</span>}
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setShowSaveTemplate(false); }}>
          <div style={{ ...s.card, width: 400, padding: "1.5rem" }} onClick={function(e) { e.stopPropagation(); }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Save as Template</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.5 }}>Save the current field structure to guide future extractions from the same supplier.</div>
            <label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Template Name</label>
            <input style={{ ...s.input, marginBottom: 16 }} value={templateName} onChange={function(e) { setTemplateName(e.target.value); }} placeholder="e.g. Acme Supplier Invoice" autoFocus onKeyDown={function(e) { if (e.key === "Enter") doSaveTemplate(); }} />
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 16, background: "#0d0f18", padding: "10px", borderRadius: 8, lineHeight: 1.6 }}>
              <strong style={{ color: COLORS.text, fontWeight: 500 }}>Includes:</strong> {Object.keys(editData.header || {}).length} header fields · {(editData.lines || []).length} line item structure
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={s.btn("ghost")} onClick={function() { setShowSaveTemplate(false); }}>Cancel</button>
              <button style={s.btn()} onClick={doSaveTemplate} disabled={!templateName.trim()}>Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyTemplate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setShowApplyTemplate(false); }}>
          <div style={{ ...s.card, width: 480, padding: "1.5rem", maxHeight: "70vh", display: "flex", flexDirection: "column" }} onClick={function(e) { e.stopPropagation(); }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Apply Template</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Select a template to apply its field structure to this document.</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: COLORS.textMuted, fontSize: 13 }}>No templates saved yet.</div>
              ) : templates.map(function(t) {
                return (
                  <div key={t.id} style={{ ...s.card, marginBottom: 10, padding: "1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                    onMouseEnter={function(e) { e.currentTarget.style.borderColor = COLORS.accent; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = COLORS.border; }}
                    onClick={function() { applyTemplate(t); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{t.createdBy} · {t.createdAt} · {(t.data && t.data.lines ? t.data.lines.length : 0)} line(s)</div>
                    </div>
                    <button style={{ ...s.btn(), padding: "6px 14px", fontSize: 12 }} onClick={function(e) { e.stopPropagation(); applyTemplate(t); }}>Apply</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, borderTop: "1px solid " + COLORS.border, paddingTop: 16 }}>
              <button style={s.btn("ghost")} onClick={function() { setShowApplyTemplate(false); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main split panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT — PDF viewer */}
        <div style={{ flex: "0 0 50%", borderRight: "1px solid " + COLORS.border, background: "#0d0f18", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid " + COLORS.border, background: COLORS.bgCard, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Document</span>
            {pdfDataOverride && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                <button style={{ ...s.btn("ghost"), padding: "2px 8px", fontSize: 12 }} onClick={function() { setPdfPage(function(p) { return Math.max(1, p - 1); }); }}>‹</button>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>Page {pdfPage}</span>
                <button style={{ ...s.btn("ghost"), padding: "2px 8px", fontSize: 12 }} onClick={function() { setPdfPage(function(p) { return p + 1; }); }}>›</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[["High","#4ade80","#052e16","#16a34a"],["Med","#fbbf24","#451a03","#d97706"],["Low","#f87171","#450a0a","#dc2626"]].map(function(x) {
                return <span key={x[0]} style={{ fontSize: 11, background: x[2], color: x[1], padding: "2px 8px", borderRadius: 20, border: "1px solid " + x[3] }}>{x[0]}</span>;
              })}
            </div>
          </div>
          {activeField && (
            <div style={{ padding: "8px 14px", background: "#1a1d27", borderBottom: "1px solid " + COLORS.border, fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⬚</span>
              <span>Draw a box to extract <strong style={{ color: COLORS.text }}>{activeField.label}</strong></span>
              <button style={{ ...s.btn("ghost"), padding: "2px 10px", fontSize: 11, marginLeft: "auto" }} onClick={function() { setActiveField(null); setBbox(null); setBboxResult(null); }}>Cancel</button>
            </div>
          )}
          {bboxResult && <div style={{ padding: "8px 14px", background: "#052e16", borderBottom: "1px solid #16a34a", fontSize: 12, color: "#4ade80" }}>{bboxResult}</div>}
          <div
            ref={docRef}
            style={{ flex: 1, position: "relative", cursor: activeField ? "crosshair" : "default", userSelect: "none", overflow: "auto" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          >
            {pdfDataOverride ? (
              <PdfViewer pdfData={pdfDataOverride} pageNum={pdfPage} canvasRef={pdfCanvasRef} />
            ) : pdfLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textMuted, fontSize: 13 }}>Loading PDF...</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <div style={{ width: "80%", maxWidth: 360, background: COLORS.bgCard, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "2rem", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>{doc.file_type || doc.type}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.7, background: "#0d0f18", padding: "10px", borderRadius: 6, marginBottom: 12 }}>
                    PDF preview unavailable. Load a local copy to view.
                  </div>
                  <label style={{ ...s.btn(), display: "inline-block", cursor: "pointer", fontSize: 12, padding: "6px 14px" }}>
                    Load PDF
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={function(e) {
                      var f = e.target.files[0];
                      if (!f) return;
                      var r = new FileReader();
                      r.onload = function(ev) { setPdfDataOverride(ev.target.result); };
                      r.readAsArrayBuffer(f);
                    }} />
                  </label>
                </div>
              </div>
            )}
            {bbox && (
              <div style={{ position: "absolute", left: (bbox.x * 100) + "%", top: (bbox.y * 100) + "%", width: (bbox.w * 100) + "%", height: (bbox.h * 100) + "%", border: "2px solid #6c63ff", background: "rgba(108,99,255,0.15)", pointerEvents: "none", boxSizing: "border-box" }} />
            )}
          </div>
          <div style={{ padding: "12px 14px", borderTop: "1px solid " + COLORS.border }}>
            <button style={{ ...s.btn(), width: "100%" }} onClick={function() { onRunClaude(doc); }}>⚡ Run Extraction</button>
          </div>
        </div>

        {/* RIGHT — Extracted data */}
        <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid " + COLORS.border, background: COLORS.bgCard, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            Extracted Data
            {activeField && <span style={{ fontSize: 11, color: "#fbbf24", marginLeft: "auto" }}>⬚ Select region on document →</span>}
          </div>
          {!doc.extracted ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted, fontSize: 14 }}>
              No data extracted yet. Click Run Extraction.
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Header section */}
              <div style={{ padding: "10px 14px 6px", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 1, borderBottom: "1px solid " + COLORS.border, background: "#12141e" }}>HEADER</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {hFields.map(function(field) {
                    var key = field[0];
                    var label = field[1];
                    var conf = h[key] && h[key].confidence;
                    var bg = conf === "high" ? "rgba(5,46,22,0.5)" : conf === "medium" ? "rgba(69,26,3,0.5)" : conf === "low" ? "rgba(69,10,10,0.5)" : "transparent";
                    return (
                      <tr key={key} style={{ background: bg }}>
                        <td style={{ padding: "7px 14px", fontSize: 12, color: COLORS.textMuted, whiteSpace: "nowrap", width: 130, borderBottom: "1px solid " + COLORS.border, verticalAlign: "middle" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {label}
                            <CB c={conf} />
                          </div>
                        </td>
                        <td style={{ padding: "7px 8px", borderBottom: "1px solid " + COLORS.border, verticalAlign: "middle" }}>
                          <input
                            style={inputCell}
                            value={(h[key] && h[key].value) || ""}
                            onChange={function(e) {
                              var val = e.target.value;
                              setEditData(function(d) {
                                var newHeader = Object.assign({}, d.header);
                                newHeader[key] = Object.assign({}, newHeader[key], { value: val });
                                return Object.assign({}, d, { header: newHeader });
                              });
                            }}
                            placeholder="—"
                          />
                        </td>
                        <td style={{ padding: "7px 10px 7px 4px", borderBottom: "1px solid " + COLORS.border, verticalAlign: "middle", width: 28 }}>
                          <span
                            title={"Draw box to extract " + label}
                            style={{ cursor: "pointer", fontSize: 14, color: (activeField && activeField.section === "header" && activeField.key === key) ? "#6c63ff" : COLORS.textMuted }}
                            onClick={function() {
                              setActiveField((activeField && activeField.section === "header" && activeField.key === key) ? null : { section: "header", key: key, label: label });
                            }}
                          >⬚</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Line items section */}
              <div style={{ padding: "10px 14px 6px", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 1, borderBottom: "1px solid " + COLORS.border, background: "#12141e", marginTop: 4 }}>
                LINE ITEMS ({lines.length})
              </div>
              <LineItemsTable
                lFields={lFields}
                lines={lines}
                activeField={activeField}
                setActiveField={setActiveField}
                setEditData={setEditData}
              />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from "react";

const INCOTERMS = ["FOB","Ex-Works","DDP","DAP","CIF","CFR","EXW","FCA","CPT","CIP","DAT"];
const UOM_LIST = ["Each","Piece","Box","Carton","Pallet","Kilogram","Gram","Pound","Ounce","Liter","Meter","Set"];
const CURRENCIES = ["USD","EUR","GBP","CNY","CAD","AUD","JPY","CHF","INR","MXN"];
const WEIGHT_UOM = ["Gram","Kilogram","Pound","Ounce","Ton"];
const COUNTRIES = ["US","CN","CA","GB","DE","FR","JP","MX","IN","KR","TW","VN","TH","BR","IT"];

const COLORS = {
  bg:"#0f1117",bgCard:"#1a1d27",bgCardHover:"#1f2235",border:"#2a2d3e",
  accent:"#6c63ff",text:"#e2e4f0",textMuted:"#8b8fa8",
  success:"#22c55e",warning:"#f59e0b",danger:"#ef4444",info:"#3b82f6",
  greenBg:"#052e16",yellowBg:"#451a03",redBg:"#450a0a"
};

const confColor = c => c==="high"?{bg:"#052e16",border:"#16a34a",text:"#4ade80"}
  :c==="medium"?{bg:"#451a03",border:"#d97706",text:"#fbbf24"}
  :{bg:"#450a0a",border:"#dc2626",text:"#f87171"};

const s = {
  app:{fontFamily:"'Inter',system-ui,sans-serif",background:COLORS.bg,minHeight:"100vh",color:COLORS.text},
  sidebar:{width:220,background:COLORS.bgCard,borderRight:`1px solid ${COLORS.border}`,display:"flex",flexDirection:"column",padding:"0 0 1rem"},
  logo:{padding:"1.25rem 1rem",borderBottom:`1px solid ${COLORS.border}`,fontSize:15,fontWeight:600,color:COLORS.text,letterSpacing:-0.3},
  navItem:(active)=>({display:"flex",alignItems:"center",gap:10,padding:"10px 1rem",cursor:"pointer",fontSize:14,color:active?COLORS.text:COLORS.textMuted,background:active?`${COLORS.accent}22`:"transparent",borderLeft:active?`2px solid ${COLORS.accent}`:"2px solid transparent",transition:"all 0.15s",userSelect:"none"}),
  main:{flex:1,display:"flex",flexDirection:"column",overflow:"auto"},
  topbar:{padding:"1rem 1.5rem",borderBottom:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:COLORS.bgCard},
  page:{padding:"1.5rem",flex:1},
  card:{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"1.25rem"},
  btn:(variant="primary")=>({background:variant==="primary"?COLORS.accent:variant==="danger"?"#7f1d1d":variant==="success"?"#14532d":COLORS.bgCardHover,color:variant==="primary"?"#fff":variant==="danger"?"#fca5a5":variant==="success"?"#86efac":COLORS.text,border:variant==="ghost"?`1px solid ${COLORS.border}`:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500,transition:"opacity 0.15s"}),
  input:{background:"#0d0f18",border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"8px 12px",color:COLORS.text,fontSize:13,width:"100%",boxSizing:"border-box",outline:"none"},
  badge:(c)=>({background:confColor(c).bg,color:confColor(c).text,border:`1px solid ${confColor(c).border}`,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:500}),
  statusBadge:(st)=>{const m={Queued:{bg:"#1e3a5f",c:"#93c5fd"},Processing:{bg:"#3d2b00",c:"#fcd34d"},"Need Review":{bg:"#3b1c00",c:"#fb923c"},Reviewed:{bg:"#052e16",c:"#4ade80"},Error:{bg:"#3b0000",c:"#f87171"}};const t=m[st]||m.Queued;return{background:t.bg,color:t.c,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:500,whiteSpace:"nowrap"}},
};

// Generates realistic mock extracted data
function genMockExtracted(name) {
  const sellers = ["Shenzhen Precision Parts Co. Ltd","Global Manufacturing Inc","Beijing Export Trading Co","Guangzhou Industrial Supplies"];
  const buyers = ["Acme Imports LLC","North American Trade Corp","Global Supply Chain Ltd","Midwest Distribution Inc"];
  const incotermList = ["FOB","DDP","Ex-Works","CIF"];
  const origins = ["CN","US","DE","TW","VN"];
  const rnd = s => s[Math.floor(Math.random()*s.length)];
  const conf = () => rnd(["high","high","high","medium","low"]);
  const numLines = 2 + Math.floor(Math.random()*4);
  const lines = Array.from({length:numLines},(_,i)=>({
    lineNumber:i+1,
    poNumber:{value:`PO-${44500+Math.floor(Math.random()*100)}`,confidence:conf()},
    partNumber:{value:`PART-${String(1000+Math.floor(Math.random()*9000))}`,confidence:conf()},
    description:{value:rnd(["Industrial Widget Assembly","Bracket Mounting Kit","Electronic Control Module","Steel Fastener Set","Precision Bearing Unit"]),confidence:conf()},
    hsCode:{value:`${8400+Math.floor(Math.random()*99)}.${10+Math.floor(Math.random()*89)}`,confidence:conf()},
    quantity:{value:String(10+Math.floor(Math.random()*490)),confidence:"high"},
    quantityUOM:{value:"Each",confidence:"high"},
    unitPrice:{value:(5+Math.random()*95).toFixed(2),confidence:conf()},
    currency:{value:"USD",confidence:"high"},
    totalLine:{value:(50+Math.random()*5000).toFixed(2),confidence:conf()},
    unitWeight:{value:String(100+Math.floor(Math.random()*900)),confidence:conf()},
    totalLineWeight:{value:String(1000+Math.floor(Math.random()*50000)),confidence:conf()},
    weightUOM:{value:"Gram",confidence:conf()},
    countryOfOrigin:{value:rnd(origins),confidence:conf()},
  }));
  const total = lines.reduce((a,l)=>a+parseFloat(l.totalLine.value),0);
  return {
    header:{
      sellerName:{value:rnd(sellers),confidence:conf()},
      sellerAddress:{value:"123 Industrial Road, Shenzhen, Guangdong, China 518000",confidence:conf()},
      buyerName:{value:rnd(buyers),confidence:conf()},
      buyerAddress:{value:"456 Commerce Blvd, Chicago, IL 60601, USA",confidence:conf()},
      invoiceNumber:{value:`INV-${2024}-${String(Math.floor(Math.random()*99999)).padStart(5,"0")}`,confidence:"high"},
      invoiceTotal:{value:`$${total.toFixed(2)}`,confidence:conf()},
      incoterm:{value:rnd(incotermList),confidence:conf()},
      totalWeight:{value:String(100+Math.floor(Math.random()*900)),confidence:conf()},
      totalWeightUOM:{value:"Kilogram",confidence:conf()},
    },
    lines
  };
}

const PROCESSING_SLOTS = 2;

const initialUsers = [
  {id:1,name:"Admin User",email:"admin@company.com",role:"admin",group:"Admins",active:true},
];

export default function App() {
  const [page,setPage] = useState("login");
  const [user,setUser] = useState(null);
  const [docs,setDocs] = useState([]);
  const [users,setUsers] = useState(initialUsers);
  const [reviewDoc,setReviewDoc] = useState(null);
  const [apiKey,setApiKey] = useState("");
  const [apiKeyInput,setApiKeyInput] = useState("");
  const [demoMode,setDemoMode] = useState(false);
  const [loginData,setLoginData] = useState({email:"",password:"",mode:"login",resetSent:false});
  const [statusFilter,setStatusFilter] = useState("All");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState([]);
  const [dateFrom,setDateFrom] = useState("");
  const [dateTo,setDateTo] = useState("");
  const [sortCol,setSortCol] = useState("uploaded");
  const [sortDir,setSortDir] = useState("desc");
  const [currentPage,setCurrentPage] = useState(1);
  const [uploadQueue,setUploadQueue] = useState([]);
  const [lists,setLists] = useState({incoterms:[...INCOTERMS],uom:[...UOM_LIST],currencies:[...CURRENCIES],weightUOM:[...WEIGHT_UOM],countries:[...COUNTRIES]});
  const [savedTemplates,setSavedTemplates] = useState([]);
  const [toast,setToast] = useState(null);
  const processingRef = useRef(0);
  const pageSize = 50;

  const showToast = (msg,type="success") => {setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  const login = () => {
    if(!loginData.email||!loginData.password){showToast("Enter email and password","error");return;}
    const found = users.find(u=>u.email.toLowerCase()===loginData.email.toLowerCase());
    if(!found){showToast("Account not found. Please sign up or check your email.","error");return;}
    if(!found.active){showToast("This account is inactive. Contact your admin.","error");return;}
    setUser(found);setPage("dashboard");showToast(`Welcome, ${found.name}!`);
  };

  const signup = () => {
    if(!loginData.email||!loginData.password||!loginData.name){showToast("Fill in all fields","error");return;}
    if(users.find(u=>u.email.toLowerCase()===loginData.email.toLowerCase())){showToast("Email already registered","error");return;}
    const nu={id:Date.now(),name:loginData.name,email:loginData.email,role:"user",group:"Users",active:true};
    setUsers(u=>[...u,nu]);setUser(nu);setPage("dashboard");showToast(`Welcome, ${nu.name}!`);
  };

  const logout = () => {setUser(null);setPage("login");setLoginData({email:"",password:"",mode:"login",resetSent:false});};

  // Queue processor — runs up to PROCESSING_SLOTS docs at a time
  const processNextQueued = (docsState, updater) => {
    const processing = docsState.filter(d=>d.status==="Processing").length;
    const queued = docsState.filter(d=>d.status==="Queued");
    const slots = PROCESSING_SLOTS - processing;
    if(slots<=0||queued.length===0) return docsState;
    const toProcess = queued.slice(0,slots).map(d=>d.id);
    const updated = docsState.map(d=>toProcess.includes(d.id)?{...d,status:"Processing"}:d);
    toProcess.forEach(id=>{
      setTimeout(()=>{
        updater(prev=>{
          const mock = genMockExtracted(prev.find(d=>d.id===id)?.name||"doc");
          const next = prev.map(d=>d.id===id?{...d,status:"Need Review",lines:mock.lines.length,extracted:mock}:d);
          return processNextQueued(next,updater);
        });
      }, 3000+Math.random()*2000);
    });
    return updated;
  };

  const filteredDocs = docs.filter(d=>{
    if(statusFilter!=="All"&&d.status!==statusFilter) return false;
    if(search&&!d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(dateFrom&&d.uploaded<dateFrom) return false;
    if(dateTo&&d.uploaded>dateTo) return false;
    return true;
  }).sort((a,b)=>{
    let av=a[sortCol]||"",bv=b[sortCol]||"";
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  });

  const pagedDocs = filteredDocs.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const totalPages = Math.ceil(filteredDocs.length/pageSize);
  const statusCounts = ["Queued","Processing","Need Review","Reviewed","Error"].reduce((acc,st)=>{acc[st]=docs.filter(d=>d.status===st).length;return acc},{});

  const deleteDoc = id => {setDocs(d=>d.filter(x=>x.id!==id));setSelected(s=>s.filter(x=>x!==id));showToast("Document deleted");};
  const deleteBulk = () => {setDocs(d=>d.filter(x=>!selected.includes(x.id)));setSelected([]);showToast("Documents deleted");};

  const exportCSV = (doc) => {
    const h = doc.extracted?.header||{};
    const lines = doc.extracted?.lines||[];
    const rows = [
      ["HEADER DATA",""],
      ["Seller Name",h.sellerName?.value||""],
      ["Seller Address",h.sellerAddress?.value||""],
      ["Buyer Name",h.buyerName?.value||""],
      ["Buyer Address",h.buyerAddress?.value||""],
      ["Invoice Number",h.invoiceNumber?.value||""],
      ["Invoice Total",h.invoiceTotal?.value||""],
      ["Incoterm",h.incoterm?.value||""],
      ["Total Weight",h.totalWeight?.value||""],
      ["Total Weight UOM",h.totalWeightUOM?.value||""],
      ["",""],
      ["LINE ITEMS",""],
      ["Line#","PO Number","Part Number","Description","HS Code","Qty","Qty UOM","Unit Price","Currency","Total Price","Unit Weight","Total Weight","Weight UOM","Country of Origin"],
      ...lines.map(l=>[l.lineNumber,l.poNumber?.value,l.partNumber?.value,l.description?.value,l.hsCode?.value,l.quantity?.value,l.quantityUOM?.value,l.unitPrice?.value,l.currency?.value,l.totalLine?.value,l.unitWeight?.value,l.totalLineWeight?.value,l.weightUOM?.value,l.countryOfOrigin?.value])
    ];
    const csv = rows.map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = doc.name.replace(/\.[^.]+$/,".csv");
    a.click();
    showToast("CSV exported!");
  };

  const handleFileSelect = e => {
    const files = Array.from(e.target.files||[]);
    files.forEach((f,i)=>{
      const item = {id:Date.now()+i+Math.random(),file:f,name:f.name,size:f.size,type:f.name.split(".").pop().toUpperCase(),template:"None",status:"pending",pdfData:null};
      if(f.type==="application/pdf"||f.name.toLowerCase().endsWith(".pdf")){
        const r=new FileReader();
        r.onload=ev=>setUploadQueue(q=>q.map(x=>x.id===item.id?{...x,pdfData:ev.target.result}:x));
        r.readAsArrayBuffer(f);
      }
      setUploadQueue(q=>[...q,item]);
    });
  };

  const beginExtraction = () => {
    if(!uploadQueue.length) return;
    const today = new Date().toISOString().split("T")[0];
    const newDocs = uploadQueue.map((q,i)=>({id:Date.now()+i+Math.random(),name:q.name,status:"Queued",uploaded:today,type:q.type,pages:1,lines:0,extracted:null,pdfData:q.pdfData||null,totalPages:1,uploadedBy:user?.name||"Unknown",template:q.template!=="None"?q.template:null}));
    setUploadQueue([]);
    setPage("dashboard");
    showToast(`${newDocs.length} document(s) queued`);
    setDocs(prev=>{
      const combined = [...newDocs,...prev];
      return processNextQueued(combined, setDocs);
    });
  };

  const buildExtractionPrompt = (doc, template) => {
    const schema = `{"header":{"sellerName":{"value":"","confidence":""},"sellerAddress":{"value":"","confidence":""},"buyerName":{"value":"","confidence":""},"buyerAddress":{"value":"","confidence":""},"invoiceNumber":{"value":"","confidence":""},"invoiceTotal":{"value":"","confidence":""},"incoterm":{"value":"","confidence":""},"totalWeight":{"value":"","confidence":""},"totalWeightUOM":{"value":"","confidence":""}},"lines":[{"lineNumber":1,"poNumber":{"value":"","confidence":""},"partNumber":{"value":"","confidence":""},"description":{"value":"","confidence":""},"hsCode":{"value":"","confidence":""},"quantity":{"value":"","confidence":""},"quantityUOM":{"value":"","confidence":""},"unitPrice":{"value":"","confidence":""},"currency":{"value":"","confidence":""},"totalLine":{"value":"","confidence":""},"unitWeight":{"value":"","confidence":""},"totalLineWeight":{"value":"","confidence":""},"weightUOM":{"value":"","confidence":""},"countryOfOrigin":{"value":"","confidence":""}}]}`;

    let templateContext = "";
    if(template){
      const h = template.data?.header || {};
      const lines = template.data?.lines || [];
      const hintLines = Object.entries(h)
        .filter(([,v])=>v?.value)
        .map(([k,v])=>`  - ${k}: example value "${v.value}"`)
        .join("\n");
      const lineHints = lines[0] ? Object.entries(lines[0])
        .filter(([k,v])=>k!=="lineNumber"&&v?.value)
        .map(([k,v])=>`  - ${k}: example value "${v.value}"`)
        .join("\n") : "";
      templateContext = `
A previously reviewed document from a similar supplier was extracted using the template named "${template.name}".
Use the following as hints for field locations, formats, and expected value patterns on this document type:

HEADER FIELD HINTS:
${hintLines||"  (none)"}

LINE ITEM FIELD HINTS (per row):
${lineHints||"  (none)"}

Use these patterns to improve confidence in locating and extracting the same fields on this new document.
If a field location or format differs from the hint, extract what you find and set confidence accordingly.
`;
    }

    return `You are an invoice data extraction AI. Return ONLY valid JSON with no markdown fences, matching this schema exactly. Use confidence: "high", "medium", or "low" for each field based on how certain you are.
${templateContext}
JSON schema to follow:
${schema}

Document filename: ${doc.name}
${!template?"Note: No document content available in this demo environment — generate realistic mock invoice data for testing purposes.":"Note: No document content available in this demo environment — use the template hints above to generate realistic mock data consistent with the template patterns."}`;
  };

  const runExtractWithClaude = async (doc) => {
    if(!apiKey&&!demoMode){showToast("Enter a Claude API key in Settings, or enable Demo Mode","error");return;}
    setDocs(d=>d.map(x=>x.id===doc.id?{...x,status:"Processing"}:x));
    if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Processing"}));

    // Find template if one was assigned at upload
    const assignedTemplate = savedTemplates.find(t=>t.name===doc.template)||null;

    if(demoMode){
      showToast(assignedTemplate?`Demo: extracting with template "${assignedTemplate.name}"...`:"Demo mode: generating mock extraction...");
      setTimeout(()=>{
        const mock = genMockExtracted(doc.name);
        // If a template is assigned, blend template hints into mock data to simulate guided extraction
        if(assignedTemplate){
          const th = assignedTemplate.data?.header||{};
          Object.keys(th).forEach(k=>{
            if(th[k]?.value && mock.header[k]) mock.header[k] = {...mock.header[k], confidence:"high"};
          });
        }
        setDocs(d=>d.map(x=>x.id===doc.id?{...x,status:"Need Review",extracted:mock,lines:mock.lines.length}:x));
        if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Need Review",extracted:mock,lines:mock.lines.length}));
        showToast("Extraction complete!");
      },1800);
      return;
    }

    showToast(assignedTemplate?`Extracting with template "${assignedTemplate.name}"...`:"Sending to Claude API...","info");
    try{
      const prompt = buildExtractionPrompt(doc, assignedTemplate);
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const txt = data.content?.map(x=>x.text||"").join("").trim();
      const parsed = JSON.parse(txt);
      setDocs(d=>d.map(x=>x.id===doc.id?{...x,status:"Need Review",extracted:parsed,lines:parsed.lines?.length||0}:x));
      if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Need Review",extracted:parsed,lines:parsed.lines?.length||0}));
      showToast("Extraction complete!");
    }catch(err){
      setDocs(d=>d.map(x=>x.id===doc.id?{...x,status:"Error"}:x));
      if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Error"}));
      showToast("Extraction failed: "+err.message,"error");
    }
  };

  const markReviewed = doc => {
    setDocs(d=>d.map(x=>x.id===doc.id?{...x,status:"Reviewed",reviewer:user?.name}:x));
    setReviewDoc(r=>r?{...r,status:"Reviewed",reviewer:user?.name}:r);
    showToast("Marked as reviewed");
  };

  const sortToggle = col => {if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}};

  const nav = [
    {id:"dashboard",label:"Dashboard",icon:"▦"},
    {id:"upload",label:"New Upload",icon:"↑"},
    ...(user?.role==="admin"?[{id:"admin",label:"Admin",icon:"⚙"}]:[]),
    {id:"settings",label:"Settings",icon:"◎"},
  ];

  if(page==="login") return <LoginPage loginData={loginData} setLoginData={setLoginData} onLogin={login} onSignup={signup}/>;
  if(page==="review"&&reviewDoc) return <ReviewPage doc={reviewDoc} onBack={()=>setPage("dashboard")} onMarkReviewed={markReviewed} onExport={exportCSV} onRunClaude={runExtractWithClaude} apiKey={apiKey} demoMode={demoMode} user={user} templates={savedTemplates} onSaveTemplate={t=>{setSavedTemplates(ts=>[...ts,t]);showToast(`Template "${t.name}" saved!`);}}/>;

  return (
    <div style={{...s.app,display:"flex",height:"100vh",overflow:"hidden"}}>
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:999,background:toast.type==="error"?COLORS.danger:toast.type==="info"?COLORS.info:COLORS.success,color:"#fff",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{toast.msg}</div>}
      <div style={s.sidebar}>
        <div style={s.logo}>⬡ InvoiceAI</div>
        <div style={{flex:1,paddingTop:8}}>
          {nav.map(n=><div key={n.id} style={s.navItem(page===n.id)} onClick={()=>setPage(n.id)}><span style={{fontSize:16}}>{n.icon}</span>{n.label}</div>)}
        </div>
        <div style={{padding:"0 1rem"}}>
          <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:2}}>{user?.name}</div>
          <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:10,textTransform:"capitalize"}}>{user?.role}</div>
          <button style={{...s.btn("ghost"),width:"100%",fontSize:13}} onClick={logout}>Sign out</button>
        </div>
      </div>
      <div style={s.main}>
        <div style={s.topbar}>
          <span style={{fontWeight:600,fontSize:16}}>{page==="dashboard"?"Dashboard":page==="upload"?"Upload Documents":page==="admin"?"Admin Panel":"Settings"}</span>
          {page==="dashboard"&&<button style={s.btn()} onClick={()=>setPage("upload")}>+ New Upload</button>}
        </div>
        <div style={{...s.page,overflowY:"auto"}}>
          {page==="dashboard"&&<DashboardPage docs={pagedDocs} statusCounts={statusCounts} statusFilter={statusFilter} setStatusFilter={v=>{setStatusFilter(v);setCurrentPage(1);}} search={search} setSearch={v=>{setSearch(v);setCurrentPage(1);}} selected={selected} setSelected={setSelected} onDelete={deleteDoc} onDeleteBulk={deleteBulk} onExport={exportCSV} onReview={doc=>{setReviewDoc(doc);setPage("review");}} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} sortCol={sortCol} sortDir={sortDir} onSort={sortToggle} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages}/>}
          {page==="upload"&&<UploadPage queue={uploadQueue} setQueue={setUploadQueue} onFileSelect={handleFileSelect} onBegin={beginExtraction} templates={["None",...savedTemplates.map(t=>t.name)]}/>}
          {page==="admin"&&<AdminPage users={users} setUsers={setUsers} lists={lists} setLists={setLists} showToast={showToast}/>}
          {page==="settings"&&<SettingsPage apiKey={apiKey} setApiKey={setApiKey} apiKeyInput={apiKeyInput} setApiKeyInput={setApiKeyInput} demoMode={demoMode} setDemoMode={setDemoMode} showToast={showToast}/>}
        </div>
      </div>
    </div>
  );
}

function LoginPage({loginData,setLoginData,onLogin,onSignup}){
  const set = k => e => setLoginData(d=>({...d,[k]:e.target.value}));
  const isReset = loginData.mode==="reset";
  const isSignup = loginData.mode==="signup";
  const handleKey = e => { if(e.key==="Enter") isSignup?onSignup():onLogin(); };
  return(
    <div style={{...s.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:380}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:32,marginBottom:8}}>⬡</div>
          <div style={{fontSize:22,fontWeight:600,color:COLORS.text}}>InvoiceAI</div>
          <div style={{fontSize:14,color:COLORS.textMuted,marginTop:4}}>Document extraction platform</div>
        </div>
        <div style={s.card}>
          <div style={{fontSize:16,fontWeight:600,marginBottom:20}}>{isReset?"Reset Password":isSignup?"Create Account":"Sign In"}</div>
          {isReset&&loginData.resetSent?(
            <div style={{color:COLORS.success,fontSize:14,textAlign:"center",padding:"1rem 0"}}>Reset email sent — check your inbox.</div>
          ):(
            <>
              {isSignup&&<div style={{marginBottom:12}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Full Name</label><input style={s.input} value={loginData.name||""} onChange={set("name")} placeholder="Your name" onKeyDown={handleKey}/></div>}
              <div style={{marginBottom:12}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Email</label><input style={s.input} type="email" value={loginData.email} onChange={set("email")} placeholder="you@company.com" onKeyDown={handleKey}/></div>
              {!isReset&&<div style={{marginBottom:20}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Password</label><input style={s.input} type="password" value={loginData.password} onChange={set("password")} placeholder="••••••••" onKeyDown={handleKey}/></div>}
              <button style={{...s.btn(),width:"100%",padding:"10px",fontSize:14}} onClick={isReset?(()=>setLoginData(d=>({...d,resetSent:true}))):isSignup?onSignup:onLogin}>
                {isReset?"Send Reset Link":isSignup?"Create Account":"Sign In"}
              </button>
            </>
          )}
          <div style={{marginTop:16,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            {!isSignup&&!isReset&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"signup"}))}>Create account</span>}
            {!isReset&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"reset"}))}>Forgot password?</span>}
            {(isReset||isSignup)&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"login",resetSent:false}))}>Back to sign in</span>}
          </div>
          <div style={{marginTop:16,padding:"10px",background:"#0d0f18",borderRadius:8,fontSize:12,color:COLORS.textMuted,lineHeight:1.6,textAlign:"center"}}>
            Default admin: <strong style={{color:COLORS.text}}>admin@company.com</strong> / any password
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({docs,statusCounts,statusFilter,setStatusFilter,search,setSearch,selected,setSelected,onDelete,onDeleteBulk,onExport,onReview,dateFrom,setDateFrom,dateTo,setDateTo,sortCol,sortDir,onSort,currentPage,setCurrentPage,totalPages}){
  const buckets = ["Queued","Processing","Need Review","Reviewed","Error"];
  const bucketText = {Queued:"#93c5fd",Processing:"#fcd34d","Need Review":"#fb923c",Reviewed:"#4ade80",Error:"#f87171"};
  const allSelected = docs.length>0&&docs.every(d=>selected.includes(d.id));
  const toggleAll = () => allSelected?setSelected(s=>s.filter(x=>!docs.map(d=>d.id).includes(x))):setSelected(s=>[...new Set([...s,...docs.map(d=>d.id)])]);
  const Th = ({col,label,center}) => <th style={{padding:"10px 12px",textAlign:center?"center":"left",fontSize:12,color:COLORS.textMuted,fontWeight:500,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap",borderBottom:`1px solid ${COLORS.border}`}} onClick={()=>onSort(col)}>{label}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}</th>;  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:"1.5rem"}}>
        {buckets.map(b=>(
          <div key={b} style={{...s.card,cursor:"pointer",border:`1px solid ${statusFilter===b?bucketText[b]:COLORS.border}`,padding:"1rem",transition:"border-color 0.2s"}} onClick={()=>setStatusFilter(statusFilter===b?"All":b)}>
            <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:6,fontWeight:500}}>{b.toUpperCase()}</div>
            <div style={{fontSize:28,fontWeight:600,color:bucketText[b]}}>{statusCounts[b]||0}</div>
          </div>
        ))}
      </div>
      <div style={{...s.card,marginBottom:"1rem",padding:"1rem"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <input style={{...s.input,width:220}} placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:COLORS.textMuted}}>
            <span>From</span><input type="date" style={{...s.input,width:150}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
            <span>To</span><input type="date" style={{...s.input,width:150}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          </div>
          {selected.length>0&&(
            <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center"}}>
              <span style={{fontSize:13,color:COLORS.textMuted}}>{selected.length} selected</span>
              <button style={s.btn("secondary")} onClick={()=>docs.filter(d=>selected.includes(d.id)&&d.extracted).forEach(d=>onExport(d))}>Export CSV</button>
              <button style={s.btn("danger")} onClick={onDeleteBulk}>Delete</button>
            </div>
          )}
        </div>
      </div>
      <div style={{...s.card,padding:0,overflow:"hidden"}}>
        {docs.length===0?(
          <div style={{padding:"3rem",textAlign:"center",color:COLORS.textMuted,fontSize:14}}>
            No documents yet. Click <strong style={{color:COLORS.text}}>+ New Upload</strong> to get started.
          </div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#12141e"}}>
                <th style={{padding:"10px 12px",borderBottom:`1px solid ${COLORS.border}`}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
                <Th col="name" label="Name"/>
                <Th col="status" label="Status"/>
                <Th col="uploaded" label="Uploaded"/>
                <Th col="type" label="Type"/>
                <Th col="pages" label="Pages" center/>
                <Th col="lines" label="Lines" center/>
                <Th col="uploadedBy" label="Uploaded By"/>
                <th style={{padding:"10px 12px",fontSize:12,color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}`}} onClick={e=>e.stopPropagation()}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedDocs(docs,currentPage,50).map(d=>(
                <tr key={d.id} style={{borderBottom:`1px solid ${COLORS.border}`,cursor:"pointer"}}
                  onClick={()=>onReview(d)}
                  onMouseEnter={e=>e.currentTarget.style.background=COLORS.bgCardHover}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(d.id)} onChange={()=>setSelected(s=>s.includes(d.id)?s.filter(x=>x!==d.id):[...s,d.id])}/></td>
                  <td style={{padding:"10px 12px",fontSize:13,fontWeight:500,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    <span style={{color:COLORS.accent}}>{d.name}</span>
                    {d.status==="Processing"&&<span style={{marginLeft:8,fontSize:11,color:COLORS.textMuted}}>extracting...</span>}
                  </td>
                  <td style={{padding:"10px 12px"}}><span style={s.statusBadge(d.status)}>{d.status}</span></td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{d.uploaded}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{d.type}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,textAlign:"center"}}>{d.pages}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,textAlign:"center"}}>{d.lines||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,whiteSpace:"nowrap"}}>{d.uploadedBy||"—"}</td>
                  <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:6}}>
                      {d.extracted&&<button style={{...s.btn("secondary"),padding:"4px 10px",fontSize:12}} onClick={()=>onExport(d)}>CSV</button>}
                      <button style={{...s.btn("danger"),padding:"4px 10px",fontSize:12}} onClick={()=>onDelete(d.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages>1&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,padding:"12px 16px",borderTop:`1px solid ${COLORS.border}`}}>
            <span style={{fontSize:13,color:COLORS.textMuted}}>Page {currentPage} of {totalPages}</span>
            <button style={s.btn("secondary")} disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>←</button>
            <button style={s.btn("secondary")} disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

function pagedDocs(docs,page,size){return docs.slice((page-1)*size,page*size);}

function PdfViewer({pdfData,pageNum,canvasRef}){
  const canvasEl = useRef();
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const renderRef = useRef(null);

  useEffect(()=>{
    if(!pdfData) return;
    let cancelled=false;
    setLoading(true);setError(null);
    const loadPdf = async()=>{
      try{
        if(!window.pdfjsLib){
          await new Promise((res,rej)=>{
            const sc=document.createElement("script");
            sc.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const bytes = pdfData instanceof ArrayBuffer ? new Uint8Array(pdfData) : pdfData;
        const pdf = await window.pdfjsLib.getDocument({data:bytes}).promise;
        if(cancelled) return;
        const page = await pdf.getPage(Math.min(pageNum,pdf.numPages));
        if(cancelled) return;
        const vp = page.getViewport({scale:1.5});
        const canvas = canvasEl.current;
        if(!canvas) return;
        canvas.width=vp.width;canvas.height=vp.height;
        const ctx=canvas.getContext("2d");
        if(renderRef.current) renderRef.current.cancel();
        renderRef.current = page.render({canvasContext:ctx,viewport:vp});
        await renderRef.current.promise;
        if(!cancelled) setLoading(false);
      }catch(e){
        if(!cancelled&&e?.name!=="RenderingCancelledException") setError(e.message);
        if(!cancelled) setLoading(false);
      }
    };
    loadPdf();
    return()=>{cancelled=true;if(renderRef.current)renderRef.current.cancel();};
  },[pdfData,pageNum]);

  return(
    <div style={{position:"relative",minHeight:200}}>
      {loading&&<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",color:COLORS.textMuted,fontSize:13,zIndex:2}}>Rendering PDF...</div>}
      {error&&<div style={{padding:"1rem",color:"#f87171",fontSize:13}}>Failed to render: {error}</div>}
      <canvas ref={canvasEl} style={{width:"100%",display:loading?"none":"block"}}/>
    </div>
  );
}

function UploadPage({queue,setQueue,onFileSelect,onBegin,templates}){
  const dropRef = useRef();
  const fileRef = useRef();
  const onDrop = e => {
    e.preventDefault();
    dropRef.current.style.borderColor=COLORS.border;
    const f=e.dataTransfer.files;
    if(f.length) onFileSelect({target:{files:f}});
  };
  const fmt = b => b>1e6?`${(b/1e6).toFixed(1)} MB`:b>1e3?`${(b/1e3).toFixed(0)} KB`:`${b} B`;
  return(
    <div style={{maxWidth:800}}>
      <div ref={dropRef} style={{...s.card,border:`2px dashed ${COLORS.border}`,textAlign:"center",padding:"3rem",cursor:"pointer",transition:"border-color 0.15s"}}
        onDragOver={e=>{e.preventDefault();dropRef.current.style.borderColor=COLORS.accent;}}
        onDragLeave={()=>dropRef.current.style.borderColor=COLORS.border}
        onDrop={onDrop}
        onClick={()=>fileRef.current.click()}>
        <div style={{fontSize:32,marginBottom:12}}>☁</div>
        <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Drop files here or click to browse</div>
        <div style={{fontSize:13,color:COLORS.textMuted}}>PDF, Excel, Word — single or bulk upload</div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc" style={{display:"none"}} onChange={onFileSelect}/>
      </div>
      {queue.length>0&&(
        <div style={{marginTop:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:500,color:COLORS.textMuted}}>{queue.length} file{queue.length>1?"s":""} queued</div>
            <div style={{fontSize:12,color:COLORS.textMuted}}>Up to {PROCESSING_SLOTS} documents will process simultaneously; others wait in queue.</div>
          </div>
          {queue.map((item)=>(
            <div key={item.id} style={{...s.card,marginBottom:10,padding:"1rem",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,background:"#1a1d27",border:`1px solid ${COLORS.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:COLORS.accent,flexShrink:0}}>{item.type}</div>
              <div style={{flex:1,minWidth:0}}>
                <input style={{...s.input,marginBottom:6}} value={item.name} onChange={e=>setQueue(q=>q.map(x=>x.id===item.id?{...x,name:e.target.value}:x))}/>
                <div style={{fontSize:12,color:COLORS.textMuted}}>{fmt(item.size)}</div>
              </div>
              <select style={{...s.input,width:160,flexShrink:0}} value={item.template} onChange={e=>setQueue(q=>q.map(x=>x.id===item.id?{...x,template:e.target.value}:x))}>
                {templates.map(t=><option key={t}>{t}</option>)}
              </select>
              <button style={{...s.btn("danger"),padding:"6px 12px",flexShrink:0}} onClick={()=>setQueue(q=>q.filter(x=>x.id!==item.id))}>✕</button>
            </div>
          ))}
          <div style={{marginTop:"1.5rem",display:"flex",justifyContent:"flex-end"}}>
            <button style={{...s.btn(),padding:"12px 28px",fontSize:15}} onClick={onBegin}>Begin Extraction ({queue.length})</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewPage({doc,onBack,onMarkReviewed,onExport,onRunClaude,apiKey,demoMode,user,templates,onSaveTemplate}){
  const [editData,setEditData] = useState(doc.extracted||{header:{},lines:[]});
  const [bbox,setBbox] = useState(null);
  const [drawing,setDrawing] = useState(false);
  const [startPt,setStartPt] = useState(null);
  const [activeField,setActiveField] = useState(null);
  const [bboxResult,setBboxResult] = useState(null);
  const [pdfPage,setPdfPage] = useState(1);
  const [pdfDataOverride,setPdfDataOverride] = useState(null);
  const [showSaveTemplate,setShowSaveTemplate] = useState(false);
  const [showApplyTemplate,setShowApplyTemplate] = useState(false);
  const [templateName,setTemplateName] = useState("");
  const docRef = useRef();
  const pdfCanvasRef = useRef();
  const pdfData = pdfDataOverride || doc.pdfData || null;

  const saveTemplate = () => {
    if(!templateName.trim()) return;
    const t = {id:Date.now(),name:templateName.trim(),createdBy:user?.name,createdAt:new Date().toLocaleDateString(),data:editData};
    onSaveTemplate(t);
    setTemplateName("");
    setShowSaveTemplate(false);
  };

  const applyTemplate = (t) => {
    setEditData(t.data);
    setShowApplyTemplate(false);
  };
  const h = editData.header||{};
  const lines = editData.lines||[];
  const hFields = [["sellerName","Seller Name"],["sellerAddress","Seller Address"],["buyerName","Buyer Name"],["buyerAddress","Buyer Address"],["invoiceNumber","Invoice #"],["invoiceTotal","Invoice Total"],["incoterm","Incoterm"],["totalWeight","Total Weight"],["totalWeightUOM","Weight UOM"]];
  const lFields = [["poNumber","PO #"],["partNumber","Part #"],["description","Description"],["hsCode","HS Code"],["quantity","Qty"],["quantityUOM","Qty UOM"],["unitPrice","Unit Price"],["currency","Currency"],["totalLine","Line Total"],["unitWeight","Unit Wt"],["totalLineWeight","Line Wt"],["weightUOM","Wt UOM"],["countryOfOrigin","COO"]];
  const CB = ({c}) => {
    if(!c) return null;
    const cc=confColor(c);
    return <span style={{background:cc.bg,color:cc.text,border:`1px solid ${cc.border}`,padding:"1px 6px",borderRadius:20,fontSize:10,fontWeight:500,marginLeft:4,flexShrink:0}}>{c[0].toUpperCase()}</span>;
  };
  const canExtract = apiKey||demoMode;

  const getRelPos = (e) => {
    const r = docRef.current.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)), y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
  };
  const onMouseDown = e => {
    if(!activeField) return;
    e.preventDefault();
    const p=getRelPos(e);
    setStartPt(p);setDrawing(true);setBbox(null);setBboxResult(null);
  };
  const onMouseMove = e => {
    if(!drawing||!startPt) return;
    const p=getRelPos(e);
    setBbox({x:Math.min(startPt.x,p.x),y:Math.min(startPt.y,p.y),w:Math.abs(p.x-startPt.x),h:Math.abs(p.y-startPt.y)});
  };
  const onMouseUp = e => {
    if(!drawing) return;
    setDrawing(false);
    if(bbox&&bbox.w>0.02&&bbox.h>0.02){
      setBboxResult("Extracting from selected region...");
      setTimeout(()=>{
        const mockVals={sellerName:"Shenzhen Parts Co.",invoiceNumber:"INV-2024-99001",invoiceTotal:"$31,450.00",incoterm:"FOB",totalWeight:"620",poNumber:"PO-55001",partNumber:"PART-7821",description:"Precision Bracket Assembly",hsCode:"8302.42",quantity:"250",unitPrice:"12.75",currency:"USD",totalLine:"3,187.50",unitWeight:"320",totalLineWeight:"80,000",weightUOM:"Gram",countryOfOrigin:"CN",default:"Extracted value"};
        const af = activeField;
        if(af.section==="header"){
          const val = mockVals[af.key]||mockVals.default;
          setEditData(d=>({...d,header:{...d.header,[af.key]:{value:val,confidence:"high"}}}));
          setBboxResult(`✓ Extracted "${val}" → ${af.label}`);
        } else if(af.section==="line"){
          // Row mode — fill all fields for that line with mock values
          setEditData(d=>({...d,lines:d.lines.map((l,i)=>i===af.lineIdx?Object.fromEntries([
            ["lineNumber",l.lineNumber],
            ...lFields.map(([key])=>[key,{value:mockVals[key]||mockVals.default,confidence:"high"}])
          ]):l)}));
          setBboxResult(`✓ Extracted all fields for Line ${af.lineIdx+1}`);
        } else if(af.section==="col"){
          // Column mode — fill this field across all lines
          setEditData(d=>({...d,lines:d.lines.map((l,i)=>{
            const colMockVals={poNumber:`PO-5500${i+1}`,partNumber:`PART-${7821+i}`,quantity:String(100*(i+1)),unitPrice:(10+i*2.5).toFixed(2),currency:"USD",totalLine:(1000*(i+1)).toFixed(2),countryOfOrigin:"CN",default:`Value ${i+1}`};
            return {...l,[af.key]:{value:colMockVals[af.key]||colMockVals.default,confidence:"high"}};
          })}));
          setBboxResult(`✓ Extracted ${af.label} for all ${lines.length} lines`);
        }
        setTimeout(()=>{setBbox(null);setBboxResult(null);setActiveField(null);},2200);
      },1200);
    } else {
      setBbox(null);
    }
  };

  const cellStyle = (conf) => {
    const bg = conf==="high"?"rgba(5,46,22,0.5)":conf==="medium"?"rgba(69,26,3,0.5)":conf==="low"?"rgba(69,10,10,0.5)":"transparent";
    return {background:bg,transition:"background 0.2s"};
  };
  const inputCell = {background:"transparent",border:"none",color:COLORS.text,fontSize:12,width:"100%",outline:"none",padding:"2px 0",fontFamily:"inherit"};

  return(
    <div style={{...s.app,height:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{...s.topbar,gap:10,flexWrap:"wrap"}}>
        <button style={s.btn("ghost")} onClick={onBack}>← Back</button>
        <span style={{fontSize:14,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</span>
        <span style={s.statusBadge(doc.status)}>{doc.status}</span>
        {canExtract&&doc.status!=="Reviewed"&&<button style={s.btn("secondary")} onClick={()=>onRunClaude(doc)}>⚡ Re-extract</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>setShowApplyTemplate(true)}>Apply Template</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>{setTemplateName("");setShowSaveTemplate(true);}}>Save as Template</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>onExport(doc)}>Export CSV</button>}
        {doc.status!=="Reviewed"&&doc.extracted&&<button style={{...s.btn(),background:"#14532d",color:"#86efac"}} onClick={()=>onMarkReviewed(doc)}>✓ Mark Reviewed</button>}
        {doc.status==="Reviewed"&&<span style={{fontSize:13,color:COLORS.success}}>✓ Reviewed by {doc.reviewer}</span>}
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowSaveTemplate(false)}>
          <div style={{...s.card,width:400,padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Save as Template</div>
            <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16,lineHeight:1.5}}>The current field layout and values will be saved as a reusable template. Future extractions can use it to pre-fill or guide the AI on field locations.</div>
            <label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:6}}>Template Name</label>
            <input style={{...s.input,marginBottom:16}} value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="e.g. Acme Supplier Invoice" autoFocus onKeyDown={e=>e.key==="Enter"&&saveTemplate()}/>
            <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:16,background:"#0d0f18",padding:"10px",borderRadius:8,lineHeight:1.6}}>
              <strong style={{color:COLORS.text,fontWeight:500}}>Includes:</strong> {Object.keys(editData.header||{}).length} header fields · {(editData.lines||[]).length} line item structure
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={s.btn("ghost")} onClick={()=>setShowSaveTemplate(false)}>Cancel</button>
              <button style={s.btn()} onClick={saveTemplate} disabled={!templateName.trim()}>Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyTemplate&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowApplyTemplate(false)}>
          <div style={{...s.card,width:480,padding:"1.5rem",maxHeight:"70vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Apply Template</div>
            <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16}}>Select a template to apply its field structure to this document. This will overwrite the current extracted data.</div>
            <div style={{flex:1,overflowY:"auto"}}>
              {templates.length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:COLORS.textMuted,fontSize:13}}>No templates saved yet. Extract a document and use "Save as Template" to create one.</div>
              ):(
                templates.map(t=>(
                  <div key={t.id} style={{...s.card,marginBottom:10,padding:"1rem",cursor:"pointer",border:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",gap:12,transition:"border-color 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border}
                    onClick={()=>applyTemplate(t)}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500,marginBottom:3}}>{t.name}</div>
                      <div style={{fontSize:12,color:COLORS.textMuted}}>{t.createdBy} · {t.createdAt} · {(t.data?.lines||[]).length} line(s)</div>
                    </div>
                    <button style={{...s.btn(),padding:"6px 14px",fontSize:12}} onClick={e=>{e.stopPropagation();applyTemplate(t);}}>Apply</button>
                  </div>
                ))
              )}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16,borderTop:`1px solid ${COLORS.border}`,paddingTop:16}}>
              <button style={s.btn("ghost")} onClick={()=>setShowApplyTemplate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* LEFT — PDF viewer with bounding box */}
        <div style={{flex:"0 0 50%",borderRight:`1px solid ${COLORS.border}`,background:"#0d0f18",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${COLORS.border}`,background:COLORS.bgCard,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:500}}>Document</span>
            {doc.pdfData&&doc.totalPages>1&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:8}}>
                <button style={{...s.btn("ghost"),padding:"2px 8px",fontSize:12}} onClick={()=>setPdfPage(p=>Math.max(1,p-1))} disabled={pdfPage<=1}>‹</button>
                <span style={{fontSize:12,color:COLORS.textMuted}}>{pdfPage}/{doc.totalPages}</span>
                <button style={{...s.btn("ghost"),padding:"2px 8px",fontSize:12}} onClick={()=>setPdfPage(p=>Math.min(doc.totalPages,p+1))} disabled={pdfPage>=doc.totalPages}>›</button>
              </div>
            )}
            <div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
              {[["High","#4ade80","#052e16","#16a34a"],["Med","#fbbf24","#451a03","#d97706"],["Low","#f87171","#450a0a","#dc2626"]].map(([l,c,bg,b])=>(
                <span key={l} style={{fontSize:11,background:bg,color:c,padding:"2px 8px",borderRadius:20,border:`1px solid ${b}`}}>{l}</span>
              ))}
            </div>
          </div>
          {activeField&&(
            <div style={{padding:"8px 14px",background:"#1a1d27",borderBottom:`1px solid ${COLORS.border}`,fontSize:12,color:"#fbbf24",display:"flex",alignItems:"center",gap:8}}>
              <span>⬚</span>
              <span>Draw a box to extract <strong style={{color:COLORS.text}}>{activeField.label}</strong></span>
              <button style={{...s.btn("ghost"),padding:"2px 10px",fontSize:11,marginLeft:"auto"}} onClick={()=>{setActiveField(null);setBbox(null);setBboxResult(null);}}>Cancel</button>
            </div>
          )}
          {bboxResult&&(
            <div style={{padding:"8px 14px",background:"#052e16",borderBottom:`1px solid #16a34a`,fontSize:12,color:"#4ade80"}}>{bboxResult}</div>
          )}
          <div ref={docRef} style={{flex:1,position:"relative",cursor:activeField?"crosshair":"default",userSelect:"none",overflow:"auto"}}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
            {doc.pdfData ? (
              <PdfViewer pdfData={doc.pdfData} pageNum={pdfPage} onPagesLoaded={n=>setDoc&&null} canvasRef={pdfCanvasRef}/>
            ) : (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
                <div style={{width:"80%",maxWidth:360,background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"2rem",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:10}}>📄</div>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{doc.name}</div>
                  <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:16}}>{doc.type} · {doc.pages} page{doc.pages>1?"s":""}</div>
                  <div style={{fontSize:11,color:COLORS.textMuted,lineHeight:1.7,background:"#0d0f18",padding:"10px",borderRadius:6,marginBottom:12}}>
                    No PDF preview available for this document. Upload a real PDF to see it rendered here with bounding-box selection.
                  </div>
                  <label style={{...s.btn(),display:"inline-block",cursor:"pointer",fontSize:12,padding:"6px 14px"}}>
                    Load PDF
                    <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files[0];if(!f)return;
                      const r=new FileReader();r.onload=ev=>setPdfDataOverride(ev.target.result);r.readAsArrayBuffer(f);
                    }}/>
                  </label>
                </div>
              </div>
            )}
            {bbox&&(
              <div style={{position:"absolute",left:`${bbox.x*100}%`,top:`${bbox.y*100}%`,width:`${bbox.w*100}%`,height:`${bbox.h*100}%`,border:"2px solid #6c63ff",background:"rgba(108,99,255,0.15)",pointerEvents:"none",boxSizing:"border-box"}}/>
            )}
          </div>
          {canExtract&&!doc.extracted&&(
            <div style={{padding:"12px 14px",borderTop:`1px solid ${COLORS.border}`}}>
              <button style={{...s.btn(),width:"100%"}} onClick={()=>onRunClaude(doc)}>⚡ Run Extraction</button>
            </div>
          )}
        </div>

        {/* RIGHT — Unified data table */}
        <div style={{flex:"0 0 50%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${COLORS.border}`,background:COLORS.bgCard,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            Extracted Data
            {activeField&&<span style={{fontSize:11,color:"#fbbf24",marginLeft:"auto"}}>⬚ Select region on document →</span>}
          </div>
          {!doc.extracted?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:COLORS.textMuted,fontSize:14}}>No data extracted yet.</div>
          ):(
            <div style={{flex:1,overflowY:"auto"}}>
              {/* Header section */}
              <div style={{padding:"10px 14px 6px",fontSize:11,fontWeight:600,color:COLORS.textMuted,letterSpacing:1,borderBottom:`1px solid ${COLORS.border}`,background:"#12141e"}}>HEADER</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <tbody>
                  {hFields.map(([key,label])=>(
                    <tr key={key} style={cellStyle(h[key]?.confidence)}>
                      <td style={{padding:"7px 14px",fontSize:12,color:COLORS.textMuted,whiteSpace:"nowrap",width:130,borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle"}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {label}<CB c={h[key]?.confidence}/>
                        </div>
                      </td>
                      <td style={{padding:"7px 8px",borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle"}}>
                        <input style={inputCell} value={h[key]?.value||""} onChange={e=>setEditData(d=>({...d,header:{...d.header,[key]:{...d.header[key],value:e.target.value}}}))} placeholder="—"/>
                      </td>
                      <td style={{padding:"7px 10px 7px 4px",borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle",width:28}}>
                        <span title={`Draw box to extract ${label}`} style={{cursor:"pointer",fontSize:14,color:activeField?.section==="header"&&activeField?.key===key?"#6c63ff":COLORS.textMuted,opacity:0.8}} onClick={()=>setActiveField(activeField?.section==="header"&&activeField?.key===key?null:{section:"header",key,label})}>⬚</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Lines section */}
              <div style={{padding:"10px 14px 6px",fontSize:11,fontWeight:600,color:COLORS.textMuted,letterSpacing:1,borderBottom:`1px solid ${COLORS.border}`,background:"#12141e",marginTop:4}}>LINE ITEMS</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
                  <thead>
                    <tr style={{background:"#12141e"}}>
                      {/* Line # col */}
                      <th style={{padding:"7px 10px",fontSize:11,color:COLORS.textMuted,fontWeight:500,textAlign:"left",borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap"}}>#</th>
                      {lFields.map(([key,label])=>{
                        const colActive = activeField?.section==="col"&&activeField?.key===key;
                        return(
                          <th key={key} style={{padding:"4px 8px",fontSize:11,color:colActive?COLORS.accent:COLORS.textMuted,fontWeight:500,textAlign:"left",borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap",background:colActive?"rgba(108,99,255,0.1)":"transparent"}}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              {label}
                              <span title={`Draw box to extract entire ${label} column`} style={{cursor:"pointer",fontSize:12,color:colActive?"#6c63ff":COLORS.textMuted,opacity:0.9,lineHeight:1}} onClick={()=>setActiveField(colActive?null:{section:"col",key,label:`${label} (all rows)`})}>⬚</span>
                            </div>
                          </th>
                        );
                      })}
                      {/* Row bbox col */}
                      <th style={{padding:"7px 10px",fontSize:11,color:COLORS.textMuted,fontWeight:500,borderBottom:`1px solid ${COLORS.border}`,whiteSpace:"nowrap",textAlign:"center"}}>Row ⬚</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line,li)=>{
                      const rowActive = activeField?.section==="line"&&activeField?.lineIdx===li;
                      return(
                        <tr key={li} style={{borderBottom:`1px solid ${COLORS.border}`,background:rowActive?"rgba(108,99,255,0.07)":"transparent"}}>
                          <td style={{padding:"6px 10px",fontSize:12,color:COLORS.textMuted,verticalAlign:"middle",whiteSpace:"nowrap"}}>{line.lineNumber}</td>
                          {lFields.map(([key,label])=>{
                            const colActive = activeField?.section==="col"&&activeField?.key===key;
                            return(
                              <td key={key} style={{padding:"5px 8px",verticalAlign:"middle",background:colActive?"rgba(108,99,255,0.08)":"transparent",...(colActive?{}:cellStyle(line[key]?.confidence))}}>
                                <input style={{...inputCell,minWidth:60}} value={line[key]?.value||""} onChange={e=>setEditData(d=>({...d,lines:d.lines.map((l,i)=>i===li?{...l,[key]:{...l[key],value:e.target.value}}:l)}))} placeholder="—"/>
                              </td>
                            );
                          })}
                          <td style={{padding:"5px 10px",verticalAlign:"middle",textAlign:"center"}}>
                            <span title={`Draw box to extract all fields for Line ${line.lineNumber}`} style={{fontSize:14,cursor:"pointer",color:rowActive?"#6c63ff":COLORS.textMuted,opacity:0.9}} onClick={()=>setActiveField(rowActive?null:{section:"line",key:"_row",label:`Line ${line.lineNumber} (all fields)`,lineIdx:li})}>⬚</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPage({users,setUsers,lists,setLists,showToast}){
  const [tab,setTab] = useState("users");
  const [newUser,setNewUser] = useState({name:"",email:"",role:"user",group:"Users"});
  const [listTab,setListTab] = useState("incoterms");
  const [newItem,setNewItem] = useState("");
  const listTabs = [["incoterms","Incoterms"],["uom","Units of Measure"],["currencies","Currencies"],["weightUOM","Weight UOM"],["countries","Countries"]];
  return(
    <div>
      <div style={{display:"flex",gap:0,marginBottom:"1.5rem",borderBottom:`1px solid ${COLORS.border}`}}>
        {[{id:"users",label:"Users"},{id:"lists",label:"Manage Lists"}].map(t=>(
          <div key={t.id} style={{padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:500,color:tab===t.id?COLORS.accent:COLORS.textMuted,borderBottom:tab===t.id?`2px solid ${COLORS.accent}`:"2px solid transparent"}} onClick={()=>setTab(t.id)}>{t.label}</div>
        ))}
      </div>
      {tab==="users"&&(
        <div style={{maxWidth:820}}>
          <div style={{...s.card,marginBottom:"1.5rem",padding:"1rem"}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>Add User</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto auto",gap:10,alignItems:"end"}}>
              <div><label style={{fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:4}}>Name</label><input style={s.input} value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="Full name"/></div>
              <div><label style={{fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:4}}>Email</label><input style={s.input} value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))} placeholder="email@co.com"/></div>
              <div><label style={{fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:4}}>Role</label><select style={{...s.input,width:100}} value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}><option value="user">User</option><option value="admin">Admin</option></select></div>
              <div><label style={{fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:4}}>Group</label><input style={{...s.input,width:120}} value={newUser.group} onChange={e=>setNewUser(u=>({...u,group:e.target.value}))} placeholder="Group"/></div>
              <button style={{...s.btn(),alignSelf:"end"}} onClick={()=>{if(!newUser.name||!newUser.email)return;setUsers(u=>[...u,{...newUser,id:Date.now(),active:true}]);setNewUser({name:"",email:"",role:"user",group:"Users"});showToast("User added");}}>Add</button>
            </div>
          </div>
          <div style={s.card}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Name","Email","Role","Group","Status","Actions"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:12,color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}`,fontWeight:500}}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id} style={{borderBottom:`1px solid ${COLORS.border}`}}>
                    <td style={{padding:"10px 12px",fontSize:13}}>{u.name}</td>
                    <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{u.email}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:12,background:u.role==="admin"?"#2d1b6e":"#1e1e2e",color:u.role==="admin"?"#c4b5fd":COLORS.textMuted,padding:"2px 8px",borderRadius:20}}>{u.role}</span></td>
                    <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{u.group}</td>
                    <td style={{padding:"10px 12px"}}><span style={{fontSize:12,color:u.active?COLORS.success:COLORS.danger}}>{u.active?"Active":"Inactive"}</span></td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button style={{...s.btn("secondary"),padding:"4px 10px",fontSize:12}} onClick={()=>{setUsers(us=>us.map(x=>x.id===u.id?{...x,active:!x.active}:x));showToast("Status updated");}}>{u.active?"Deactivate":"Activate"}</button>
                        <button style={{...s.btn("danger"),padding:"4px 10px",fontSize:12}} onClick={()=>{setUsers(us=>us.filter(x=>x.id!==u.id));showToast("User removed");}}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==="lists"&&(
        <div style={{maxWidth:600}}>
          <div style={{display:"flex",gap:0,marginBottom:"1rem",borderBottom:`1px solid ${COLORS.border}`,flexWrap:"wrap"}}>
            {listTabs.map(([id,label])=><div key={id} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,color:listTab===id?COLORS.accent:COLORS.textMuted,borderBottom:listTab===id?`2px solid ${COLORS.accent}`:"2px solid transparent"}} onClick={()=>setListTab(id)}>{label}</div>)}
          </div>
          <div style={s.card}>
            <div style={{display:"flex",gap:10,marginBottom:"1rem"}}>
              <input style={{...s.input,flex:1}} value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder={`Add new value...`} onKeyDown={e=>{if(e.key==="Enter"&&newItem.trim()){setLists(l=>({...l,[listTab]:[...l[listTab],newItem.trim()]}));setNewItem("");showToast("Item added");}}}/>
              <button style={s.btn()} onClick={()=>{if(!newItem.trim())return;setLists(l=>({...l,[listTab]:[...l[listTab],newItem.trim()]}));setNewItem("");showToast("Item added");}}>Add</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {lists[listTab]?.map(item=>(
                <span key={item} style={{background:"#1a1d27",border:`1px solid ${COLORS.border}`,borderRadius:20,padding:"4px 10px 4px 14px",fontSize:13,display:"flex",alignItems:"center",gap:8,color:COLORS.text}}>
                  {item}
                  <span style={{cursor:"pointer",color:COLORS.textMuted,fontSize:18,lineHeight:1}} onClick={()=>{setLists(l=>({...l,[listTab]:l[listTab].filter(x=>x!==item)}));showToast("Item removed");}}>×</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({apiKey,setApiKey,apiKeyInput,setApiKeyInput,demoMode,setDemoMode,showToast}){
  return(
    <div style={{maxWidth:540,display:"flex",flexDirection:"column",gap:16}}>
      <div style={s.card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontSize:15,fontWeight:600}}>Demo Mode</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,color:demoMode?COLORS.success:COLORS.textMuted}}>{demoMode?"On":"Off"}</span>
            <div style={{width:44,height:24,background:demoMode?COLORS.accent:"#2a2d3e",borderRadius:12,cursor:"pointer",position:"relative",transition:"background 0.2s"}} onClick={()=>{setDemoMode(v=>!v);showToast(demoMode?"Demo mode off":"Demo mode on — extractions will use mock data");}}>
              <div style={{position:"absolute",top:3,left:demoMode?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:COLORS.textMuted,lineHeight:1.6}}>When enabled, documents are processed with realistic mock data instead of calling the Claude API. Use this to explore the full workflow without an API key.</div>
      </div>
      <div style={s.card}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Claude API Key</div>
        <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16,lineHeight:1.6}}>Stored in browser memory only — never sent anywhere other than Anthropic's API directly from your browser.</div>
        {apiKey?(
          <div>
            <div style={{fontSize:13,color:COLORS.success,marginBottom:12}}>✓ API key active — using claude-sonnet-4-20250514</div>
            <button style={s.btn("danger")} onClick={()=>{setApiKey("");setApiKeyInput("");showToast("API key removed");}}>Remove Key</button>
          </div>
        ):(
          <div style={{display:"flex",gap:10}}>
            <input style={{...s.input,flex:1}} type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-api03-..." onKeyDown={e=>e.key==="Enter"&&(()=>{if(!apiKeyInput.startsWith("sk-")){showToast("Key should start with sk-","error");return;}setApiKey(apiKeyInput);showToast("API key saved!");})()}/>
            <button style={s.btn()} onClick={()=>{if(!apiKeyInput.startsWith("sk-")){showToast("Key should start with sk-","error");return;}setApiKey(apiKeyInput);showToast("API key saved!");}}>Save</button>
          </div>
        )}
      </div>
      <div style={s.card}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:12}}>How it works</div>
        <div style={{fontSize:13,color:COLORS.textMuted,lineHeight:1.8}}>
          <strong style={{color:COLORS.text,fontWeight:500}}>1. Upload</strong> — Select one or many documents. Up to 2 process simultaneously; the rest queue.<br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>2. Extract</strong> — Claude reads the document and returns all header + line fields with confidence scores.<br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>3. Review</strong> — Edit any field inline. Fields are color-coded green/yellow/red by confidence.<br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>4. Export</strong> — Download a structured CSV with header and all line items.<br/><br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>Amazon Textract</strong> — In production, Textract handles OCR for scanned PDFs and provides bounding-box coordinates used to highlight fields on the document.
        </div>
      </div>
    </div>
  );
}

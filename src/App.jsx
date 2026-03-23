import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const INCOTERMS     = ["FOB","Ex-Works","DDP","DAP","CIF","CFR","EXW","FCA","CPT","CIP","DAT"];
const UOM_LIST      = ["Each","Piece","Box","Carton","Pallet","Kilogram","Gram","Pound","Ounce","Liter","Meter","Set"];
const CURRENCIES    = ["USD","EUR","GBP","CNY","CAD","AUD","JPY","CHF","INR","MXN"];
const WEIGHT_UOM    = ["Gram","Kilogram","Pound","Ounce","Ton"];
const COUNTRIES     = ["US","CN","CA","GB","DE","FR","JP","MX","IN","KR","TW","VN","TH","BR","IT"];
const PROCESSING_SLOTS = 2;

const COLORS = {
  bg:"#0f1117", bgCard:"#1a1d27", bgCardHover:"#1f2235", border:"#2a2d3e",
  accent:"#6c63ff", text:"#e2e4f0", textMuted:"#8b8fa8",
  success:"#22c55e", danger:"#ef4444", info:"#3b82f6",
};

const confColor = c =>
  c==="high"   ? {bg:"#052e16",border:"#16a34a",text:"#4ade80"} :
  c==="medium" ? {bg:"#451a03",border:"#d97706",text:"#fbbf24"} :
                 {bg:"#450a0a",border:"#dc2626",text:"#f87171"};

const s = {
  app:{ fontFamily:"'Inter',system-ui,sans-serif", background:COLORS.bg, minHeight:"100vh", color:COLORS.text },
  sidebar:{ width:220, background:COLORS.bgCard, borderRight:`1px solid ${COLORS.border}`, display:"flex", flexDirection:"column", padding:"0 0 1rem" },
  logo:{ padding:"1.25rem 1rem", borderBottom:`1px solid ${COLORS.border}`, fontSize:15, fontWeight:600, letterSpacing:-0.3 },
  navItem: a => ({ display:"flex", alignItems:"center", gap:10, padding:"10px 1rem", cursor:"pointer", fontSize:14, color:a?COLORS.text:COLORS.textMuted, background:a?`${COLORS.accent}22`:"transparent", borderLeft:a?`2px solid ${COLORS.accent}`:"2px solid transparent", transition:"all 0.15s", userSelect:"none" }),
  main:{ flex:1, display:"flex", flexDirection:"column", overflow:"auto" },
  topbar:{ padding:"1rem 1.5rem", borderBottom:`1px solid ${COLORS.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:COLORS.bgCard },
  page:{ padding:"1.5rem", flex:1 },
  card:{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"1.25rem" },
  btn:(v="primary")=>({
    background: v==="primary"?COLORS.accent:v==="danger"?"#7f1d1d":v==="success"?"#14532d":COLORS.bgCardHover,
    color:      v==="primary"?"#fff":v==="danger"?"#fca5a5":v==="success"?"#86efac":COLORS.text,
    border:     v==="ghost"?`1px solid ${COLORS.border}`:"none",
    padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:500, transition:"opacity 0.15s",
  }),
  input:{ background:"#0d0f18", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"8px 12px", color:COLORS.text, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" },
  statusBadge: st => {
    const m={ Queued:{bg:"#1e3a5f",c:"#93c5fd"}, Processing:{bg:"#3d2b00",c:"#fcd34d"}, "Need Review":{bg:"#3b1c00",c:"#fb923c"}, Reviewed:{bg:"#052e16",c:"#4ade80"}, Error:{bg:"#3b0000",c:"#f87171"} };
    const t=m[st]||m.Queued;
    return { background:t.bg, color:t.c, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:500, whiteSpace:"nowrap" };
  },
};

function genMockExtracted() {
  const rnd = a => a[Math.floor(Math.random()*a.length)];
  const conf= ()=>rnd(["high","high","medium","low"]);
  const n   = 2+Math.floor(Math.random()*4);
  const lines = Array.from({length:n},(_,i)=>({
    lineNumber:i+1,
    poNumber:{value:`PO-${44500+Math.floor(Math.random()*100)}`,confidence:conf()},
    partNumber:{value:`PART-${1000+Math.floor(Math.random()*9000)}`,confidence:conf()},
    description:{value:rnd(["Industrial Widget Assembly","Bracket Mounting Kit","Electronic Control Module","Steel Fastener Set"]),confidence:conf()},
    hsCode:{value:`${8400+Math.floor(Math.random()*99)}.${10+Math.floor(Math.random()*89)}`,confidence:conf()},
    quantity:{value:String(10+Math.floor(Math.random()*490)),confidence:"high"},
    quantityUOM:{value:"Each",confidence:"high"},
    unitPrice:{value:(5+Math.random()*95).toFixed(2),confidence:conf()},
    currency:{value:"USD",confidence:"high"},
    totalLine:{value:(50+Math.random()*5000).toFixed(2),confidence:conf()},
    unitWeight:{value:String(100+Math.floor(Math.random()*900)),confidence:conf()},
    totalLineWeight:{value:String(1000+Math.floor(Math.random()*50000)),confidence:conf()},
    weightUOM:{value:"Gram",confidence:conf()},
    countryOfOrigin:{value:rnd(["CN","US","DE","TW","VN"]),confidence:conf()},
  }));
  const total = lines.reduce((a,l)=>a+parseFloat(l.totalLine.value),0);
  return {
    header:{
      sellerName:{value:rnd(["Shenzhen Precision Parts Co.","Global Manufacturing Inc"]),confidence:conf()},
      sellerAddress:{value:"123 Industrial Road, Shenzhen, China 518000",confidence:conf()},
      buyerName:{value:rnd(["Acme Imports LLC","North American Trade Corp"]),confidence:conf()},
      buyerAddress:{value:"456 Commerce Blvd, Chicago, IL 60601",confidence:conf()},
      invoiceNumber:{value:`INV-2024-${String(Math.floor(Math.random()*99999)).padStart(5,"0")}`,confidence:"high"},
      invoiceTotal:{value:`$${total.toFixed(2)}`,confidence:conf()},
      incoterm:{value:rnd(["FOB","DDP","Ex-Works","CIF"]),confidence:conf()},
      totalWeight:{value:String(100+Math.floor(Math.random()*900)),confidence:conf()},
      totalWeightUOM:{value:"Kilogram",confidence:conf()},
    },
    lines,
  };
}

export default function App() {
  const [page,setPage]                     = useState("login");
  const [user,setUser]                     = useState(null);
  const [profile,setProfile]               = useState(null);
  const [docs,setDocs]                     = useState([]);
  const [reviewDoc,setReviewDoc]           = useState(null);
  const [savedTemplates,setSavedTemplates] = useState([]);
  const [loginData,setLoginData]           = useState({email:"",password:"",name:"",mode:"login",resetSent:false});
  const [statusFilter,setStatusFilter]     = useState("All");
  const [search,setSearch]                 = useState("");
  const [selected,setSelected]             = useState([]);
  const [dateFrom,setDateFrom]             = useState("");
  const [dateTo,setDateTo]                 = useState("");
  const [sortCol,setSortCol]               = useState("uploaded_at");
  const [sortDir,setSortDir]               = useState("desc");
  const [currentPage,setCurrentPage]       = useState(1);
  const [uploadQueue,setUploadQueue]       = useState([]);
  const [lists,setLists]                   = useState({incoterms:[...INCOTERMS],uom:[...UOM_LIST],currencies:[...CURRENCIES],weightUOM:[...WEIGHT_UOM],countries:[...COUNTRIES]});
  const [toast,setToast]                   = useState(null);
  const [loading,setLoading]               = useState(true);
  const pageSize = 50;

  const showToast = (msg,type="success",duration=4000) => { setToast({msg,type}); setTimeout(()=>setToast(null),duration); };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){ setUser(session.user); loadUserData(session.user.id); setPage("dashboard"); }
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      if(session){ setUser(session.user); loadUserData(session.user.id); setPage("dashboard"); }
      else { setUser(null); setProfile(null); setDocs([]); setSavedTemplates([]); setPage("login"); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadUserData = async uid => {
    const [{data:prof},{data:documents},{data:tmpl}] = await Promise.all([
      supabase.from("profiles").select("*").eq("id",uid).single(),
      supabase.from("documents").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
      supabase.from("templates").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
    ]);
    if(prof)       setProfile(prof);
    if(documents)  setDocs(documents.map(d=>({...d,uploaded:d.uploaded_at,type:d.file_type,uploadedBy:d.uploaded_by})));
    if(tmpl)       setSavedTemplates(tmpl.map(t=>({...t,createdBy:t.created_by,createdAt:new Date(t.created_at).toLocaleDateString()})));
  };

  const login = async()=>{
    if(!loginData.email||!loginData.password){showToast("Enter email and password","error");return;}
    const {error}=await supabase.auth.signInWithPassword({email:loginData.email,password:loginData.password});
    if(error) showToast(error.message,"error");
  };
  const signup = async()=>{
    if(!loginData.email||!loginData.password||!loginData.name){showToast("Fill in all fields","error");return;}
    if(loginData.password.length<6){showToast("Password must be at least 6 characters","error");return;}
    showToast("Creating account...","info");
    const {data,error}=await supabase.auth.signUp({email:loginData.email,password:loginData.password,options:{data:{name:loginData.name}}});
    if(error){showToast(error.message,"error");return;}
    if(data?.user?.identities?.length===0){showToast("Email already registered — try signing in","error");return;}
    showToast("Account created! Sign in to continue.");
  };
  const resetPassword = async()=>{
    if(!loginData.email){showToast("Enter your email","error");return;}
    const {error}=await supabase.auth.resetPasswordForEmail(loginData.email);
    if(error) showToast(error.message,"error");
    else setLoginData(d=>({...d,resetSent:true}));
  };
  const logout = async()=>{ await supabase.auth.signOut(); };

  const updateDoc = (id,updates) => setDocs(d=>d.map(x=>x.id===id?{...x,...updates}:x));

  const buildExtractionPrompt = (doc,template)=>{
    let tCtx="";
    if(template){
      const h=template.data?.header||{};
      const tl=template.data?.lines||[];
      const hh=Object.entries(h).filter(([,v])=>v?.value).map(([k,v])=>`  - ${k}: e.g. "${v.value}"`).join("\n");
      const lh=tl[0]?Object.entries(tl[0]).filter(([k,v])=>k!=="lineNumber"&&v?.value).map(([k,v])=>`  - ${k}: e.g. "${v.value}"`).join("\n"):"";
      tCtx=`\nPREVIOUS TEMPLATE HINTS:\nHeader:\n${hh}\nLine items:\n${lh}\n`;
    }
    return `You are an expert invoice data extraction AI. Extract ALL data carefully from the provided invoice.

RULES:
- Return ONLY valid JSON — no markdown, no explanation, no code fences
- Extract EVERY line item — do not skip any rows
- confidence: "high","medium","low" only
- Currency: ISO 3-char (USD,EUR,GBP etc.)
- Country of origin: ISO 2-char (US,CN,DE etc.)
- Incoterm: standard codes (FOB,DDP,CIF,EXW etc.)
- Missing fields: value="" confidence="low"
- Line numbers start at 1
${tCtx}
Return this exact JSON:
{
  "header":{
    "sellerName":{"value":"","confidence":""},
    "sellerAddress":{"value":"","confidence":""},
    "buyerName":{"value":"","confidence":""},
    "buyerAddress":{"value":"","confidence":""},
    "invoiceNumber":{"value":"","confidence":""},
    "invoiceTotal":{"value":"","confidence":""},
    "incoterm":{"value":"","confidence":""},
    "totalWeight":{"value":"","confidence":""},
    "totalWeightUOM":{"value":"","confidence":""}
  },
  "lines":[{
    "lineNumber":1,
    "poNumber":{"value":"","confidence":""},
    "partNumber":{"value":"","confidence":""},
    "description":{"value":"","confidence":""},
    "hsCode":{"value":"","confidence":""},
    "quantity":{"value":"","confidence":""},
    "quantityUOM":{"value":"","confidence":""},
    "unitPrice":{"value":"","confidence":""},
    "currency":{"value":"","confidence":""},
    "totalLine":{"value":"","confidence":""},
    "unitWeight":{"value":"","confidence":""},
    "totalLineWeight":{"value":"","confidence":""},
    "weightUOM":{"value":"","confidence":""},
    "countryOfOrigin":{"value":"","confidence":""}
  }]
}
If there are 10 line items return 10 objects in the lines array.`;
  };

  const runExtractWithClaude = async doc=>{
    updateDoc(doc.id,{status:"Processing"});
    if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Processing"}));
    const assignedTemplate=savedTemplates.find(t=>t.name===doc.template_name)||null;
    try{
      const prompt=buildExtractionPrompt(doc,assignedTemplate);

      // Step 1 — download PDF
      let pdfBase64=null;
      if(doc.file_path){
        const {data:fd,error:fe}=await supabase.storage.from("documents").download(doc.file_path);
        if(!fe&&fd){
          const bytes=new Uint8Array(await fd.arrayBuffer());
          let bin="";
          for(let i=0;i<bytes.byteLength;i+=8192) bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
          pdfBase64=btoa(bin);
        }
      }

      // Step 2 — try Textract
      let textractData=null, usingTextract=false;
      if(pdfBase64){
        showToast("Checking Textract...","info");
        try{
          const txRes=await fetch("/api/textract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64})});
          const txData=await txRes.json();
          if(txData?.available&&txData.fullText){
            textractData=txData; usingTextract=true;
            showToast("Textract OCR complete — extracting with Claude...","info");
            if(txData.pageCount>1){
              await supabase.from("documents").update({pages:txData.pageCount}).eq("id",doc.id);
              updateDoc(doc.id,{pages:txData.pageCount});
            }
          } else {
            showToast("Textract not configured — using Claude PDF extraction...","info");
          }
        }catch(txErr){
          showToast("Textract unavailable — falling back to Claude...","info");
        }
      }

      // Step 3 — Claude extraction
      const res=await fetch("/api/extract",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt,pdfBase64:usingTextract?null:pdfBase64,textractData})
      });
      if(!res.ok) throw new Error("API error "+res.status+": "+await res.text());
      const data=await res.json();
      if(data.error) throw new Error(data.error);
      const txt=data.content?.map(x=>x.text||"").join("").trim();
      const parsed=JSON.parse(txt);

      // Step 4 — attach Textract bounding boxes
      if(usingTextract&&textractData){
        const allLines=textractData.textLines||[];
        const kvPairs=textractData.kvPairs||[];
        const findBbox=val=>{
          if(!val) return null;
          const v=val.toLowerCase().trim();
          const kv=kvPairs.find(k=>k.value?.toLowerCase().includes(v)||v.includes(k.value?.toLowerCase()||""));
          if(kv?.valueBbox) return kv.valueBbox;
          const ln=allLines.find(l=>l.text.toLowerCase().includes(v)||v.includes(l.text.toLowerCase()));
          return ln?.bbox||null;
        };
        if(parsed.header) Object.keys(parsed.header).forEach(k=>{ if(parsed.header[k]?.value) parsed.header[k].bbox=findBbox(parsed.header[k].value); });
        if(parsed.lines)  parsed.lines.forEach(line=>Object.keys(line).forEach(k=>{ if(k!=="lineNumber"&&line[k]?.value) line[k].bbox=findBbox(line[k].value); }));
      }

      // Step 5 — get page count if not from Textract
      let pageCount=doc.pages||1;
      if(!usingTextract&&pdfBase64){
        try{
          if(!window.pdfjsLib){
            await new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
            window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          const bytes=Uint8Array.from(atob(pdfBase64),c=>c.charCodeAt(0));
          pageCount=(await window.pdfjsLib.getDocument({data:bytes}).promise).numPages;
        }catch(_){}
      }

      await supabase.from("documents").update({status:"Need Review",extracted:parsed,lines:parsed.lines?.length||0,pages:pageCount}).eq("id",doc.id);
      updateDoc(doc.id,{status:"Need Review",extracted:parsed,lines:parsed.lines?.length||0,pages:pageCount});
      if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Need Review",extracted:parsed,lines:parsed.lines?.length||0,pages:pageCount}));
      showToast(usingTextract?"Extraction complete (Textract + Claude)":"Extraction complete (Claude)");

    }catch(err){
      console.error("Extraction failed:",err);
      const errMsg=err.message||"Unknown error";
      await supabase.from("documents").update({status:"Error",extracted:{error:errMsg}}).eq("id",doc.id);
      updateDoc(doc.id,{status:"Error",extracted:{error:errMsg}});
      if(reviewDoc?.id===doc.id) setReviewDoc(r=>({...r,status:"Error",extracted:{error:errMsg}}));
      showToast("Extraction failed: "+errMsg,"error",7000);
    }
  };

  useEffect(()=>{
    const processing=docs.filter(d=>d.status==="Processing").length;
    const queued=docs.filter(d=>d.status==="Queued");
    if(processing<PROCESSING_SLOTS&&queued.length>0)
      queued.slice(0,PROCESSING_SLOTS-processing).forEach(d=>runExtractWithClaude(d));
  },[docs.map(d=>d.status).join(",")]);

  const handleFileSelect=e=>{
    Array.from(e.target.files||[]).forEach((f,i)=>{
      const item={id:Date.now()+i+Math.random(),file:f,name:f.name,size:f.size,type:f.name.split(".").pop().toUpperCase(),template:"None",pdfData:null};
      if(f.name.toLowerCase().endsWith(".pdf")){
        const r=new FileReader();
        r.onload=ev=>setUploadQueue(q=>q.map(x=>x.id===item.id?{...x,pdfData:ev.target.result}:x));
        r.readAsArrayBuffer(f);
      }
      setUploadQueue(q=>[...q,item]);
    });
  };

  const beginExtraction=async()=>{
    if(!uploadQueue.length) return;
    const today=new Date().toISOString().split("T")[0];
    for(const q of uploadQueue){
      let filePath=null;
      if(q.file){
        const safeName=q.name.replace(/[^a-zA-Z0-9._-]/g,"_");
        const path=`${user.id}/${Date.now()}_${safeName}`;
        const {data:up,error:upErr}=await supabase.storage.from("documents").upload(path,q.file,{upsert:false,contentType:q.file.type||"application/octet-stream"});
        if(upErr) showToast("Upload failed: "+upErr.message,"error");
        else filePath=up.path;
      }
      const {data:doc}=await supabase.from("documents").insert({
        user_id:user.id,name:q.name,status:"Queued",uploaded_at:today,
        file_type:q.type,pages:1,lines:0,extracted:null,
        template_name:q.template!=="None"?q.template:null,
        uploaded_by:profile?.name||user.email,file_path:filePath,file_size:q.file?.size||0
      }).select().single();
      if(doc) setDocs(d=>[{...doc,uploaded:doc.uploaded_at,type:doc.file_type,uploadedBy:doc.uploaded_by},...d]);
    }
    setUploadQueue([]);
    setPage("dashboard");
    showToast(uploadQueue.length+" document(s) queued");
  };

  const deleteDoc=async id=>{
    const doc=docs.find(d=>d.id===id);
    if(doc?.file_path) await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id",id);
    setDocs(d=>d.filter(x=>x.id!==id)); setSelected(s=>s.filter(x=>x!==id));
    showToast("Document deleted");
  };
  const deleteBulk=async()=>{
    const paths=docs.filter(d=>selected.includes(d.id)&&d.file_path).map(d=>d.file_path);
    if(paths.length) await supabase.storage.from("documents").remove(paths);
    await supabase.from("documents").delete().in("id",selected);
    setDocs(d=>d.filter(x=>!selected.includes(x.id))); setSelected([]);
    showToast("Documents deleted");
  };
  const markReviewed=async doc=>{
    const reviewer=profile?.name||user.email;
    await supabase.from("documents").update({status:"Reviewed",reviewer}).eq("id",doc.id);
    updateDoc(doc.id,{status:"Reviewed",reviewer});
    setReviewDoc(r=>r?{...r,status:"Reviewed",reviewer}:r);
    showToast("Marked as reviewed");
  };
  const saveTemplate=async t=>{
    const {data}=await supabase.from("templates").insert({user_id:user.id,name:t.name,created_by:profile?.name||user.email,data:t.data}).select().single();
    if(data){setSavedTemplates(ts=>[{...data,createdBy:data.created_by,createdAt:new Date(data.created_at).toLocaleDateString()},...ts]);showToast(`Template "${t.name}" saved!`);}
  };

  const exportCSV=docList=>{
    const arr=Array.isArray(docList)?docList:[docList];
    const valid=arr.filter(d=>d.extracted&&!d.extracted.error);
    if(!valid.length){showToast("No extracted data to export","error");return;}
    const hCols=["Seller Name","Seller Address","Buyer Name","Buyer Address","Invoice Number","Invoice Total","Incoterm","Total Weight","Total Weight UOM"];
    const lCols=["Line#","PO Number","Part Number","Description","HS Code","Qty","Qty UOM","Unit Price","Currency","Total Line Price","Unit Weight","Total Line Weight","Weight UOM","Country of Origin"];
    const rows=[[...hCols,...lCols]];
    valid.forEach(doc=>{
      const h=doc.extracted?.header||{};
      const lines=doc.extracted?.lines||[];
      const hv=[h.sellerName?.value||"",h.sellerAddress?.value||"",h.buyerName?.value||"",h.buyerAddress?.value||"",h.invoiceNumber?.value||"",h.invoiceTotal?.value||"",h.incoterm?.value||"",h.totalWeight?.value||"",h.totalWeightUOM?.value||""];
      lines.forEach(l=>rows.push([...hv,l.lineNumber,l.poNumber?.value||"",l.partNumber?.value||"",l.description?.value||"",l.hsCode?.value||"",l.quantity?.value||"",l.quantityUOM?.value||"",l.unitPrice?.value||"",l.currency?.value||"",l.totalLine?.value||"",l.unitWeight?.value||"",l.totalLineWeight?.value||"",l.weightUOM?.value||"",l.countryOfOrigin?.value||""]));
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=valid.length===1?valid[0].name.replace(/\.[^.]+$/,".csv"):`export_${valid.length}_documents.csv`;
    a.click();
    showToast(`Exported ${valid.length} doc${valid.length>1?"s":""} (${rows.length-1} lines total)`);
  };

  const filteredDocs=docs.filter(d=>{
    if(statusFilter!=="All"&&d.status!==statusFilter) return false;
    if(search&&!d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(dateFrom&&d.uploaded<dateFrom) return false;
    if(dateTo&&d.uploaded>dateTo) return false;
    return true;
  }).sort((a,b)=>{ const av=a[sortCol]||"",bv=b[sortCol]||""; return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1); });

  const pagedDocs   =filteredDocs.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const totalPages  =Math.ceil(filteredDocs.length/pageSize);
  const statusCounts=["Queued","Processing","Need Review","Reviewed","Error"].reduce((acc,st)=>{acc[st]=docs.filter(d=>d.status===st).length;return acc;},{});
  const sortToggle  =col=>{ if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortCol(col);setSortDir("asc");} };

  const nav=[
    {id:"dashboard",label:"Dashboard",icon:"▦"},
    {id:"upload",label:"New Upload",icon:"↑"},
    ...(profile?.role==="admin"?[{id:"admin",label:"Admin",icon:"⚙"}]:[]),
    {id:"settings",label:"Settings",icon:"◎"},
  ];

  const Toast=()=>toast?<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:999,background:toast.type==="error"?COLORS.danger:toast.type==="info"?COLORS.info:COLORS.success,color:"#fff",padding:"10px 24px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap",maxWidth:"80vw",textAlign:"center"}}>{toast.msg}</div>:null;

  if(loading) return <div style={{...s.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><div style={{color:COLORS.textMuted,fontSize:14}}>Loading...</div></div>;
  if(page==="login") return <><Toast/><LoginPage loginData={loginData} setLoginData={setLoginData} onLogin={login} onSignup={signup} onReset={resetPassword}/></>;
  if(page==="review"&&reviewDoc) return <><Toast/><ReviewPage doc={reviewDoc} onBack={()=>setPage("dashboard")} onMarkReviewed={markReviewed} onExport={exportCSV} onRunClaude={runExtractWithClaude} user={user} profile={profile} templates={savedTemplates} onSaveTemplate={saveTemplate}/></>;

  return(
    <div style={{...s.app,display:"flex",height:"100vh",overflow:"hidden"}}>
      <Toast/>
      <div style={s.sidebar}>
        <div style={s.logo}>⬡ InvoiceAI</div>
        <div style={{flex:1,paddingTop:8}}>
          {nav.map(n=><div key={n.id} style={s.navItem(page===n.id)} onClick={()=>setPage(n.id)}><span style={{fontSize:16}}>{n.icon}</span>{n.label}</div>)}
        </div>
        <div style={{padding:"0 1rem"}}>
          <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:2}}>{profile?.name||user?.email}</div>
          <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:10,textTransform:"capitalize"}}>{profile?.role||"user"}</div>
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
          {page==="admin"&&<AdminPage profile={profile} supabase={supabase} lists={lists} setLists={setLists} showToast={showToast}/>}
          {page==="settings"&&<SettingsPage profile={profile} setProfile={setProfile} supabase={supabase} showToast={showToast}/>}
        </div>
      </div>
    </div>
  );
}

// ─── Toast helper (inline) ────────────────────────────────────────────────────
function ToastBar({toast}){
  if(!toast) return null;
  return <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:999,background:toast.type==="error"?COLORS.danger:toast.type==="info"?COLORS.info:COLORS.success,color:"#fff",padding:"10px 24px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap",maxWidth:"80vw",textAlign:"center"}}>{toast.msg}</div>;
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPage({loginData,setLoginData,onLogin,onSignup,onReset}){
  const set=k=>e=>setLoginData(d=>({...d,[k]:e.target.value}));
  const isReset=loginData.mode==="reset", isSignup=loginData.mode==="signup";
  return(
    <div style={{...s.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:380}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:32,marginBottom:8}}>⬡</div>
          <div style={{fontSize:22,fontWeight:600}}>InvoiceAI</div>
          <div style={{fontSize:14,color:COLORS.textMuted,marginTop:4}}>Document extraction platform</div>
        </div>
        <div style={s.card}>
          <div style={{fontSize:16,fontWeight:600,marginBottom:20}}>{isReset?"Reset Password":isSignup?"Create Account":"Sign In"}</div>
          {isReset&&loginData.resetSent?(
            <div style={{color:COLORS.success,fontSize:14,textAlign:"center",padding:"1rem 0"}}>Reset email sent — check your inbox.</div>
          ):(
            <>
              {isSignup&&<div style={{marginBottom:12}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Full Name</label><input style={s.input} value={loginData.name||""} onChange={set("name")} placeholder="Your name"/></div>}
              <div style={{marginBottom:12}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Email</label><input style={s.input} type="email" value={loginData.email} onChange={set("email")} placeholder="you@company.com"/></div>
              {!isReset&&<div style={{marginBottom:20}}><label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Password</label><input style={s.input} type="password" value={loginData.password} onChange={set("password")} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&(isSignup?onSignup():onLogin())}/></div>}
              <button style={{...s.btn(),width:"100%",padding:"10px",fontSize:14}} onClick={isReset?onReset:isSignup?onSignup:onLogin}>{isReset?"Send Reset Link":isSignup?"Create Account":"Sign In"}</button>
            </>
          )}
          <div style={{marginTop:16,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            {!isSignup&&!isReset&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"signup"}))}>Create account</span>}
            {!isReset&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"reset"}))}>Forgot password?</span>}
            {(isReset||isSignup)&&<span style={{fontSize:13,color:COLORS.accent,cursor:"pointer"}} onClick={()=>setLoginData(d=>({...d,mode:"login",resetSent:false}))}>Back to sign in</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({docs,statusCounts,statusFilter,setStatusFilter,search,setSearch,selected,setSelected,onDelete,onDeleteBulk,onExport,onReview,dateFrom,setDateFrom,dateTo,setDateTo,sortCol,sortDir,onSort,currentPage,setCurrentPage,totalPages}){
  const buckets=["Queued","Processing","Need Review","Reviewed","Error"];
  const bucketText={Queued:"#93c5fd",Processing:"#fcd34d","Need Review":"#fb923c",Reviewed:"#4ade80",Error:"#f87171"};
  const allSelected=docs.length>0&&docs.every(d=>selected.includes(d.id));
  const toggleAll=()=>allSelected?setSelected(s=>s.filter(x=>!docs.map(d=>d.id).includes(x))):setSelected(s=>[...new Set([...s,...docs.map(d=>d.id)])]);
  const fmtSize=b=>!b?"-":b>1e6?`${(b/1e6).toFixed(1)}MB`:b>1e3?`${(b/1e3).toFixed(0)}KB`:`${b}B`;
  const errorDocs=docs.filter(d=>d.status==="Error"&&d.extracted?.error);
  const Th=({col,label,center})=>(
    <th style={{padding:"10px 12px",textAlign:center?"center":"left",fontSize:12,color:COLORS.textMuted,fontWeight:500,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap",borderBottom:`1px solid ${COLORS.border}`}} onClick={()=>onSort(col)}>
      {label}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
    </th>
  );
  return(
    <div>
      {errorDocs.length>0&&(
        <div style={{background:"#3b0000",border:"1px solid #dc2626",borderRadius:10,padding:"12px 16px",marginBottom:"1rem"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#f87171",marginBottom:6}}>⚠ Extraction Errors</div>
          {errorDocs.map(d=>(
            <div key={d.id} style={{fontSize:12,color:"#fca5a5",marginBottom:4,display:"flex",gap:8}}>
              <span style={{fontWeight:500,flexShrink:0}}>{d.name}:</span>
              <span style={{color:"#fda4a4"}}>{d.extracted.error}</span>
            </div>
          ))}
          <div style={{fontSize:11,color:"#f87171",marginTop:8,opacity:0.8}}>Tip: Rate limit errors resolve by waiting 60 seconds then re-extracting. Large documents may need splitting.</div>
        </div>
      )}
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
              <button style={s.btn("secondary")} onClick={()=>onExport(docs.filter(d=>selected.includes(d.id)&&d.extracted&&!d.extracted.error))}>Export CSV</button>
              <button style={s.btn("danger")} onClick={onDeleteBulk}>Delete</button>
            </div>
          )}
        </div>
      </div>
      <div style={{...s.card,padding:0,overflow:"hidden"}}>
        {docs.length===0?(
          <div style={{padding:"3rem",textAlign:"center",color:COLORS.textMuted,fontSize:14}}>No documents yet. Click <strong style={{color:COLORS.text}}>+ New Upload</strong> to get started.</div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#12141e"}}>
                <th style={{padding:"10px 12px",borderBottom:`1px solid ${COLORS.border}`}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
                <Th col="name" label="Name"/>
                <Th col="status" label="Status"/>
                <Th col="uploaded" label="Uploaded"/>
                <Th col="type" label="Type"/>
                <Th col="file_size" label="Size" center/>
                <Th col="pages" label="Pages" center/>
                <Th col="lines" label="Lines" center/>
                <Th col="uploadedBy" label="Uploaded By"/>
                <th style={{padding:"10px 12px",fontSize:12,color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}`}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d=>(
                <tr key={d.id} style={{borderBottom:`1px solid ${COLORS.border}`,cursor:"pointer"}} onClick={()=>onReview(d)} onMouseEnter={e=>e.currentTarget.style.background=COLORS.bgCardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(d.id)} onChange={()=>setSelected(s=>s.includes(d.id)?s.filter(x=>x!==d.id):[...s,d.id])}/></td>
                  <td style={{padding:"10px 12px",fontSize:13,fontWeight:500,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    <span style={{color:COLORS.accent}}>{d.name}</span>
                    {d.status==="Processing"&&<span style={{marginLeft:8,fontSize:11,color:COLORS.textMuted}}>extracting...</span>}
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      <span style={s.statusBadge(d.status)}>{d.status}</span>
                      {d.status==="Error"&&d.extracted?.error&&<span style={{fontSize:10,color:"#f87171",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={d.extracted.error}>{d.extracted.error}</span>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{d.uploaded}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{d.type}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,textAlign:"center"}}>{fmtSize(d.file_size)}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,textAlign:"center"}}>{d.pages}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,textAlign:"center"}}>{d.lines||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted,whiteSpace:"nowrap"}}>{d.uploadedBy||"—"}</td>
                  <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:6}}>
                      {d.extracted&&!d.extracted.error&&<button style={{...s.btn("secondary"),padding:"4px 10px",fontSize:12}} onClick={()=>onExport([d])}>CSV</button>}
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

// ─── Upload ───────────────────────────────────────────────────────────────────
function UploadPage({queue,setQueue,onFileSelect,onBegin,templates}){
  const dropRef=useRef(),fileRef=useRef();
  const onDrop=e=>{e.preventDefault();dropRef.current.style.borderColor=COLORS.border;onFileSelect({target:{files:e.dataTransfer.files}});};
  const fmt=b=>b>1e6?`${(b/1e6).toFixed(1)} MB`:b>1e3?`${(b/1e3).toFixed(0)} KB`:`${b} B`;
  return(
    <div style={{maxWidth:800}}>
      <div ref={dropRef} style={{...s.card,border:`2px dashed ${COLORS.border}`,textAlign:"center",padding:"3rem",cursor:"pointer"}}
        onDragOver={e=>{e.preventDefault();dropRef.current.style.borderColor=COLORS.accent;}}
        onDragLeave={()=>dropRef.current.style.borderColor=COLORS.border}
        onDrop={onDrop} onClick={()=>fileRef.current.click()}>
        <div style={{fontSize:32,marginBottom:12}}>☁</div>
        <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Drop files here or click to browse</div>
        <div style={{fontSize:13,color:COLORS.textMuted}}>PDF, Excel, Word — single or bulk upload</div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc" style={{display:"none"}} onChange={onFileSelect}/>
      </div>
      {queue.length>0&&(
        <div style={{marginTop:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:500,color:COLORS.textMuted}}>{queue.length} file{queue.length>1?"s":""} queued</div>
            <div style={{fontSize:12,color:COLORS.textMuted}}>Up to {PROCESSING_SLOTS} documents process simultaneously</div>
          </div>
          {queue.map(item=>(
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

// ─── LineItemsTable ───────────────────────────────────────────────────────────
function LineItemsTable({lFields,lines,activeField,setActiveField,setEditData,onFieldHover}){
  const defW={lineNum:40,poNumber:90,partNumber:90,description:160,hsCode:80,quantity:60,quantityUOM:70,unitPrice:80,currency:70,totalLine:90,unitWeight:70,totalLineWeight:90,weightUOM:70,countryOfOrigin:60,rowBtn:44};
  const [colW,setColW]       = useState(defW);
  const [sortField,setSortField] = useState(null);
  const [sortDir,setSortDir]     = useState("asc");
  const [search,setSearch]       = useState("");

  const startResize=(col,e)=>{
    e.preventDefault();
    const sx=e.clientX,sw=colW[col];
    const onMove=mv=>setColW(w=>({...w,[col]:Math.max(40,sw+(mv.clientX-sx))}));
    const onUp=()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
  };
  const toggleSort=f=>{ if(sortField===f) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortField(f);setSortDir("asc");} };

  const filtered=lines.filter(line=>{
    if(!search.trim()) return true;
    const q=search.toLowerCase();
    return lFields.some(([k])=>(line[k]?.value||"").toLowerCase().includes(q));
  });
  const sorted=[...filtered].sort((a,b)=>{
    if(!sortField) return 0;
    const av=a[sortField]?.value||"",bv=b[sortField]?.value||"";
    const n=parseFloat(av),m=parseFloat(bv);
    const cmp=(!isNaN(n)&&!isNaN(m))?n-m:av.localeCompare(bv);
    return sortDir==="asc"?cmp:-cmp;
  });

  const thSt=(w,isActive)=>({padding:"5px 8px",fontSize:11,fontWeight:600,textAlign:"left",whiteSpace:"nowrap",borderBottom:"1px solid "+COLORS.border,color:isActive?COLORS.accent:COLORS.textMuted,background:isActive?"rgba(108,99,255,0.15)":"#12141e",userSelect:"none",position:"relative",width:w,minWidth:w,maxWidth:w,boxSizing:"border-box",cursor:"pointer"});
  const rh=col=><div style={{position:"absolute",right:0,top:0,bottom:0,width:5,cursor:"col-resize",zIndex:2}} onMouseDown={e=>{e.stopPropagation();startResize(col,e);}} onClick={e=>e.stopPropagation()}/>;
  const tdInp={background:"transparent",border:"none",color:COLORS.text,fontSize:12,width:"100%",outline:"none",padding:"2px 0",fontFamily:"inherit"};
  const colKeys=["lineNum",...lFields.map(f=>f[0]),"rowBtn"];

  return(
    <div>
      <div style={{padding:"8px 12px",borderBottom:"1px solid "+COLORS.border,background:"#0d0f18"}}>
        <input style={{...tdInp,background:"#1a1d27",border:"1px solid "+COLORS.border,borderRadius:6,padding:"5px 10px",fontSize:12,width:"100%",boxSizing:"border-box",color:COLORS.text}} placeholder="Search line items..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {search&&<div style={{padding:"4px 12px",fontSize:11,color:COLORS.textMuted,background:"#0d0f18",borderBottom:"1px solid "+COLORS.border}}>{sorted.length} of {lines.length} lines shown</div>}
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",tableLayout:"fixed",width:colKeys.reduce((a,k)=>a+(colW[k]||80),0)}}>
          <thead>
            <tr>
              <th style={thSt(colW.lineNum,false)} onClick={()=>toggleSort("lineNumber")}># {sortField==="lineNumber"?(sortDir==="asc"?"↑":"↓"):""}{rh("lineNum")}</th>
              {lFields.map(f=>{
                const fKey=f[0],fLabel=f[1];
                const isCol=activeField?.section==="col"&&activeField?.key===fKey;
                const isSorted=sortField===fKey;
                return(
                  <th key={fKey} style={thSt(colW[fKey]||80,isCol)} onClick={()=>toggleSort(fKey)}>
                    <div style={{display:"flex",alignItems:"center",gap:3,paddingRight:8}}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{fLabel}</span>
                      {isSorted&&<span style={{fontSize:10,flexShrink:0}}>{sortDir==="asc"?"↑":"↓"}</span>}
                      <span title={"Select column: "+fLabel} style={{cursor:"pointer",fontSize:11,color:isCol?"#6c63ff":COLORS.textMuted,flexShrink:0}} onClick={e=>{e.stopPropagation();setActiveField(isCol?null:{section:"col",key:fKey,label:fLabel+" (all rows)"});}}>⬚</span>
                    </div>
                    {rh(fKey)}
                  </th>
                );
              })}
              <th style={thSt(colW.rowBtn,false)}>⬚{rh("rowBtn")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length===0&&<tr><td colSpan={lFields.length+2} style={{padding:"1.5rem",textAlign:"center",color:COLORS.textMuted,fontSize:13}}>No lines match your search</td></tr>}
            {sorted.map((line,li)=>{
              const origIdx=lines.indexOf(line);
              const isRow=activeField?.section==="line"&&activeField?.lineIdx===origIdx;
              return(
                <tr key={li} style={{borderBottom:"1px solid "+COLORS.border,background:isRow?"rgba(108,99,255,0.07)":"transparent"}}>
                  <td style={{padding:"5px 8px",verticalAlign:"middle",width:colW.lineNum,fontSize:12,color:COLORS.textMuted}}>{line.lineNumber}</td>
                  {lFields.map(f=>{
                    const fKey=f[0];
                    const isCol=activeField?.section==="col"&&activeField?.key===fKey;
                    const conf=line[fKey]?.confidence;
                    const confBg=conf==="high"?"rgba(5,46,22,0.5)":conf==="medium"?"rgba(69,26,3,0.5)":conf==="low"?"rgba(69,10,10,0.5)":"transparent";
                    const w=colW[fKey]||80;
                    return(
                      <td key={fKey} style={{padding:"5px 8px",verticalAlign:"middle",background:isCol?"rgba(108,99,255,0.08)":confBg,width:w,maxWidth:w,overflow:"hidden"}}
                        onMouseEnter={()=>onFieldHover&&onFieldHover({lineIdx:origIdx,key:fKey})}
                        onMouseLeave={()=>onFieldHover&&onFieldHover(null)}>
                        <input style={tdInp} value={line[fKey]?.value||""} placeholder="—"
                          onChange={e=>{const val=e.target.value;setEditData(d=>({...d,lines:d.lines.map((l,i)=>i!==origIdx?l:{...l,[fKey]:{value:val,confidence:l[fKey]?.confidence||"high"}})}));}}/>
                      </td>
                    );
                  })}
                  <td style={{padding:"5px 8px",verticalAlign:"middle",textAlign:"center",width:colW.rowBtn}}
                    onMouseEnter={()=>onFieldHover&&onFieldHover({lineIdx:origIdx,key:"_row"})}
                    onMouseLeave={()=>onFieldHover&&onFieldHover(null)}>
                    <span title={"Select row: Line "+(origIdx+1)} style={{fontSize:13,cursor:"pointer",color:isRow?"#6c63ff":COLORS.textMuted}} onClick={()=>setActiveField(isRow?null:{section:"line",key:"_row",label:"Line "+(origIdx+1)+" (all fields)",lineIdx:origIdx})}>⬚</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ReviewPage ───────────────────────────────────────────────────────────────
function ReviewPage({doc,onBack,onMarkReviewed,onExport,onRunClaude,user,profile,templates,onSaveTemplate}){
  const [editData,setEditData]           = useState(doc.extracted||{header:{},lines:[]});
  const [isDirty,setIsDirty]             = useState(false);
  const [saving,setSaving]               = useState(false);
  const [bbox,setBbox]                   = useState(null);
  const [drawing,setDrawing]             = useState(false);
  const [startPt,setStartPt]             = useState(null);
  const [activeField,setActiveField]     = useState(null);
  const [bboxResult,setBboxResult]       = useState(null);
  const [hoveredField,setHoveredField]   = useState(null);
  const [pdfData,setPdfData]             = useState(null);
  const [pdfLoading,setPdfLoading]       = useState(false);
  const [pdfPageCount,setPdfPageCount]   = useState(null);
  const [showSave,setShowSave]           = useState(false);
  const [showApply,setShowApply]         = useState(false);
  const [templateName,setTemplateName]   = useState("");
  const [splitPct,setSplitPct]           = useState(50);
  const [draggingSplit,setDraggingSplit] = useState(false);
  const containerRef=useRef(), docRef=useRef();

  const h=editData.header||{}, lines=editData.lines||[];

  const hFields=[["sellerName","Seller Name"],["sellerAddress","Seller Address"],["buyerName","Buyer Name"],["buyerAddress","Buyer Address"],["invoiceNumber","Invoice #"],["invoiceTotal","Invoice Total"],["incoterm","Incoterm"],["totalWeight","Total Weight"],["totalWeightUOM","Weight UOM"]];
  const lFields=[["poNumber","PO #"],["partNumber","Part #"],["description","Description"],["hsCode","HS Code"],["quantity","Qty"],["quantityUOM","Qty UOM"],["unitPrice","Unit Price"],["currency","Currency"],["totalLine","Line Total"],["unitWeight","Unit Wt"],["totalLineWeight","Line Wt"],["weightUOM","Wt UOM"],["countryOfOrigin","COO"]];

  const updateEditData=fn=>{ setEditData(fn); setIsDirty(true); };

  const saveEdits=async()=>{
    setSaving(true);
    await supabase.from("documents").update({extracted:editData,lines:editData.lines?.length||0}).eq("id",doc.id);
    setSaving(false); setIsDirty(false);
  };

  useEffect(()=>{
    if(doc.file_path){
      setPdfLoading(true);
      supabase.storage.from("documents").download(doc.file_path).then(({data,error})=>{
        if(!error&&data) data.arrayBuffer().then(buf=>{setPdfData(buf);setPdfLoading(false);});
        else setPdfLoading(false);
      });
    }
  },[doc.file_path]);

  const onSplitMouseDown=e=>{
    e.preventDefault(); setDraggingSplit(true);
    const onMove=mv=>{ if(!containerRef.current)return; const r=containerRef.current.getBoundingClientRect(); setSplitPct(Math.min(75,Math.max(25,((mv.clientX-r.left)/r.width)*100))); };
    const onUp=()=>{ setDraggingSplit(false); window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
  };

  const getRelPos=e=>{ const r=docRef.current.getBoundingClientRect(); return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}; };
  const onMouseDown=e=>{ if(!activeField)return; e.preventDefault(); const p=getRelPos(e); setStartPt(p); setDrawing(true); setBbox(null); setBboxResult(null); };
  const onMouseMove=e=>{ if(!drawing||!startPt)return; const p=getRelPos(e); setBbox({x:Math.min(startPt.x,p.x),y:Math.min(startPt.y,p.y),w:Math.abs(p.x-startPt.x),h:Math.abs(p.y-startPt.y)}); };
  const onMouseUp=e=>{
    if(!drawing)return; setDrawing(false);
    if(!bbox||bbox.w<0.02||bbox.h<0.02){setBbox(null);return;}
    setBboxResult("Region selected — confirming values at high confidence...");
    const af=activeField;
    setTimeout(()=>{
      if(af.section==="header"){
        const cur=h[af.key]?.value;
        if(cur){updateEditData(d=>({...d,header:{...d.header,[af.key]:{value:cur,confidence:"high"}}}));setBboxResult(`✓ Confirmed "${cur}" → ${af.label}`);}
        else setBboxResult("⚠ Field is empty — enter a value manually first");
      }else if(af.section==="line"){
        updateEditData(d=>({...d,lines:d.lines.map((l,i)=>i!==af.lineIdx?l:Object.fromEntries(Object.entries(l).map(([k,v])=>[k,k==="lineNumber"?v:{value:v?.value||"",confidence:"high"}])))}));
        setBboxResult("✓ All fields for Line "+(af.lineIdx+1)+" confirmed at high confidence");
      }else if(af.section==="col"){
        updateEditData(d=>({...d,lines:d.lines.map(l=>({...l,[af.key]:{value:l[af.key]?.value||"",confidence:"high"}}))}));
        setBboxResult("✓ "+af.label+" confirmed for all lines");
      }
      setTimeout(()=>{setBbox(null);setBboxResult(null);setActiveField(null);},2500);
    },600);
  };

  const cellBg=conf=>conf==="high"?"rgba(5,46,22,0.5)":conf==="medium"?"rgba(69,26,3,0.5)":conf==="low"?"rgba(69,10,10,0.5)":"transparent";
  const inputCell={background:"transparent",border:"none",color:COLORS.text,fontSize:12,width:"100%",outline:"none",padding:"2px 0",fontFamily:"inherit"};
  const CB=({c})=>{ if(!c)return null; const cc=confColor(c); return <span style={{background:cc.bg,color:cc.text,border:`1px solid ${cc.border}`,padding:"1px 6px",borderRadius:20,fontSize:10,fontWeight:500,marginLeft:4}}>{c[0].toUpperCase()}</span>; };

  const doSave=()=>{ if(!templateName.trim())return; onSaveTemplate({name:templateName.trim(),data:editData}); setTemplateName(""); setShowSave(false); };
  const doApply=t=>{ setEditData(t.data); setIsDirty(true); setShowApply(false); };

  // Get hovered field bbox from Textract data
  const getHoverBbox=()=>{
    if(!hoveredField) return null;
    const field=lines[hoveredField.lineIdx]?.[hoveredField.key];
    return field?.bbox||null;
  };
  const getHeaderActiveBbox=()=>{
    if(!activeField||activeField.section!=="header") return null;
    return h[activeField.key]?.bbox||null;
  };
  const hoverBbox=getHoverBbox();
  const headerBbox=getHeaderActiveBbox();

  return(
    <div style={{...s.app,height:"100vh",display:"flex",flexDirection:"column"}} ref={containerRef}>
      <div style={{...s.topbar,gap:10,flexWrap:"wrap"}}>
        <button style={s.btn("ghost")} onClick={onBack}>← Back</button>
        <span style={{fontSize:14,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</span>
        <span style={s.statusBadge(doc.status)}>{doc.status}</span>
        {isDirty&&<button style={{...s.btn("success"),padding:"8px 16px"}} onClick={saveEdits} disabled={saving}>{saving?"Saving...":"💾 Save Changes"}</button>}
        {doc.status!=="Reviewed"&&<button style={s.btn("secondary")} onClick={()=>onRunClaude(doc)}>⚡ Re-extract</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>setShowApply(true)}>Apply Template</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>{setTemplateName("");setShowSave(true);}}>Save as Template</button>}
        {doc.extracted&&<button style={s.btn("secondary")} onClick={()=>onExport([doc])}>Export CSV</button>}
        {doc.status!=="Reviewed"&&doc.extracted&&<button style={{...s.btn(),background:"#14532d",color:"#86efac"}} onClick={()=>onMarkReviewed(doc)}>✓ Mark Reviewed</button>}
        {doc.status==="Reviewed"&&<span style={{fontSize:13,color:COLORS.success}}>✓ Reviewed by {doc.reviewer}</span>}
      </div>

      {showSave&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowSave(false)}>
          <div style={{...s.card,width:400,padding:"1.5rem"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Save as Template</div>
            <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16,lineHeight:1.5}}>Save field structure to guide future extractions.</div>
            <label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:6}}>Template Name</label>
            <input style={{...s.input,marginBottom:16}} value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="e.g. Acme Supplier Invoice" autoFocus onKeyDown={e=>e.key==="Enter"&&doSave()}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={s.btn("ghost")} onClick={()=>setShowSave(false)}>Cancel</button>
              <button style={s.btn()} onClick={doSave} disabled={!templateName.trim()}>Save Template</button>
            </div>
          </div>
        </div>
      )}

      {showApply&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowApply(false)}>
          <div style={{...s.card,width:480,padding:"1.5rem",maxHeight:"70vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Apply Template</div>
            <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16}}>Select a template to apply its structure to this document.</div>
            <div style={{flex:1,overflowY:"auto"}}>
              {templates.length===0?<div style={{textAlign:"center",padding:"2rem",color:COLORS.textMuted,fontSize:13}}>No templates saved yet.</div>:templates.map(t=>(
                <div key={t.id} style={{...s.card,marginBottom:10,padding:"1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border} onClick={()=>doApply(t)}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,marginBottom:3}}>{t.name}</div>
                    <div style={{fontSize:12,color:COLORS.textMuted}}>{t.createdBy} · {t.createdAt} · {t.data?.lines?.length||0} line(s)</div>
                  </div>
                  <button style={{...s.btn(),padding:"6px 14px",fontSize:12}} onClick={e=>{e.stopPropagation();doApply(t);}}>Apply</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16,borderTop:`1px solid ${COLORS.border}`,paddingTop:16}}>
              <button style={s.btn("ghost")} onClick={()=>setShowApply(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",flex:1,overflow:"hidden",cursor:draggingSplit?"col-resize":"default"}}>
        {/* LEFT — PDF */}
        <div style={{flex:`0 0 ${splitPct}%`,background:"#0d0f18",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${COLORS.border}`,background:COLORS.bgCard,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:500}}>Document</span>
            {pdfPageCount&&<span style={{fontSize:12,color:COLORS.textMuted}}>{pdfPageCount} page{pdfPageCount>1?"s":""}</span>}
            <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
              {[["High","#4ade80","#052e16","#16a34a"],["Med","#fbbf24","#451a03","#d97706"],["Low","#f87171","#450a0a","#dc2626"]].map(x=>(
                <span key={x[0]} style={{fontSize:11,background:x[2],color:x[1],padding:"2px 8px",borderRadius:20,border:`1px solid ${x[3]}`}}>{x[0]}</span>
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
          {bboxResult&&<div style={{padding:"8px 14px",background:"#052e16",borderBottom:"1px solid #16a34a",fontSize:12,color:"#4ade80"}}>{bboxResult}</div>}
          {hoveredField&&(
            <div style={{padding:"6px 14px",background:"#1e1b3a",borderBottom:`1px solid ${COLORS.border}`,fontSize:11,color:"#a5b4fc",display:"flex",alignItems:"center",gap:8}}>
              <span>Hovering: {lFields.find(f=>f[0]===hoveredField.key)?.[1]||hoveredField.key} — Line {hoveredField.lineIdx+1}</span>
              {hoverBbox
                ?<span style={{color:"#4ade80"}}>✓ Textract coordinates available</span>
                :<span style={{opacity:0.6}}>Textract coordinates not available</span>}
            </div>
          )}
          <div ref={docRef} style={{flex:1,position:"relative",cursor:activeField?"crosshair":"default",userSelect:"none",overflow:"auto"}} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
            {pdfData?(
              <PdfViewer pdfData={pdfData} onPagesLoaded={n=>setPdfPageCount(n)}/>
            ):pdfLoading?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:COLORS.textMuted,fontSize:13}}>Loading PDF...</div>
            ):(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
                <div style={{width:"80%",maxWidth:360,background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"2rem",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:10}}>📄</div>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{doc.name}</div>
                  <label style={{...s.btn(),display:"inline-block",cursor:"pointer",fontSize:12,padding:"6px 14px"}}>
                    Load PDF
                    <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPdfData(ev.target.result);r.readAsArrayBuffer(f);}}/>
                  </label>
                </div>
              </div>
            )}
            {bbox&&<div style={{position:"absolute",left:`${bbox.x*100}%`,top:`${bbox.y*100}%`,width:`${bbox.w*100}%`,height:`${bbox.h*100}%`,border:"2px solid #6c63ff",background:"rgba(108,99,255,0.15)",pointerEvents:"none",boxSizing:"border-box"}}/>}
            {hoverBbox&&<div style={{position:"absolute",left:`${hoverBbox.left*100}%`,top:`${hoverBbox.top*100}%`,width:`${hoverBbox.width*100}%`,height:`${hoverBbox.height*100}%`,border:"2px solid #4ade80",background:"rgba(74,222,128,0.15)",pointerEvents:"none",boxSizing:"border-box",transition:"all 0.1s"}}/>}
            {headerBbox&&<div style={{position:"absolute",left:`${headerBbox.left*100}%`,top:`${headerBbox.top*100}%`,width:`${headerBbox.width*100}%`,height:`${headerBbox.height*100}%`,border:"2px solid #fbbf24",background:"rgba(251,191,36,0.15)",pointerEvents:"none",boxSizing:"border-box"}}/>}
          </div>
          <div style={{padding:"12px 14px",borderTop:`1px solid ${COLORS.border}`}}>
            <button style={{...s.btn(),width:"100%"}} onClick={()=>onRunClaude(doc)}>⚡ Run Extraction</button>
          </div>
        </div>

        {/* Splitter */}
        <div style={{width:6,background:draggingSplit?COLORS.accent:COLORS.border,cursor:"col-resize",flexShrink:0,transition:"background 0.15s",zIndex:10}} onMouseDown={onSplitMouseDown}/>

        {/* RIGHT — Extracted data */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${COLORS.border}`,background:COLORS.bgCard,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
            Extracted Data
            {activeField&&<span style={{fontSize:11,color:"#fbbf24",marginLeft:"auto"}}>⬚ Draw box on document →</span>}
          </div>
          {!doc.extracted?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:COLORS.textMuted,fontSize:14}}>No data extracted yet. Click Run Extraction.</div>
          ):(
            <div style={{flex:1,overflowY:"auto"}}>
              <div style={{padding:"10px 14px 6px",fontSize:11,fontWeight:600,color:COLORS.textMuted,letterSpacing:1,borderBottom:`1px solid ${COLORS.border}`,background:"#12141e"}}>HEADER</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <tbody>
                  {hFields.map(([key,label])=>(
                    <tr key={key} style={{background:cellBg(h[key]?.confidence)}}
                      onMouseEnter={()=>{ if(h[key]?.bbox) setHoveredField({lineIdx:-1,key,isHeader:true}); }}
                      onMouseLeave={()=>setHoveredField(null)}>
                      <td style={{padding:"7px 14px",fontSize:12,color:COLORS.textMuted,whiteSpace:"nowrap",width:130,borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle"}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>{label}<CB c={h[key]?.confidence}/></div>
                      </td>
                      <td style={{padding:"7px 8px",borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle"}}>
                        <input style={inputCell} value={h[key]?.value||""} placeholder="—" onChange={e=>{const v=e.target.value;updateEditData(d=>({...d,header:{...d.header,[key]:{...d.header[key],value:v}}}));}}/>
                      </td>
                      <td style={{padding:"7px 10px 7px 4px",borderBottom:`1px solid ${COLORS.border}`,verticalAlign:"middle",width:28}}>
                        <span title={`Draw box to extract ${label}`} style={{cursor:"pointer",fontSize:14,color:(activeField?.section==="header"&&activeField?.key===key)?"#6c63ff":COLORS.textMuted}} onClick={()=>setActiveField((activeField?.section==="header"&&activeField?.key===key)?null:{section:"header",key,label})}>⬚</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{padding:"10px 14px 6px",fontSize:11,fontWeight:600,color:COLORS.textMuted,letterSpacing:1,borderBottom:`1px solid ${COLORS.border}`,background:"#12141e",marginTop:4}}>LINE ITEMS ({lines.length})</div>
              <LineItemsTable lFields={lFields} lines={lines} activeField={activeField} setActiveField={setActiveField} setEditData={updateEditData} onFieldHover={setHoveredField}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PdfViewer ────────────────────────────────────────────────────────────────
function PdfViewer({pdfData,onPagesLoaded}){
  const containerRef=useRef();
  const [numPages,setNumPages]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const renderQueue=useRef([]);

  useEffect(()=>{
    if(!pdfData) return;
    let cancelled=false;
    setLoading(true); setError(null);
    const load=async()=>{
      try{
        if(!window.pdfjsLib){
          await new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
          window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const bytes=pdfData instanceof ArrayBuffer?new Uint8Array(pdfData):pdfData;
        const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
        if(cancelled) return;
        const n=pdf.numPages;
        setNumPages(n);
        if(onPagesLoaded) onPagesLoaded(n);
        setLoading(false);
        for(let p=1;p<=n;p++){
          if(cancelled) break;
          const page=await pdf.getPage(p);
          const vp=page.getViewport({scale:1.5});
          const canvas=document.getElementById("pdf-page-"+p);
          if(!canvas) continue;
          canvas.width=vp.width; canvas.height=vp.height;
          const task=page.render({canvasContext:canvas.getContext("2d"),viewport:vp});
          renderQueue.current.push(task);
          await task.promise.catch(e=>{if(e?.name!=="RenderingCancelledException") console.warn(e);});
        }
      }catch(e){
        if(!cancelled&&e?.name!=="RenderingCancelledException"){setError(e.message);setLoading(false);}
      }
    };
    load();
    return()=>{ cancelled=true; renderQueue.current.forEach(t=>{try{t.cancel();}catch(_){}});renderQueue.current=[]; };
  },[pdfData]);

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",color:COLORS.textMuted,fontSize:13}}>Rendering PDF...</div>;
  if(error)   return <div style={{padding:"1rem",color:"#f87171",fontSize:13}}>Failed to render: {error}</div>;
  return(
    <div ref={containerRef} style={{padding:8}}>
      {Array.from({length:numPages},(_,i)=>(
        <div key={i} style={{marginBottom:8,border:"1px solid "+COLORS.border,borderRadius:4,overflow:"hidden"}}>
          <div style={{fontSize:10,color:COLORS.textMuted,padding:"3px 8px",background:"#12141e",borderBottom:"1px solid "+COLORS.border}}>Page {i+1} of {numPages}</div>
          <canvas id={"pdf-page-"+(i+1)} style={{width:"100%",display:"block"}}/>
        </div>
      ))}
    </div>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────
function AdminPage({profile,supabase,lists,setLists,showToast}){
  const [users,setUsers]=useState([]);
  const [tab,setTab]=useState("users");
  const [listTab,setListTab]=useState("incoterms");
  const [newItem,setNewItem]=useState("");
  const listTabs=[["incoterms","Incoterms"],["uom","Units of Measure"],["currencies","Currencies"],["weightUOM","Weight UOM"],["countries","Countries"]];

  useEffect(()=>{ supabase.from("profiles").select("*").then(({data})=>{if(data) setUsers(data);}); },[]);
  if(profile?.role!=="admin") return <div style={{padding:"2rem",color:COLORS.textMuted,fontSize:14}}>Admin access required.</div>;

  return(
    <div>
      <div style={{display:"flex",marginBottom:"1.5rem",borderBottom:`1px solid ${COLORS.border}`}}>
        {[{id:"users",label:"Users"},{id:"lists",label:"Manage Lists"}].map(t=>(
          <div key={t.id} style={{padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:500,color:tab===t.id?COLORS.accent:COLORS.textMuted,borderBottom:tab===t.id?`2px solid ${COLORS.accent}`:"2px solid transparent"}} onClick={()=>setTab(t.id)}>{t.label}</div>
        ))}
      </div>
      {tab==="users"&&(
        <div style={{maxWidth:820}}>
          <div style={s.card}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Name","Email","Role","Group","Actions"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:12,color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}`,fontWeight:500}}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id} style={{borderBottom:`1px solid ${COLORS.border}`}}>
                    <td style={{padding:"10px 12px",fontSize:13}}>{u.name||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:13,color:COLORS.textMuted}}>{u.email||u.id}</td>
                    <td style={{padding:"10px 12px"}}>
                      <select style={{...s.input,width:100}} value={u.role||"user"} onChange={async e=>{await supabase.from("profiles").update({role:e.target.value}).eq("id",u.id);setUsers(us=>us.map(x=>x.id===u.id?{...x,role:e.target.value}:x));showToast("Role updated");}}>
                        <option value="user">User</option><option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <input style={{...s.input,width:130}} value={u.group_name||""} placeholder="Group" onChange={e=>setUsers(us=>us.map(x=>x.id===u.id?{...x,group_name:e.target.value}:x))} onBlur={async e=>{await supabase.from("profiles").update({group_name:e.target.value}).eq("id",u.id);showToast("Group updated");}}/>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <button style={{...s.btn(u.active===false?"primary":"danger"),padding:"4px 10px",fontSize:12}} onClick={async()=>{await supabase.from("profiles").update({active:!u.active}).eq("id",u.id);setUsers(us=>us.map(x=>x.id===u.id?{...x,active:!x.active}:x));showToast("Status updated");}}>
                        {u.active===false?"Activate":"Deactivate"}
                      </button>
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
          <div style={{display:"flex",marginBottom:"1rem",borderBottom:`1px solid ${COLORS.border}`,flexWrap:"wrap"}}>
            {listTabs.map(([id,label])=><div key={id} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,color:listTab===id?COLORS.accent:COLORS.textMuted,borderBottom:listTab===id?`2px solid ${COLORS.accent}`:"2px solid transparent"}} onClick={()=>setListTab(id)}>{label}</div>)}
          </div>
          <div style={s.card}>
            <div style={{display:"flex",gap:10,marginBottom:"1rem"}}>
              <input style={{...s.input,flex:1}} value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="Add new value..." onKeyDown={e=>{if(e.key==="Enter"&&newItem.trim()){setLists(l=>({...l,[listTab]:[...l[listTab],newItem.trim()]}));setNewItem("");showToast("Item added");}}}/>
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

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage({profile,setProfile,supabase,showToast}){
  const [name,setName]=useState(profile?.name||"");
  const [textractStatus,setTextractStatus]=useState(null);

  useEffect(()=>{
    fetch("/api/textract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:null})})
      .then(r=>r.json())
      .then(d=>setTextractStatus(d.available?"configured":"not_configured"))
      .catch(()=>setTextractStatus("not_configured"));
  },[]);

  return(
    <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:16}}>
      <div style={s.card}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:16}}>Profile</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,color:COLORS.textMuted,display:"block",marginBottom:4}}>Display Name</label>
          <input style={s.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
        </div>
        <button style={s.btn()} onClick={async()=>{await supabase.from("profiles").update({name}).eq("id",profile.id);setProfile(p=>({...p,name}));showToast("Profile updated!");}}>Save Changes</button>
      </div>
      <div style={s.card}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Extraction Engine</div>
        <div style={{fontSize:13,color:COLORS.textMuted,marginBottom:16,lineHeight:1.6}}>
          When AWS Textract is configured, documents are processed with Textract for OCR and bounding box coordinates first, then Claude uses that structured output for field extraction. Without Textract, Claude reads the PDF directly.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {label:"Claude (Anthropic)",desc:"PDF extraction — always active",status:"active"},
            {label:"Amazon Textract (AWS)",desc:"OCR + bounding boxes — enhances Claude extraction",status:textractStatus},
          ].map(eng=>(
            <div key={eng.label} style={{...s.card,padding:"1rem",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:eng.status==="active"||eng.status==="configured"?COLORS.success:COLORS.textMuted,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{eng.label}</div>
                <div style={{fontSize:12,color:COLORS.textMuted}}>{eng.desc}</div>
              </div>
              <span style={{fontSize:12,color:eng.status==="active"||eng.status==="configured"?COLORS.success:COLORS.textMuted}}>
                {eng.status==="active"?"Active":eng.status==="configured"?"Active":eng.status===null?"Checking...":"Not configured"}
              </span>
            </div>
          ))}
        </div>
        {textractStatus==="not_configured"&&(
          <div style={{marginTop:14,padding:"12px",background:"#0d0f18",borderRadius:8,fontSize:12,color:COLORS.textMuted,lineHeight:1.9}}>
            <strong style={{color:COLORS.text,fontWeight:500}}>To enable Textract:</strong><br/>
            1. Create an AWS account at aws.amazon.com<br/>
            2. Create an IAM user with <strong style={{color:COLORS.text}}>AmazonTextractFullAccess</strong> policy<br/>
            3. Generate an Access Key + Secret Key for that IAM user<br/>
            4. In Vercel → Settings → Environment Variables, add:<br/>
            <code style={{background:"#1a1d27",padding:"2px 6px",borderRadius:4,display:"inline-block",marginTop:2}}>AWS_ACCESS_KEY_ID</code><br/>
            <code style={{background:"#1a1d27",padding:"2px 6px",borderRadius:4}}>AWS_SECRET_ACCESS_KEY</code><br/>
            <code style={{background:"#1a1d27",padding:"2px 6px",borderRadius:4}}>AWS_REGION</code> (e.g. us-east-1)<br/>
            5. Redeploy from the Vercel dashboard
          </div>
        )}
      </div>
      <div style={s.card}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:12}}>How extraction works</div>
        <div style={{fontSize:13,color:COLORS.textMuted,lineHeight:1.8}}>
          <strong style={{color:COLORS.text,fontWeight:500}}>With Textract:</strong> Textract runs OCR → returns text + bounding box coordinates → Claude extracts structured data. Hover over any extracted field to see it highlighted on the document.<br/><br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>Without Textract:</strong> Claude reads the raw PDF directly. Works well for digital PDFs. Scanned documents benefit more from Textract.<br/><br/>
          <strong style={{color:COLORS.text,fontWeight:500}}>Templates:</strong> Save reviewed documents as templates to guide future extractions from the same supplier.
        </div>
      </div>
    </div>
  );
}
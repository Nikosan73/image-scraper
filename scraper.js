(function(){

// VERSION
var VERSION = 'v2.1.6';

var HANDLERS={
  allsop:{
    name:'Allsop',
    detect:function(){return window.location.hostname.includes('allsop.co.uk')},
    extract:function(){
      var u=[];
      document.querySelectorAll('.__image_div[style*="background-image"]').forEach(function(d){
        var s=d.getAttribute('style');
        var m=s.match(/url\("([^"]+)"\)|url\('([^']+)'\)|url\(([^)]+)\)/);
        if(m){
          var url=m[1]||m[2]||m[3];
          if(url.startsWith('api/'))url=window.location.origin+'/'+url;
          else if(url.startsWith('/api/'))url=window.location.origin+url;
          else if(!url.startsWith('http'))url=window.location.origin+'/'+url;
          if(!u.includes(url))u.push(url);
        }
      });
      return u;
    }
  },
  zoopla:{
    name:'Zoopla',
    detect:function(){return window.location.hostname.includes('zoopla.co.uk')},
    extract:function(){
      var u=[];
      document.querySelectorAll('picture.tnabq04 source[type="image/jpeg"]').forEach(function(s){
        var m=s.srcset.match(/https:\/\/[^\s]+2400\/1800\/[^\s]+\.jpg/);
        if(m&&!u.includes(m[0]))u.push(m[0]);
      });
      return u;
    }
  },
  propertylink:{
    name:'PropertyLink/Estates Gazette',
    detect:function(){
      return window.location.hostname.includes('estatesgazette.com') || 
             window.location.hostname.includes('propertylink');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[srcset]').forEach(function(img){
        var srcset=img.srcset;
        if(srcset && (srcset.includes('propertylinkassets') || srcset.includes('estatesgazette'))){
          var matches=srcset.match(/https:\/\/[^\s]+\s+(\d+)w/g);
          if(matches){
            var maxWidth=0;
            var maxUrl='';
            matches.forEach(function(match){
              var parts=match.match(/(https:\/\/[^\s]+)\s+(\d+)w/);
              if(parts){
                var url=parts[1];
                var width=parseInt(parts[2]);
                if(width>maxWidth){
                  maxWidth=width;
                  maxUrl=url;
                }
              }
            });
            if(maxUrl && !u.includes(maxUrl)){
              u.push(maxUrl);
            }
          }
        }
      });
      return u;
    }
  },
  knightfrank:{
    name:'Knight Frank',
    detect:function(){
      return window.location.hostname.includes('knightfrank.co');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[data-src]').forEach(function(img){
        var dataSrc=img.dataset.src;
        if(dataSrc && dataSrc.includes('content.knightfrank.com')){
          if(!u.includes(dataSrc)) u.push(dataSrc);
        }
      });
      return u;
    }
  },
  email:{
    name:'Email (HTML)',
    detect:function(){
      return document.querySelector('meta[name="generator"][content*="Mail"]') || 
             document.querySelector('div[id*="mail"]') ||
             window.location.hostname.includes('mail.google.com');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[src]').forEach(function(img){
        var src=img.src;
        if(src && src.startsWith('http') && !u.includes(src)) u.push(src);
      });
      return u;
    }
  }
};

function extractGeneric(){
  var u=[];
  document.querySelectorAll('img[src], img[data-src], a[href]').forEach(function(el){
    if(el.tagName==='IMG'){
      var src=el.dataset.src || el.src;
      if(src && src.startsWith('http') && !u.includes(src)) u.push(src);
    }
    else if(el.tagName==='A'){
      var href=el.href;
      if(href && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(href) && !u.includes(href)) u.push(href);
    }
  });
  return u;
}

function extractPDFs(){
  var pdfs=[];
  document.querySelectorAll('a[href]').forEach(function(a){
    var href=a.href;
    if(href && /\.pdf(\?|$)/i.test(href)){
      var text=a.textContent.trim() || a.title || 'PDF Document';
      if(!pdfs.some(function(p){return p.url===href})){
        pdfs.push({url:href,name:text});
      }
    }
  });
  return pdfs;
}

var handler=null;
for(var key in HANDLERS){
  if(HANDLERS[key].detect()){
    handler=HANDLERS[key];
    break;
  }
}

var images=handler ? handler.extract() : extractGeneric();
var pdfs=extractPDFs();

if(images.length===0 && pdfs.length===0){
  alert('No images or PDFs found on this page!');
  return;
}

var propTitle=document.title || 'Property';
var propUrl=window.location.href;

var currentIndex=0;
var imageQueue=[];

function processNext(){
  if(currentIndex>=images.length){
    var output='<!DOCTYPE html><html><head><meta charset="UTF-8">';
    output+='<title>'+propTitle+'</title>';
    output+='<style>';
    output+='*{box-sizing:border-box;margin:0;padding:0;}';
    output+='body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5;}';
    output+='.header{background:#2c3e50;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px;}';
    output+='.header h1{font-size:20px;margin-bottom:8px;}';
    output+='.header .url{font-size:12px;color:#ecf0f1;word-break:break-all;}';
    output+='.controls{background:#fff;padding:15px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1);}';
    output+='.controls label{font-weight:bold;margin-right:10px;}';
    output+='.controls input{padding:5px;margin-right:15px;width:80px;}';
    output+='.controls button{padding:8px 15px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:10px;}';
    output+='.controls button:hover{background:#2980b9;}';
    output+='.controls button:disabled{background:#95a5a6;cursor:not-allowed;}';
    output+='.stats{margin:15px 0;padding:10px;background:#ecf0f1;border-radius:4px;}';
    output+='.pdf-section{background:#e3f2fd;padding:15px;border-radius:8px;margin-bottom:20px;}';
    output+='.pdf-section h2{color:#1976d2;margin-bottom:15px;font-size:16px;}';
    output+='.pdf-item{background:#fff;padding:12px;margin-bottom:10px;border-radius:4px;display:flex;align-items:center;gap:10px;}';
    output+='.pdf-item input[type="checkbox"]{width:20px;height:20px;cursor:pointer;}';
    output+='.pdf-item a{flex:1;color:#1976d2;text-decoration:none;font-weight:500;}';
    output+='.pdf-item a:hover{text-decoration:underline;}';
    output+='.pdf-tag-select{padding:5px;border:1px solid #ccc;border-radius:4px;font-size:13px;}';
    output+='.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px;}';
    output+='.card{background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);position:relative;}';
    output+='.card.deleted{display:none;}';
    output+='.card img{width:100%;height:200px;object-fit:cover;cursor:pointer;display:block;}';
    output+='.card img:hover{opacity:0.8;}';
    output+='.card-body{padding:12px;}';
    output+='.card-info{font-size:11px;color:#7f8c8d;margin-bottom:8px;}';
    output+='.card-controls{display:flex;align-items:center;gap:8px;margin-bottom:8px;}';
    output+='.card-controls input[type="checkbox"]{width:18px;height:18px;cursor:pointer;}';
    output+='.card-controls select{flex:1;padding:5px;border:1px solid #ddd;border-radius:4px;font-size:12px;}';
    output+='.card-actions{display:flex;gap:5px;}';
    output+='.card-actions button{flex:1;padding:6px;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;}';
    output+='.btn-view{background:#3498db;color:#fff;}';
    output+='.btn-view:hover{background:#2980b9;}';
    output+='.btn-delete{background:#e74c3c;color:#fff;}';
    output+='.btn-delete:hover{background:#c0392b;}';
    output+='</style></head><body>';

    output+='<div class="header">';
    output+='<h1>Image & PDF Manager '+VERSION;
    if(handler) output+=' ('+handler.name+')';
    output+='</h1>';
    output+='<div class="url">'+propUrl+'</div>';
    output+='</div>';

    output+='<div class="controls">';
    output+='<label>Min Width:</label><input type="number" id="minW" value="800">';
    output+='<label>Min Height:</label><input type="number" id="minH" value="600">';
    output+='<button onclick="applyFilter()">Apply Filter</button>';
    output+='<button onclick="downloadSelected()" id="dlBtn" disabled>Download Selected</button>';
    output+='<button onclick="exportCSV()" id="csvBtn" disabled>Export CSV</button>';
    output+='</div>';

    if(pdfs.length>0){
      output+='<div class="pdf-section">';
      output+='<h2>PDFs Found ('+pdfs.length+')</h2>';
      pdfs.forEach(function(pdf,i){
        output+='<div class="pdf-item">';
        output+='<input type="checkbox" class="pdf-check" id="pdf'+i+'">';
        output+='<a href="'+pdf.url+'" target="_blank" id="pdflink'+i+'">'+pdf.name+'</a>';
        output+='<select class="pdf-tag-select" data-pdfid="'+i+'" onchange="pdfTagChanged('+i+',this.value)">';
        output+='<option value="">No Tag</option>';
        output+='<option value="Floorplan">Floorplan</option>';
        output+='<option value="EPC">EPC</option>';
        output+='<option value="Title Plan">Title Plan</option>';
        output+='<option value="Marketing Brochure">Marketing Brochure</option>';
        output+='<option value="Other">Other</option>';
        output+='</select>';
        output+='</div>';
      });
      output+='</div>';
    }

    output+='<div class="stats" id="stats">Loading images...</div>';
    output+='<div class="grid" id="grid"></div>';

    output+='<script>';
    output+='var propTitle="'+propTitle.replace(/"/g,'\\"')+'";';
    output+='var propUrl="'+propUrl+'";';
    output+='var images='+JSON.stringify(images)+';';
    output+='var imageData=[];';
    output+='var loaded=0;';
    output+='var tags={};';
    output+='var pdfTags={};';
    output+='var minW=800;';
    output+='var minH=600;';

    output+='function pdfTagChanged(pdfId,value){';
    output+='if(value==="Floorplan" || value==="EPC" || value==="Marketing Brochure"){';
    output+='for(var i in pdfTags){if(pdfTags[i]===value && i!=pdfId)pdfTags[i]="";}';
    output+='document.querySelectorAll(".pdf-tag-select").forEach(function(sel){';
    output+='var id=sel.dataset.pdfid;';
    output+='if(id!=pdfId && sel.value===value)sel.value="";';
    output+='});';
    output+='var cb=document.getElementById("pdf"+pdfId);';
    output+='if(cb)cb.checked=true;';
    output+='}';
    output+='pdfTags[pdfId]=value;';
    output+='updateButtons();';
    output+='}';

    output+='function updateButtons(){';
    output+='var anyChecked=document.querySelectorAll(".card:not(.deleted) input:checked, .pdf-check:checked").length>0;';
    output+='document.getElementById("dlBtn").disabled=!anyChecked;';
    output+='document.getElementById("csvBtn").disabled=!anyChecked;';
    output+='}';

    output+='function tagChanged(idx,value){';
    output+='if(value==="Floorplan" || value==="EPC"){';
    output+='for(var i in tags){if(tags[i]===value && i!=idx)tags[i]="";}';
    output+='document.querySelectorAll(".img-tag-select").forEach(function(sel){';
    output+='var id=parseInt(sel.dataset.imgid);';
    output+='if(id!==idx && sel.value===value)sel.value="";';
    output+='});';
    output+='for(var i in pdfTags){if(pdfTags[i]===value)pdfTags[i]="";}';
    output+='document.querySelectorAll(".pdf-tag-select").forEach(function(sel){';
    output+='if(sel.value===value)sel.value="";';
    output+='});';
    output+='var cb=document.querySelector(".card[data-idx=\\""+idx+"\\"] input");';
    output+='if(cb)cb.checked=true;';
    output+='}';
    output+='tags[idx]=value;';
    output+='updateButtons();';
    output+='}';

    output+='images.forEach(function(url,idx){';
    output+='var img=new Image();';
    output+='img.crossOrigin="anonymous";';
    output+='img.onload=function(){';
    output+='loaded++;';
    output+='imageData.push({idx:idx,url:url,w:img.naturalWidth,h:img.naturalHeight,mp:(img.naturalWidth*img.naturalHeight/1000000).toFixed(2)});';
    output+='if(loaded===images.length)renderImages();';
    output+='};';
    output+='img.onerror=function(){loaded++;if(loaded===images.length)renderImages();};';
    output+='img.src=url;';
    output+='});';

    output+='function renderImages(){';
    output+='var filtered=imageData.filter(function(img){return img.w>=minW && img.h>=minH;});';
    output+='document.getElementById("stats").textContent="Showing "+filtered.length+" of "+imageData.length+" images";';
    output+='var grid=document.getElementById("grid");';
    output+='grid.innerHTML="";';
    output+='if(filtered.length===0){grid.innerHTML="<p>No images match filter</p>";return;}';
    output+='filtered.forEach(function(img){';
    output+='var card=document.createElement("div");';
    output+='card.className="card";';
    output+='card.dataset.idx=img.idx;';
    output+='var imgEl=document.createElement("img");';
    output+='imgEl.src=img.url;';
    output+='imgEl.onclick=function(){window.open(img.url,"_blank");};';
    output+='card.appendChild(imgEl);';
    output+='var body=document.createElement("div");';
    output+='body.className="card-body";';
    output+='var info=document.createElement("div");';
    output+='info.className="card-info";';
    output+='info.textContent=img.w+"x"+img.h+" ("+img.mp+"MP)";';
    output+='body.appendChild(info);';
    output+='var controls=document.createElement("div");';
    output+='controls.className="card-controls";';
    output+='var cb=document.createElement("input");';
    output+='cb.type="checkbox";';
    output+='cb.onchange=updateButtons;';
    output+='controls.appendChild(cb);';
    output+='var sel=document.createElement("select");';
    output+='sel.className="img-tag-select";';
    output+='sel.dataset.imgid=img.idx;';
    output+='sel.innerHTML="<option value=\\"\\">No Tag</option><option value=\\"External\\">External</option><option value=\\"Internal\\">Internal</option><option value=\\"Floorplan\\">Floorplan</option><option value=\\"EPC\\">EPC</option><option value=\\"Map\\">Map</option><option value=\\"Other\\">Other</option>";';
    output+='sel.value=tags[img.idx]||"";';
    output+='sel.onchange=function(){tagChanged(img.idx,this.value);};';
    output+='controls.appendChild(sel);';
    output+='body.appendChild(controls);';
    output+='var actions=document.createElement("div");';
    output+='actions.className="card-actions";';
    output+='var btnView=document.createElement("button");';
    output+='btnView.className="btn-view";';
    output+='btnView.textContent="View";';
    output+='btnView.onclick=function(){window.open(img.url,"_blank");};';
    output+='actions.appendChild(btnView);';
    output+='var btnDel=document.createElement("button");';
    output+='btnDel.className="btn-delete";';
    output+='btnDel.textContent="Delete";';
    output+='btnDel.onclick=function(){card.classList.add("deleted");updateButtons();};';
    output+='actions.appendChild(btnDel);';
    output+='body.appendChild(actions);';
    output+='card.appendChild(body);';
    output+='grid.appendChild(card);';
    output+='});';
    output+='}';

    output+='function applyFilter(){';
    output+='minW=parseInt(document.getElementById("minW").value)||0;';
    output+='minH=parseInt(document.getElementById("minH").value)||0;';
    output+='renderImages();';
    output+='}';

    output+='function downloadSelected(){';
    output+='var selected=[];';
    output+='document.querySelectorAll(".card:not(.deleted) input:checked").forEach(function(cb){';
    output+='selected.push(parseInt(cb.closest(".card").dataset.idx));';
    output+='});';
    output+='document.querySelectorAll(".pdf-check:checked").forEach(function(cb){';
    output+='var id=cb.id.replace("pdf","");';
    output+='var link=document.getElementById("pdflink"+id);';
    output+='if(link)selected.push(link.href);';
    output+='});';
    output+='if(selected.length===0){alert("Select at least one item");return;}';
    output+='selected.forEach(function(item){';
    output+='var a=document.createElement("a");';
    output+='if(typeof item==="number"){';
    output+='a.href=imageData.find(function(img){return img.idx===item;}).url;';
    output+='}else{a.href=item;}';
    output+='a.download="";';
    output+='a.target="_blank";';
    output+='document.body.appendChild(a);';
    output+='a.click();';
    output+='document.body.removeChild(a);';
    output+='});';
    output+='}';

    output+='function exportCSV(){';
    output+='var selected=[];';
    output+='var selectedPDFs=[];';
    output+='document.querySelectorAll(".card:not(.deleted) input:checked").forEach(function(cb){';
    output+='selected.push(parseInt(cb.closest(".card").dataset.idx));';
    output+='});';
    output+='document.querySelectorAll(".pdf-check:checked").forEach(function(cb){';
    output+='var idx=cb.id.replace("pdf","");';
    output+='var url=document.getElementById("pdflink"+idx).href;';
    output+='var name=document.getElementById("pdflink"+idx).textContent;';
    output+='var tag=pdfTags[idx]||"";';
    output+='selectedPDFs.push({url:url,name:name,tag:tag});';
    output+='});';
    output+='if(selected.length===0 && selectedPDFs.length===0){alert("Select at least one item");return;}';
    output+='selected.sort(function(a,b){return a-b;});';
    output+='var csv="Property,URL,Type,Image Number,Image URL,Megapixels,Tag\\n";';
    output+='selected.forEach(function(idx,num){';
    output+='var img=imageData.find(function(i){return i.idx===idx;});';
    output+='if(img){';
    output+='var tag=tags[idx]||"";';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",Image,"+(num+1)+",\\""+img.url+"\\","+img.mp+",\\""+tag+"\\"\\n";';
    output+='}';
    output+='});';
    output+='selectedPDFs.forEach(function(pdf,num){';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",PDF,"+(num+1)+",\\""+pdf.url+"\\",\\"\\",\\""+pdf.tag+"\\"\\n";';
    output+='});';
    output+='var blob=new Blob([csv],{type:"text/csv"});';
    output+='var link=document.createElement("a");';
    output+='link.href=URL.createObjectURL(blob);';
    output+='link.download="property_data_"+Date.now()+".csv";';
    output+='link.click();';
    output+='}';

    output+='</script></body></html>';

    var blob=new Blob([output],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='property_images_'+Date.now()+'.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('HTML file downloaded!\n\nOpen it to manage images and PDFs.');
    document.body.removeChild(div);
  }
  
  processNext();
};

var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:30px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:999999;min-width:300px;font-family:Arial,sans-serif;';
div.innerHTML='<h2 style="margin:0 0 15px 0;font-size:18px;color:#2c3e50;">Image & PDF Scraper '+VERSION+'</h2>';
div.innerHTML+='<p style="margin-bottom:15px;color:#7f8c8d;">Found '+images.length+' images and '+pdfs.length+' PDFs</p>';
div.innerHTML+='<p style="margin-bottom:20px;color:#555;">Click Continue to download the manager.</p>';
div.innerHTML+='<div style="display:flex;gap:10px;"><button id="continueBtn" style="flex:1;padding:10px 20px;background:#27ae60;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px;">Continue</button>';
div.innerHTML+='<button id="closeBtn" style="flex:1;padding:10px 20px;background:#e74c3c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px;">Cancel</button></div>';
document.body.appendChild(div);

document.getElementById('continueBtn').onclick=function(){
  div.innerHTML='<p style="text-align:center;color:#555;">Generating file...</p>';
  setTimeout(function(){
    document.body.removeChild(div);
  },500);
  
  processNext();
};

document.getElementById('closeBtn').onclick=function(){
  document.body.removeChild(div);
};

})();

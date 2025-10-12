(function(){

// ========================================
// SITE HANDLERS
// ========================================

var HANDLERS = {
  allsop: {
    name: 'Allsop',
    detect: function(){ return window.location.hostname.includes('allsop.co.uk'); },
    extract: function(){
      var urls = [];
      document.querySelectorAll('.__image_div[style*="background-image"]').forEach(function(div){
        var style = div.getAttribute('style');
        var match = style.match(/url\("([^"]+)"\)|url\('([^']+)'\)|url\(([^)]+)\)/);
        if(match){
          var url = match[1] || match[2] || match[3];
          if(url.startsWith('api/')) url = window.location.origin + '/' + url;
          else if(url.startsWith('/api/')) url = window.location.origin + url;
          else if(!url.startsWith('http')) url = window.location.origin + '/' + url;
          if(!urls.includes(url)) urls.push(url);
        }
      });
      return urls;
    }
  },
  zoopla: {
    name: 'Zoopla',
    detect: function(){ return window.location.hostname.includes('zoopla.co.uk'); },
    extract: function(){
      var urls = [];
      document.querySelectorAll('picture.tnabq04 source[type="image/jpeg"]').forEach(function(source){
        var match = source.srcset.match(/https:\/\/[^\s]+2400\/1800\/[^\s]+\.jpg/);
        if(match && !urls.includes(match[0])) urls.push(match[0]);
      });
      return urls;
    }
  },
  email: {
    name: 'Email (HTML)',
    detect: function(){
      return !!document.querySelector('img[src^="data:image"]') ||
             document.body.innerHTML.includes('cid:') ||
             !!document.querySelector('meta[name="Generator"][content*="Microsoft"]') ||
             document.querySelectorAll('a[href^="mailto:"]').length > 2;
    },
    extract: function(){
      var urls = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('data:image/')){
          var match = img.src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
          if(match && match[2].length > 100) urls.push(img.src);
        } else if(img.src && img.src.startsWith('http')){
          var w = img.naturalWidth || img.width || 0;
          var h = img.naturalHeight || img.height || 0;
          if(w > 50 && h > 50 && !urls.includes(img.src)) urls.push(img.src);
        }
      });
      return urls.filter(function(url){ return !url.includes('spacer') && !url.includes('tracking'); });
    }
  },
  generic: {
    name: 'Generic',
    detect: function(){ return true; },
    extract: function(){
      var urls = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && img.naturalWidth > 50 && !urls.includes(img.src)){
          urls.push(img.src);
        }
      });
      document.querySelectorAll('[style*="background-image"]').forEach(function(el){
        var style = el.getAttribute('style') || '';
        var matches = style.match(/url\(['"&quot;]?([^'"&quot;)]+)['"&quot;]?\)/g);
        if(matches){
          matches.forEach(function(match){
            var url = match.replace(/url\(['"&quot;]?/,'').replace(/['"&quot;)]/g,'').trim();
            if(url.startsWith('/')) url = window.location.origin + url;
            else if(!url.startsWith('http') && !url.startsWith('data:')) url = window.location.origin + '/' + url;
            if(url.startsWith('http') && !urls.includes(url)) urls.push(url);
          });
        }
      });
      return urls.filter(function(url){
        return !url.includes('logo') && !url.includes('icon') && !url.includes('sprite') && 
               !url.includes('tiny') && !url.includes('small') && !url.match(/\.(svg|gif)$/i);
      });
    }
  }
};

var detected = 'generic';
var siteName = 'Generic';
for(var key in HANDLERS){
  if(key !== 'generic' && HANDLERS[key].detect()){
    detected = key;
    siteName = HANDLERS[key].name;
    break;
  }
}

var urls = HANDLERS[detected].extract();
if(urls.length === 0){
  alert('No images found!\n\nTip: Try clicking on gallery/images first.');
  return;
}

// ========================================
// CREATE DIALOG
// ========================================

var div = document.createElement('div');
div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:2px solid #333;padding:30px;width:500px;max-height:80vh;overflow-y:auto;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:Arial;border-radius:8px;';
div.innerHTML = '<h2 style="margin-top:0;">Found ' + urls.length + ' Images</h2>' +
  '<p style="color:#666;margin-bottom:20px;">Detected: <strong>' + siteName + '</strong> scraper</p>' +
  '<button id="htmlBtn" style="width:100%;padding:15px;margin:10px 0;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📄 Download Advanced HTML Viewer</button>' +
  '<button id="csvBtn" style="width:100%;padding:15px;margin:10px 0;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📊 Download CSV</button>' +
  '<button id="copyBtn" style="width:100%;padding:15px;margin:10px 0;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📋 Copy URLs</button>' +
  '<button id="closeBtn" style="width:100%;padding:15px;margin:10px 0;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">❌ Close</button>';
document.body.appendChild(div);

// ========================================
// GENERATE HTML CONTENT
// ========================================

function generateHTMLViewer(){
  var propertyTitle = (document.title || 'Property').replace(/"/g, '\\"').replace(/\n/g, ' ');
  var propertyUrl = window.location.href;
  var hostname = (window.location.hostname.replace('www.', '') || 'local');
  
  // Start building HTML - using template string approach
  var htmlParts = [];
  
  // HTML Header
  htmlParts.push('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>' + hostname + ' Images</title>\n');
  
  // CSS Styles
  htmlParts.push('<style>\n');
  htmlParts.push('*{margin:0;padding:0;box-sizing:border-box;}\n');
  htmlParts.push('body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5;}\n');
  htmlParts.push('h1{color:#333;margin-bottom:10px;}\n');
  htmlParts.push('.subtitle{color:#666;font-size:14px;margin-bottom:20px;}\n');
  htmlParts.push('.filters{background:#f8f9fa;padding:20px;margin-bottom:20px;border-radius:4px;border:1px solid #dee2e6;}\n');
  htmlParts.push('.filters h3{margin-bottom:15px;color:#333;font-size:16px;}\n');
  htmlParts.push('.filter-row{display:flex;gap:15px;margin-bottom:15px;align-items:center;flex-wrap:wrap;}\n');
  htmlParts.push('.filter-row label{font-weight:bold;color:#555;min-width:100px;}\n');
  htmlParts.push('.filter-row input[type="number"]{padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;}\n');
  htmlParts.push('.filter-row button{padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}\n');
  htmlParts.push('.filter-row button:hover{background:#0056b3;}\n');
  htmlParts.push('.filter-row button.reset{background:#6c757d;}\n');
  htmlParts.push('.selection-controls{background:#fff3cd;padding:15px;margin-bottom:20px;border-radius:4px;border:1px solid #ffc107;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}\n');
  htmlParts.push('.selection-controls button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px;}\n');
  htmlParts.push('.select-all{background:#28a745;color:white;}\n');
  htmlParts.push('.select-none{background:#dc3545;color:white;}\n');
  htmlParts.push('.select-large{background:#17a2b8;color:white;}\n');
  htmlParts.push('.delete-selected{background:#fd7e14;color:white;}\n');
  htmlParts.push('.stats{background:#e7f3ff;padding:15px;margin-bottom:20px;border-radius:4px;display:none;}\n');
  htmlParts.push('.button-group{margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;}\n');
  htmlParts.push('.download-all-btn,.csv-btn{padding:12px 24px;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;font-weight:bold;flex:1;min-width:180px;}\n');
  htmlParts.push('.download-all-btn{background:#28a745;}\n');
  htmlParts.push('.csv-btn{background:#17a2b8;}\n');
  htmlParts.push('.download-all-btn:disabled,.csv-btn:disabled{background:#6c757d;cursor:not-allowed;}\n');
  htmlParts.push('#status{width:100%;margin-top:10px;color:#666;font-weight:bold;}\n');
  htmlParts.push('.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}\n');
  htmlParts.push('.image-card{background:white;padding:15px;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);position:relative;}\n');
  htmlParts.push('.image-card.hidden{display:none;}\n');
  htmlParts.push('.image-card.deleted{display:none;}\n');
  htmlParts.push('.image-card.selected{border:3px solid #28a745;}\n');
  htmlParts.push('.image-card h3{margin-bottom:10px;color:#333;font-size:16px;}\n');
  htmlParts.push('.image-card .dimensions{color:#666;font-size:13px;margin-bottom:10px;font-weight:bold;}\n');
  htmlParts.push('.image-card .checkbox-wrapper{position:absolute;top:10px;right:10px;}\n');
  htmlParts.push('.image-card input[type="checkbox"]{width:24px;height:24px;cursor:pointer;}\n');
  htmlParts.push('.image-card .tag-selector{margin:10px 0;padding:8px;background:#f8f9fa;border-radius:4px;}\n');
  htmlParts.push('.image-card .tag-selector select{width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;}\n');
  htmlParts.push('.image-card .tag-badge{display:inline-block;padding:4px 8px;background:#6f42c1;color:white;border-radius:3px;font-size:11px;font-weight:bold;margin-bottom:8px;}\n');
  htmlParts.push('.image-card img{width:100%;height:auto;border:1px solid #ddd;cursor:pointer;}\n');
  htmlParts.push('.image-card a{display:inline-block;margin-top:10px;padding:8px 16px;background:#007bff;color:white;text-decoration:none;border-radius:4px;}\n');
  htmlParts.push('</style>\n</head>\n<body>\n');
  
  // Body Content
  htmlParts.push('<h1>Found ' + urls.length + ' Images</h1>\n');
  htmlParts.push('<div class="subtitle">From: ' + hostname + ' (' + siteName + ' scraper)</div>\n');
  htmlParts.push('<div class="stats" id="stats"><strong>📐 Image Statistics:</strong><div id="statsContent"></div></div>\n');
  
  // Filters
  htmlParts.push('<div class="filters">\n<h3>🔍 Filter Images</h3>\n');
  htmlParts.push('<div class="filter-row">\n');
  htmlParts.push('<label>Min Width:</label><input type="number" id="minWidth" placeholder="e.g., 1000" style="width:120px;">\n');
  htmlParts.push('<label style="margin-left:20px;">Min Height:</label><input type="number" id="minHeight" placeholder="e.g., 800" style="width:120px;">\n');
  htmlParts.push('<label style="margin-left:20px;">Min MP:</label><input type="number" id="minMP" placeholder="e.g., 2" step="0.1" style="width:120px;">\n');
  htmlParts.push('<button onclick="applyFilters()">Apply Filters</button>\n');
  htmlParts.push('<button class="reset" onclick="resetFilters()">Reset</button>\n');
  htmlParts.push('</div>\n<div id="filterStatus"></div>\n</div>\n');
  
  // Selection Controls
  htmlParts.push('<div class="selection-controls">\n');
  htmlParts.push('<button class="select-all" onclick="selectAll()">✓ Select All</button>\n');
  htmlParts.push('<button class="select-none" onclick="selectNone()">✗ Deselect All</button>\n');
  htmlParts.push('<button class="select-large" onclick="selectLarge()">Select Large (>2MP)</button>\n');
  htmlParts.push('<button class="delete-selected" onclick="deleteSelected()">🗑️ Delete Selected</button>\n');
  htmlParts.push('<span style="flex:1;"></span>\n');
  htmlParts.push('<strong id="selectedCount">0 selected</strong>\n');
  htmlParts.push('</div>\n');
  
  // Button Group
  htmlParts.push('<div class="button-group">\n');
  htmlParts.push('<button class="download-all-btn" onclick="downloadSelected()">⬇️ Download Selected</button>\n');
  htmlParts.push('<button class="csv-btn" onclick="exportCSV()">📊 Export to CSV</button>\n');
  htmlParts.push('<div id="status"></div>\n');
  htmlParts.push('</div>\n');
  
  // Image Gallery
  htmlParts.push('<div class="image-gallery" id="gallery">\n');
  
  // Add each image card
  urls.forEach(function(url, i){
    htmlParts.push('<div class="image-card" id="card' + i + '" data-index="' + i + '" data-original-index="' + i + '">\n');
    htmlParts.push('<div class="checkbox-wrapper"><input type="checkbox" id="check' + i + '" onchange="updateSelection()"></div>\n');
    htmlParts.push('<h3>Image ' + (i+1) + '</h3>\n');
    htmlParts.push('<div id="tagBadge' + i + '" class="tag-badge" style="display:none;"></div>\n');
    htmlParts.push('<div class="dimensions" id="dim' + i + '">📐 Loading...</div>\n');
    htmlParts.push('<div class="tag-selector">\n');
    htmlParts.push('<select id="tagSelect' + i + '" onchange="handleTagChange(' + i + ')">\n');
    htmlParts.push('<option value="">-- Assign Tag --</option>\n');
    htmlParts.push('<option value="Primary Image">Primary Image</option>\n');
    htmlParts.push('<option value="Alternate Image 1">Alternate Image 1</option>\n');
    htmlParts.push('<option value="Alternate Image 2">Alternate Image 2</option>\n');
    htmlParts.push('<option value="ProMap">ProMap</option>\n');
    htmlParts.push('</select>\n</div>\n');
    htmlParts.push('<img src="' + url + '" id="img' + i + '" onclick="window.open(this.src)">\n');
    htmlParts.push('<a href="' + url + '" target="_blank">Open Full Size →</a>\n');
    htmlParts.push('</div>\n');
  });
  
  htmlParts.push('</div>\n');
  
  // Now add the JavaScript - this is the complete working viewer script
  htmlParts.push('<script>\n');
  htmlParts.push('const imageUrls=' + JSON.stringify(urls) + ';\n');
  htmlParts.push('const propertyTitle="' + propertyTitle + '";\n');
  htmlParts.push('const propertyUrl="' + propertyUrl + '";\n');
  htmlParts.push('const imageDimensions=[];\n');
  htmlParts.push('const imageTags={};\n');
  htmlParts.push('const tagToImageIndex={};\n');
  htmlParts.push('let allLoaded=false,loadedCount=0,errorCount=0;\n');
  htmlParts.push('let deletedIndices=new Set();\n');
  
  // Add the complete JavaScript functions as a single block
  htmlParts.push(getViewerJavaScript());
  
  htmlParts.push('</script>\n</body>\n</html>');
  
  return htmlParts.join('');
}

// JavaScript for the HTML viewer
function getViewerJavaScript(){
  return `
function handleTagChange(imageIndex){
  const select=document.getElementById("tagSelect"+imageIndex);
  const newTag=select.value;
  const oldTag=imageTags[imageIndex];
  if(oldTag){
    delete tagToImageIndex[oldTag];
    delete imageTags[imageIndex];
    document.getElementById("tagBadge"+imageIndex).style.display="none";
  }
  if(newTag){
    if(tagToImageIndex[newTag]!==undefined){
      const prevIndex=tagToImageIndex[newTag];
      delete imageTags[prevIndex];
      document.getElementById("tagSelect"+prevIndex).value="";
      document.getElementById("tagBadge"+prevIndex).style.display="none";
    }
    imageTags[imageIndex]=newTag;
    tagToImageIndex[newTag]=imageIndex;
    const badge=document.getElementById("tagBadge"+imageIndex);
    badge.textContent=newTag;
    badge.style.display="inline-block";
  }
}
window.onload=function(){
  const imgs=document.querySelectorAll(".image-gallery img");
  const widths=[],heights=[];
  imgs.forEach((img,i)=>{
    const updateDimensions=function(){
      const w=img.naturalWidth,h=img.naturalHeight;
      if(w>0&&h>0){
        const mp=(w*h/1000000).toFixed(1);
        imageDimensions[i]={width:w,height:h,megapixels:parseFloat(mp)};
        widths.push(w);heights.push(h);
        document.getElementById("dim"+i).textContent="📐 "+w+" × "+h+" px ("+mp+" MP)";
        document.getElementById("card"+i).setAttribute("data-width",w);
        document.getElementById("card"+i).setAttribute("data-height",h);
        document.getElementById("card"+i).setAttribute("data-mp",mp);
      }else{
        imageDimensions[i]={width:0,height:0,megapixels:0};
        document.getElementById("card"+i).classList.add("error");
      }
      loadedCount++;
      if(loadedCount===imgs.length){
        allLoaded=true;
        if(widths.length>0){
          const avgW=Math.round(widths.reduce((a,b)=>a+b,0)/widths.length);
          const avgH=Math.round(heights.reduce((a,b)=>a+b,0)/heights.length);
          document.getElementById("stats").style.display="block";
          document.getElementById("statsContent").innerHTML="<div>Valid: "+(imgs.length-errorCount)+"</div><div>Avg: "+avgW+"×"+avgH+"px</div>";
        }
      }
    };
    img.onload=updateDimensions;
    img.onerror=function(){errorCount++;loadedCount++;};
    if(img.complete)updateDimensions();
  });
};
function applyFilters(){
  if(!allLoaded){alert("Please wait for images to load!");return;}
  const minW=parseInt(document.getElementById("minWidth").value)||0;
  const minH=parseInt(document.getElementById("minHeight").value)||0;
  const minMP=parseFloat(document.getElementById("minMP").value)||0;
  let hiddenCount=0;
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{
    const w=parseInt(card.getAttribute("data-width"))||0;
    const h=parseInt(card.getAttribute("data-height"))||0;
    const mp=parseFloat(card.getAttribute("data-mp"))||0;
    if(w>=minW&&h>=minH&&mp>=minMP){card.classList.remove("hidden");}else{card.classList.add("hidden");hiddenCount++;}
  });
  document.getElementById("filterStatus").textContent="Showing "+(imageUrls.length-deletedIndices.size-hiddenCount)+" images";
  updateSelection();
}
function resetFilters(){
  document.getElementById("minWidth").value="";
  document.getElementById("minHeight").value="";
  document.getElementById("minMP").value="";
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>card.classList.remove("hidden"));
  document.getElementById("filterStatus").textContent="";
  updateSelection();
}
function selectAll(){
  document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input[type='checkbox']").forEach(cb=>{
    cb.checked=true;cb.parentElement.parentElement.classList.add("selected");
  });
  updateSelection();
}
function selectNone(){
  document.querySelectorAll("input[type='checkbox']").forEach(cb=>{
    cb.checked=false;cb.parentElement.parentElement.classList.remove("selected");
  });
  updateSelection();
}
function selectLarge(){
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{
    const mp=parseFloat(card.getAttribute("data-mp"))||0;
    const checkbox=card.querySelector("input[type='checkbox']");
    if(mp>2&&!card.classList.contains("hidden")){
      checkbox.checked=true;card.classList.add("selected");
    }else{
      checkbox.checked=false;card.classList.remove("selected");
    }
  });
  updateSelection();
}
function deleteSelected(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  if(!confirm("Delete "+selected.length+" images?")){return;}
  selected.forEach(idx=>{
    deletedIndices.add(idx);
    const card=document.getElementById("card"+idx);
    if(card){card.classList.add("deleted");card.querySelector("input[type='checkbox']").checked=false;}
  });
  updateSelection();
}
function updateSelection(){
  const checkboxes=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input[type='checkbox']");
  const selectedCount=Array.from(checkboxes).filter(cb=>cb.checked).length;
  document.getElementById("selectedCount").textContent=selectedCount+" selected";
  document.querySelectorAll(".image-card").forEach(card=>{
    const checkbox=card.querySelector("input[type='checkbox']");
    if(checkbox&&checkbox.checked){card.classList.add("selected");}else{card.classList.remove("selected");}
  });
}
function getSelectedIndices(){
  const selected=[];
  document.querySelectorAll("input[type='checkbox']:checked").forEach(cb=>{
    const card=cb.closest(".image-card");
    selected.push(parseInt(card.getAttribute("data-original-index")));
  });
  return selected.sort((a,b)=>a-b);
}
function exportCSV(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  const btn=document.querySelector(".csv-btn");
  btn.disabled=true;btn.textContent="Exporting...";
  const rows=["Property,URL,Image Number,Image URL,Width,Height,Megapixels,Tag"];
  selected.forEach((origIdx,newIdx)=>{
    const dim=imageDimensions[origIdx]||{width:0,height:0,megapixels:0};
    const tag=imageTags[origIdx]||"";
    rows.push('"'+propertyTitle.replace(/"/g,'""')+'","'+propertyUrl+'",'+(newIdx+1)+',"'+imageUrls[origIdx]+'",'+dim.width+','+dim.height+','+dim.megapixels+',"'+tag+'"');
  });
  const csv=rows.join("\\r\\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="images_"+Date.now()+".csv";
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  btn.textContent="✓ Exported!";
  setTimeout(()=>{btn.textContent="📊 Export to CSV";btn.disabled=false;},2000);
}
async function downloadSelected(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  const btn=document.querySelector(".download-all-btn");
  const status=document.getElementById("status");
  btn.disabled=true;btn.textContent="Downloading...";
  for(let i=0;i<selected.length;i++){
    const origIdx=selected[i];
    const newIdx=i+1;
    try{
      status.textContent="Downloading "+newIdx+"/"+selected.length+"...";
      const response=await fetch(imageUrls[origIdx]);
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="Image_"+newIdx+".jpg";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await new Promise(resolve=>setTimeout(resolve,500));
    }catch(error){
      console.error("Download error:",error);
      status.textContent="Error on "+newIdx+", continuing...";
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }
  status.textContent="✅ Downloaded "+selected.length+" images!";
  btn.textContent="⬇️ Download Selected";btn.disabled=false;
}
`;
}

// ========================================
// DOWNLOAD HTML BUTTON
// ========================================

document.getElementById('htmlBtn').onclick = function(){
  var html = generateHTMLViewer();
  var blob = new Blob([html], {type: 'text/html'});
  var blobUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'images_' + Date.now() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  alert('Advanced HTML viewer downloaded!\n\n✅ Filter & tag images\n✅ Download with incremental naming\n✅ Export to CSV with tags');
};

// ========================================
// DOWNLOAD CSV BUTTON  
// ========================================

document.getElementById('csvBtn').onclick = function(){
  var csv = 'Property,URL,Image Number,Image URL\r\n';
  urls.forEach(function(url, i){
    csv += '"' + document.title.replace(/"/g, '""') + '","' + window.location.href + '",' + (i+1) + ',"' + url + '"\r\n';
  });
  var blob = new Blob([csv], {type: 'text/csv'});
  var blobUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'images_' + Date.now() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  alert('CSV file downloaded!');
};

// ========================================
// COPY URLs BUTTON
// ========================================

document.getElementById('copyBtn').onclick = function(){
  var textarea = document.createElement('textarea');
  textarea.value = urls.join('\n');
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Copied ' + urls.length + ' URLs!');
};

// ========================================
// CLOSE BUTTON
// ========================================

document.getElementById('closeBtn').onclick = function(){
  document.body.removeChild(div);
};

})();

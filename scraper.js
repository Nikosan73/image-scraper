(function(){

// VERSION
var VERSION = '1.0.0';

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
  email:{
    name:'Email (HTML)',
    detect:function(){
      return!!document.querySelector('img[src^="data:image"]')||
        document.body.innerHTML.includes('cid:')||
        !!document.querySelector('meta[name="Generator"][content*="Microsoft"]')||
        document.querySelectorAll('a[href^="mailto:"]').length>2;
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src&&img.src.startsWith('data:image/')){
          var m=img.src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
          if(m&&m[2].length>100)u.push(img.src);
        }else if(img.src&&img.src.startsWith('http')){
          var w=img.naturalWidth||img.width||0;
          var h=img.naturalHeight||img.height||0;
          if(w>50&&h>50&&!u.includes(img.src))u.push(img.src);
        }
      });
      return u.filter(function(url){return!url.includes('spacer')&&!url.includes('tracking')});
    }
  },
  generic:{
    name:'Generic',
    detect:function(){return true},
    extract:function(){
      var u=[];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src&&img.src.startsWith('http')&&img.naturalWidth>50&&!u.includes(img.src))u.push(img.src);
      });
      document.querySelectorAll('[style*="background-image"]').forEach(function(el){
        var style=el.getAttribute('style')||'';
        var matches=style.match(/url\(['"&quot;]?([^'"&quot;)]+)['"&quot;]?\)/g);
        if(matches){
          matches.forEach(function(match){
            var url=match.replace(/url\(['"&quot;]?/,'').replace(/['"&quot;)]/g,'').trim();
            if(url.startsWith('/'))url=window.location.origin+url;
            else if(!url.startsWith('http')&&!url.startsWith('data:'))url=window.location.origin+'/'+url;
            if(url.startsWith('http')&&!u.includes(url))u.push(url);
          });
        }
      });
      return u.filter(function(url){
        return!url.includes('logo')&&!url.includes('icon')&&!url.includes('sprite')&&
          !url.includes('tiny')&&!url.includes('small')&&!url.match(/\.(svg|gif)$/i);
      });
    }
  }
};

var detected='generic';
var siteName='Generic';
for(var key in HANDLERS){
  if(key!=='generic'&&HANDLERS[key].detect()){
    detected=key;
    siteName=HANDLERS[key].name;
    break;
  }
}

var urls=HANDLERS[detected].extract();
if(urls.length===0){alert('No images found!');return}

var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:2px solid #333;padding:30px;width:500px;max-height:80vh;overflow-y:auto;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:Arial;border-radius:8px;';
div.innerHTML='<h2 style="margin-top:0;">Found '+urls.length+' Images</h2>'+
  '<p style="color:#666;margin-bottom:10px;">Detected: <strong>'+siteName+'</strong> scraper</p>'+
  '<p style="color:#999;font-size:12px;margin-bottom:20px;">Version '+VERSION+'</p>'+
  '<button id="htmlBtn" style="width:100%;padding:15px;margin:10px 0;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📄 Download HTML Viewer</button>'+
  '<button id="closeBtn" style="width:100%;padding:15px;margin:10px 0;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">❌ Close</button>';
document.body.appendChild(div);

document.getElementById('closeBtn').onclick=function(){
  document.body.removeChild(div);
};

document.getElementById('htmlBtn').onclick=function(){
  var title=document.title.replace(/"/g,'').replace(/\\/g,'').replace(/\n/g,' ');
  var pageUrl=window.location.href;
  var host=window.location.hostname.replace('www.','')||'local';
  
  var htmlContent=buildHTML(urls,title,pageUrl,host,siteName);
  
  var blob=new Blob([htmlContent],{type:'text/html'});
  var blobUrl=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=blobUrl;
  a.download='images_'+Date.now()+'.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  alert('HTML viewer downloaded!');
};

function buildHTML(imageUrls,pageTitle,pageUrl,hostname,scraper){
  var html=[];
  html.push('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Images</title>');
  html.push('<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;padding:20px;background:#f5f5f5}');
  html.push('h1{margin-bottom:10px}.subtitle{color:#666;font-size:14px;margin-bottom:5px}');
  html.push('.version{color:#999;font-size:12px;margin-bottom:20px}');
  html.push('.filters{background:#f8f9fa;padding:20px;margin:20px 0;border-radius:4px}');
  html.push('.filter-row{display:flex;gap:15px;margin:10px 0;flex-wrap:wrap;align-items:center}');
  html.push('.filter-row label{font-weight:bold;color:#555}');
  html.push('.filter-row input{padding:8px;border:1px solid #ddd;border-radius:4px;width:120px}');
  html.push('.filter-row button{padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer}');
  html.push('.filter-row button.reset{background:#6c757d}');
  html.push('.selection-controls{background:#fff3cd;padding:15px;margin:20px 0;border-radius:4px;display:flex;gap:10px;flex-wrap:wrap}');
  html.push('.selection-controls button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-weight:bold}');
  html.push('.select-all{background:#28a745;color:white}.select-none{background:#dc3545;color:white}');
  html.push('.delete-selected{background:#fd7e14;color:white}');
  html.push('.button-group{margin:20px 0;display:flex;gap:10px}');
  html.push('.csv-btn{padding:12px 24px;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;flex:1}');
  html.push('.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:20px}');
  html.push('.image-card{background:white;padding:15px;border-radius:4px;position:relative}');
  html.push('.image-card.hidden{display:none}.image-card.deleted{display:none}.image-card.selected{border:3px solid #28a745}');
  html.push('.checkbox-wrapper{position:absolute;top:10px;right:10px}.checkbox-wrapper input{width:24px;height:24px}');
  html.push('.tag-selector{margin:10px 0;padding:8px;background:#f8f9fa;border-radius:4px}.tag-selector select{width:100%;padding:6px}');
  html.push('.tag-badge{display:inline-block;padding:4px 8px;background:#6f42c1;color:white;border-radius:3px;font-size:11px;margin:5px 0}');
  html.push('.dimensions{color:#666;font-size:13px;margin:5px 0;font-weight:bold}');
  html.push('.file-size{color:#888;font-size:12px;margin:5px 0}');
  html.push('.image-card img{width:100%;height:auto;border:1px solid #ddd;margin:10px 0}');
  html.push('.stats{background:#e7f3ff;padding:15px;margin:20px 0;border-radius:4px;display:none}');
  html.push('.stats div{margin:5px 0}</style></head><body>');
  
  html.push('<h1>Found '+imageUrls.length+' Images</h1>');
  html.push('<div class="subtitle">From: '+hostname+' ('+scraper+')</div>');
  html.push('<div class="version">Scraper Version '+VERSION+'</div>');
  html.push('<div class="stats" id="stats"><strong>📐 Image Statistics:</strong><div id="statsContent"></div></div>');
  
  html.push('<div class="filters"><h3>🔍 Filter Images</h3>');
  html.push('<div class="filter-row">');
  html.push('<label>Min Width:</label><input type="number" id="minWidth" placeholder="1000">');
  html.push('<label>Max Width:</label><input type="number" id="maxWidth" placeholder="5000">');
  html.push('</div><div class="filter-row">');
  html.push('<label>Min Height:</label><input type="number" id="minHeight" placeholder="800">');
  html.push('<label>Max Height:</label><input type="number" id="maxHeight" placeholder="5000">');
  html.push('</div><div class="filter-row">');
  html.push('<label>Min Size (KB):</label><input type="number" id="minSize" placeholder="100">');
  html.push('<label>Max Size (KB):</label><input type="number" id="maxSize" placeholder="5000">');
  html.push('</div><div class="filter-row">');
  html.push('<button onclick="applyFilters()">Apply Filters</button>');
  html.push('<button class="reset" onclick="resetFilters()">Reset</button>');
  html.push('</div><div id="filterStatus" style="margin-top:10px;color:#666"></div></div>');
  
  html.push('<div class="selection-controls">');
  html.push('<button class="select-all" onclick="selectAll()">✓ Select All Visible</button>');
  html.push('<button class="select-none" onclick="selectNone()">✗ Deselect All</button>');
  html.push('<button class="delete-selected" onclick="deleteSelected()">🗑️ Delete Selected</button>');
  html.push('<span style="flex:1"></span>');
  html.push('<strong id="selectedCount">0 selected</strong></div>');
  
  html.push('<div class="button-group">');
  html.push('<button class="csv-btn" onclick="exportCSV()">📊 Export Selected to CSV</button></div>');
  
  html.push('<div class="image-gallery">');
  for(var i=0;i<imageUrls.length;i++){
    html.push('<div class="image-card" id="c'+i+'" data-index="'+i+'">');
    html.push('<div class="checkbox-wrapper"><input type="checkbox" id="ch'+i+'" onchange="updateSelection()"></div>');
    html.push('<h3>Image '+(i+1)+'</h3>');
    html.push('<div id="tb'+i+'" class="tag-badge" style="display:none"></div>');
    html.push('<div class="dimensions" id="dim'+i+'">📐 Loading...</div>');
    html.push('<div class="file-size" id="size'+i+'">💾 Calculating...</div>');
    html.push('<div class="tag-selector"><select id="ts'+i+'" onchange="tagChange('+i+')">');
    html.push('<option value="">-- Tag --</option>');
    html.push('<option value="Primary Image">Primary Image</option>');
    html.push('<option value="Alternate Image 1">Alternate Image 1</option>');
    html.push('<option value="Alternate Image 2">Alternate Image 2</option>');
    html.push('<option value="ProMap">ProMap</option>');
    html.push('</select></div>');
    html.push('<img src="'+imageUrls[i]+'" id="im'+i+'">');
    html.push('<a href="'+imageUrls[i]+'" download="Image_'+(i+1)+'.jpg" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#007bff;color:white;text-decoration:none;border-radius:4px">⬇️ Download</a>');
    html.push('</div>');
  }
  html.push('</div>');
  
  html.push('<script>');
  html.push('var imgUrls='+JSON.stringify(imageUrls)+';');
  html.push('var propTitle='+JSON.stringify(pageTitle)+';');
  html.push('var propUrl='+JSON.stringify(pageUrl)+';');
  html.push('var tags={};var tagMap={};var deleted=new Set();');
  html.push('var imageDims=[];var imageSizes=[];');
  html.push('var loadedCount=0;var allLoaded=false;');
  
  html.push('window.onload=function(){');
  html.push('var imgs=document.querySelectorAll(".image-gallery img");');
  html.push('var widths=[],heights=[];');
  html.push('imgs.forEach(function(img,i){');
  html.push('var updateDims=function(){');
  html.push('var w=img.naturalWidth,h=img.naturalHeight;');
  html.push('if(w>0&&h>0){');
  html.push('var mp=(w*h/1000000).toFixed(1);');
  html.push('imageDims[i]={width:w,height:h,megapixels:parseFloat(mp)};');
  html.push('widths.push(w);heights.push(h);');
  html.push('document.getElementById("dim"+i).textContent="📐 "+w+" × "+h+" px ("+mp+" MP)";');
  html.push('document.getElementById("c"+i).setAttribute("data-width",w);');
  html.push('document.getElementById("c"+i).setAttribute("data-height",h);');
  html.push('document.getElementById("c"+i).setAttribute("data-mp",mp);');
  html.push('fetch(imgUrls[i]).then(function(r){return r.blob()}).then(function(b){');
  html.push('var kb=(b.size/1024).toFixed(1);');
  html.push('imageSizes[i]=parseFloat(kb);');
  html.push('document.getElementById("size"+i).textContent="💾 "+kb+" KB";');
  html.push('document.getElementById("c"+i).setAttribute("data-size",kb);');
  html.push('}).catch(function(){document.getElementById("size"+i).textContent="💾 Size unavailable"});');
  html.push('}loadedCount++;');
  html.push('if(loadedCount===imgs.length){');
  html.push('allLoaded=true;');
  html.push('if(widths.length>0){');
  html.push('var avgW=Math.round(widths.reduce(function(a,b){return a+b},0)/widths.length);');
  html.push('var avgH=Math.round(heights.reduce(function(a,b){return a+b},0)/heights.length);');
  html.push('var maxW=Math.max.apply(null,widths);');
  html.push('var maxH=Math.max.apply(null,heights);');
  html.push('document.getElementById("stats").style.display="block";');
  html.push('document.getElementById("statsContent").innerHTML="<div>Valid Images: "+imgs.length+"</div><div>Average: "+avgW+" × "+avgH+" px</div><div>Largest: "+maxW+" × "+maxH+" px</div>"');
  html.push('}}};');
  html.push('img.onload=updateDims;img.onerror=function(){loadedCount++};');
  html.push('if(img.complete)updateDims()});};');
  
  html.push('function tagChange(i){');
  html.push('var s=document.getElementById("ts"+i);var nt=s.value;var ot=tags[i];');
  html.push('if(ot){delete tagMap[ot];delete tags[i];document.getElementById("tb"+i).style.display="none"}');
  html.push('if(nt){if(tagMap[nt]!==undefined){var p=tagMap[nt];delete tags[p];');
  html.push('document.getElementById("ts"+p).value="";document.getElementById("tb"+p).style.display="none"}');
  html.push('tags[i]=nt;tagMap[nt]=i;var b=document.getElementById("tb"+i);');
  html.push('b.textContent=nt;b.style.display="inline-block"}}');
  
  html.push('function applyFilters(){');
  html.push('if(!allLoaded){alert("Please wait for images to load!");return}');
  html.push('var minW=parseInt(document.getElementById("minWidth").value)||0;');
  html.push('var maxW=parseInt(document.getElementById("maxWidth").value)||999999;');
  html.push('var minH=parseInt(document.getElementById("minHeight").value)||0;');
  html.push('var maxH=parseInt(document.getElementById("maxHeight").value)||999999;');
  html.push('var minS=parseFloat(document.getElementById("minSize").value)||0;');
  html.push('var maxS=parseFloat(document.getElementById("maxSize").value)||999999;');
  html.push('var hiddenCount=0;');
  html.push('document.querySelectorAll(".image-card:not(.deleted)").forEach(function(c){');
  html.push('var w=parseInt(c.getAttribute("data-width"))||0;');
  html.push('var h=parseInt(c.getAttribute("data-height"))||0;');
  html.push('var s=parseFloat(c.getAttribute("data-size"))||0;');
  html.push('if(w>=minW&&w<=maxW&&h>=minH&&h<=maxH&&s>=minS&&s<=maxS){c.classList.remove("hidden")}else{c.classList.add("hidden");hiddenCount++}');
  html.push('});');
  html.push('var totalVis=imgUrls.length-deleted.size;');
  html.push('document.getElementById("filterStatus").textContent="Showing "+(totalVis-hiddenCount)+" of "+totalVis+" images";');
  html.push('updateSelection()}');
  
  html.push('function resetFilters(){');
  html.push('document.getElementById("minWidth").value="";');
  html.push('document.getElementById("maxWidth").value="";');
  html.push('document.getElementById("minHeight").value="";');
  html.push('document.getElementById("maxHeight").value="";');
  html.push('document.getElementById("minSize").value="";');
  html.push('document.getElementById("maxSize").value="";');
  html.push('document.querySelectorAll(".image-card").forEach(function(c){c.classList.remove("hidden")});');
  html.push('document.getElementById("filterStatus").textContent="";updateSelection()}');
  
  html.push('function selectAll(){document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input").forEach(function(cb){');
  html.push('cb.checked=true;cb.closest(".image-card").classList.add("selected")});updateSelection()}');
  
  html.push('function selectNone(){document.querySelectorAll("input[type=checkbox]").forEach(function(cb){');
  html.push('cb.checked=false;cb.closest(".image-card").classList.remove("selected")});updateSelection()}');
  
  html.push('function deleteSelected(){var sel=[];');
  html.push('document.querySelectorAll("input[type=checkbox]:checked").forEach(function(cb){');
  html.push('var idx=parseInt(cb.closest(".image-card").dataset.index);sel.push(idx)});');
  html.push('if(sel.length===0){alert("Select images first");return}');
  html.push('if(!confirm("Delete "+sel.length+" images?")){return}');
  html.push('sel.forEach(function(i){deleted.add(i);document.getElementById("c"+i).classList.add("deleted")});updateSelection()}');
  
  html.push('function updateSelection(){');
  html.push('var cnt=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input:checked").length;');
  html.push('document.getElementById("selectedCount").textContent=cnt+" selected";');
  html.push('document.querySelectorAll(".image-card").forEach(function(c){');
  html.push('if(c.querySelector("input").checked)c.classList.add("selected");else c.classList.remove("selected")})}');
  
  html.push('function exportCSV(){var sel=[];');
  html.push('document.querySelectorAll("input:checked").forEach(function(cb){');
  html.push('sel.push(parseInt(cb.closest(".image-card").dataset.index))});');
  html.push('if(sel.length===0){alert("Select images");return}sel.sort(function(a,b){return a-b});');
  html.push('var rows=["Property,URL,Image Number,Image URL,Width,Height,Megapixels,Size (KB),Tag"];');
  html.push('sel.forEach(function(oi,ni){var t=tags[oi]||"";');
  html.push('var d=imageDims[oi]||{width:0,height:0,megapixels:0};');
  html.push('var s=imageSizes[oi]||0;');
  html.push('rows.push(JSON.stringify(propTitle)+","+JSON.stringify(propUrl)+","+(ni+1)+","+JSON.stringify(imgUrls[oi])+","+d.width+","+d.height+","+d.megapixels+","+s+","+JSON.stringify(t))});');
  html.push('var csv=rows.join("\\r\\n");var blob=new Blob([csv],{type:"text/csv"});');
  html.push('var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="images.csv";');
  html.push('document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);alert("CSV exported")}');
  
  html.push('</scr'+'ipt></body></html>');
  
  return html.join('');
}

})();

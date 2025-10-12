(function(){

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
  '<p style="color:#666;margin-bottom:20px;">Detected: <strong>'+siteName+'</strong> scraper</p>'+
  '<button id="htmlBtn" style="width:100%;padding:15px;margin:10px 0;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Download HTML Viewer</button>'+
  '<button id="csvBtn" style="width:100%;padding:15px;margin:10px 0;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Download CSV</button>'+
  '<button id="copyBtn" style="width:100%;padding:15px;margin:10px 0;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Copy URLs</button>'+
  '<button id="closeBtn" style="width:100%;padding:15px;margin:10px 0;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Close</button>';
document.body.appendChild(div);

document.getElementById('csvBtn').onclick=function(){
  var csv='Property,URL,Image Number,Image URL\r\n';
  urls.forEach(function(url,i){
    csv+='"'+document.title.replace(/"/g,'""')+'","'+window.location.href+'",'+(i+1)+',"'+url+'"\r\n';
  });
  var blob=new Blob([csv],{type:'text/csv'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='images_'+Date.now()+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('CSV downloaded!');
};

document.getElementById('copyBtn').onclick=function(){
  var textarea=document.createElement('textarea');
  textarea.value=urls.join('\n');
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Copied '+urls.length+' URLs!');
};

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
  html.push('h1{margin-bottom:10px}.filters{background:#f8f9fa;padding:20px;margin:20px 0;border-radius:4px}');
  html.push('.filter-row{display:flex;gap:15px;margin:10px 0;flex-wrap:wrap}');
  html.push('.filter-row input{padding:8px;border:1px solid #ddd;border-radius:4px}');
  html.push('.filter-row button{padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer}');
  html.push('.selection-controls{background:#fff3cd;padding:15px;margin:20px 0;border-radius:4px;display:flex;gap:10px;flex-wrap:wrap}');
  html.push('.selection-controls button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-weight:bold}');
  html.push('.select-all{background:#28a745;color:white}.select-none{background:#dc3545;color:white}');
  html.push('.delete-selected{background:#fd7e14;color:white}');
  html.push('.button-group{margin:20px 0;display:flex;gap:10px}');
  html.push('.download-all-btn,.csv-btn{padding:12px 24px;color:white;border:none;border-radius:4px;cursor:pointer;flex:1}');
  html.push('.download-all-btn{background:#28a745}.csv-btn{background:#17a2b8}');
  html.push('.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:20px}');
  html.push('.image-card{background:white;padding:15px;border-radius:4px;position:relative}');
  html.push('.image-card.hidden{display:none}.image-card.deleted{display:none}.image-card.selected{border:3px solid #28a745}');
  html.push('.checkbox-wrapper{position:absolute;top:10px;right:10px}.checkbox-wrapper input{width:24px;height:24px}');
  html.push('.tag-selector{margin:10px 0;padding:8px;background:#f8f9fa;border-radius:4px}.tag-selector select{width:100%;padding:6px}');
  html.push('.tag-badge{display:inline-block;padding:4px 8px;background:#6f42c1;color:white;border-radius:3px;font-size:11px;margin:5px 0}');
  html.push('.image-card img{width:100%;height:auto;border:1px solid #ddd;margin:10px 0}</style></head><body>');
  
  html.push('<h1>Found '+imageUrls.length+' Images</h1>');
  html.push('<p>From: '+hostname+' ('+scraper+')</p>');
  
  html.push('<div class="filters"><h3>Filter Images</h3><div class="filter-row">');
  html.push('<label>Min Width: <input type="number" id="minWidth" placeholder="1000"></label>');
  html.push('<label>Min Height: <input type="number" id="minHeight" placeholder="800"></label>');
  html.push('<button onclick="applyFilters()">Apply</button><button onclick="resetFilters()">Reset</button>');
  html.push('</div></div>');
  
  html.push('<div class="selection-controls">');
  html.push('<button class="select-all" onclick="selectAll()">Select All</button>');
  html.push('<button class="select-none" onclick="selectNone()">Deselect All</button>');
  html.push('<button class="delete-selected" onclick="deleteSelected()">Delete Selected</button>');
  html.push('<strong id="selectedCount">0 selected</strong></div>');
  
  html.push('<div class="button-group">');
  html.push('<button class="download-all-btn" onclick="downloadSelected()">Download Selected</button>');
  html.push('<button class="csv-btn" onclick="exportCSV()">Export CSV</button></div>');
  html.push('<div id="status"></div>');
  
  html.push('<div class="image-gallery">');
  for(var i=0;i<imageUrls.length;i++){
    html.push('<div class="image-card" id="c'+i+'" data-index="'+i+'">');
    html.push('<div class="checkbox-wrapper"><input type="checkbox" id="ch'+i+'" onchange="updateSelection()"></div>');
    html.push('<h3>Image '+(i+1)+'</h3>');
    html.push('<div id="tb'+i+'" class="tag-badge" style="display:none"></div>');
    html.push('<div class="tag-selector"><select id="ts'+i+'" onchange="tagChange('+i+')">');
    html.push('<option value="">-- Tag --</option>');
    html.push('<option value="Primary Image">Primary Image</option>');
    html.push('<option value="Alternate Image 1">Alternate Image 1</option>');
    html.push('<option value="Alternate Image 2">Alternate Image 2</option>');
    html.push('<option value="ProMap">ProMap</option>');
    html.push('</select></div>');
    html.push('<img src="'+imageUrls[i]+'" id="im'+i+'"></div>');
  }
  html.push('</div>');
  
  html.push('<script>');
  html.push('var imgUrls='+JSON.stringify(imageUrls)+';');
  html.push('var propTitle='+JSON.stringify(pageTitle)+';');
  html.push('var propUrl='+JSON.stringify(pageUrl)+';');
  html.push('var tags={};var tagMap={};var deleted=new Set();');
  
  html.push('function tagChange(i){');
  html.push('var s=document.getElementById("ts"+i);var nt=s.value;var ot=tags[i];');
  html.push('if(ot){delete tagMap[ot];delete tags[i];document.getElementById("tb"+i).style.display="none"}');
  html.push('if(nt){if(tagMap[nt]!==undefined){var p=tagMap[nt];delete tags[p];');
  html.push('document.getElementById("ts"+p).value="";document.getElementById("tb"+p).style.display="none"}');
  html.push('tags[i]=nt;tagMap[nt]=i;var b=document.getElementById("tb"+i);');
  html.push('b.textContent=nt;b.style.display="inline-block"}}');
  
  html.push('function applyFilters(){');
  html.push('var mw=parseInt(document.getElementById("minWidth").value)||0;');
  html.push('var mh=parseInt(document.getElementById("minHeight").value)||0;');
  html.push('document.querySelectorAll(".image-card:not(.deleted)").forEach(function(c){');
  html.push('var im=c.querySelector("img");');
  html.push('if(im.naturalWidth>=mw&&im.naturalHeight>=mh)c.classList.remove("hidden");');
  html.push('else c.classList.add("hidden")});updateSelection()}');
  
  html.push('function resetFilters(){document.getElementById("minWidth").value="";');
  html.push('document.getElementById("minHeight").value="";');
  html.push('document.querySelectorAll(".image-card").forEach(function(c){c.classList.remove("hidden")});updateSelection()}');
  
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
  html.push('var rows=["Property,URL,Image Number,Image URL,Tag"];');
  html.push('sel.forEach(function(oi,ni){var t=tags[oi]||"";');
  html.push('rows.push(JSON.stringify(propTitle)+","+JSON.stringify(propUrl)+","+(ni+1)+","+JSON.stringify(imgUrls[oi])+","+JSON.stringify(t))});');
  html.push('var csv=rows.join("\\r\\n");var blob=new Blob([csv],{type:"text/csv"});');
  html.push('var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="images.csv";');
  html.push('document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);alert("CSV exported")}');
  
  html.push('function downloadSelected(){var sel=[];');
  html.push('document.querySelectorAll("input:checked").forEach(function(cb){');
  html.push('sel.push(parseInt(cb.closest(".image-card").dataset.index))});');
  html.push('if(sel.length===0){alert("Select images");return}sel.sort(function(a,b){return a-b});');
  html.push('var st=document.getElementById("status");st.textContent="Starting downloads...";');
  html.push('sel.forEach(function(oi,ni){setTimeout(function(){');
  html.push('var a=document.createElement("a");a.href=imgUrls[oi];a.download="Image_"+(ni+1)+".jpg";');
  html.push('document.body.appendChild(a);a.click();document.body.removeChild(a);');
  html.push('st.textContent="Downloading "+(ni+1)+"/"+sel.length},ni*300)});');
  html.push('setTimeout(function(){st.textContent="Check Downloads folder!"},sel.length*300+500)}');
  
  html.push('</scr'+'ipt></body></html>');
  
  return html.join('');
}

})();

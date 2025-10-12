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
  alert('No images found!');
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

// Test if dialog appeared
console.log('Image Scraper: Dialog created with', urls.length, 'images');

// ========================================
// BUTTON HANDLERS
// ========================================

document.getElementById('htmlBtn').onclick = function(){
  alert('Generating HTML viewer...');
  
  try {
    var html = generateAdvancedViewer();
    var blob = new Blob([html], {type: 'text/html'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'images_' + Date.now() + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('HTML viewer downloaded!');
  } catch(e) {
    alert('Error: ' + e.message);
    console.error(e);
  }
};

document.getElementById('csvBtn').onclick = function(){
  var csv = 'Property,URL,Image Number,Image URL\r\n';
  urls.forEach(function(url, i){
    csv += '"' + document.title.replace(/"/g, '""') + '","' + window.location.href + '",' + (i+1) + ',"' + url + '"\r\n';
  });
  var blob = new Blob([csv], {type: 'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'images_' + Date.now() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('CSV downloaded!');
};

document.getElementById('copyBtn').onclick = function(){
  var textarea = document.createElement('textarea');
  textarea.value = urls.join('\n');
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Copied ' + urls.length + ' URLs!');
};

document.getElementById('closeBtn').onclick = function(){
  document.body.removeChild(div);
};

// ========================================
// GENERATE ADVANCED HTML VIEWER
// ========================================

function generateAdvancedViewer(){
  var pt = (document.title || 'Property').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  var pu = window.location.href;
  var hn = (window.location.hostname.replace('www.', '') || 'local');
  
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Images</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}';
  h += 'body{font-family:Arial;padding:20px;background:#f5f5f5}';
  h += 'h1{margin-bottom:10px}';
  h += '.filters{background:#f8f9fa;padding:20px;margin:20px 0;border-radius:4px}';
  h += '.filter-row{display:flex;gap:15px;margin:10px 0;flex-wrap:wrap}';
  h += '.filter-row input{padding:8px;border:1px solid #ddd;border-radius:4px}';
  h += '.filter-row button{padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer}';
  h += '.selection-controls{background:#fff3cd;padding:15px;margin:20px 0;border-radius:4px;display:flex;gap:10px;flex-wrap:wrap}';
  h += '.selection-controls button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-weight:bold}';
  h += '.select-all{background:#28a745;color:white}';
  h += '.select-none{background:#dc3545;color:white}';
  h += '.delete-selected{background:#fd7e14;color:white}';
  h += '.button-group{margin:20px 0;display:flex;gap:10px}';
  h += '.download-all-btn,.csv-btn{padding:12px 24px;color:white;border:none;border-radius:4px;cursor:pointer;flex:1}';
  h += '.download-all-btn{background:#28a745}';
  h += '.csv-btn{background:#17a2b8}';
  h += '.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:20px}';
  h += '.image-card{background:white;padding:15px;border-radius:4px;position:relative}';
  h += '.image-card.hidden{display:none}';
  h += '.image-card.deleted{display:none}';
  h += '.image-card.selected{border:3px solid #28a745}';
  h += '.checkbox-wrapper{position:absolute;top:10px;right:10px}';
  h += '.checkbox-wrapper input{width:24px;height:24px}';
  h += '.tag-selector{margin:10px 0;padding:8px;background:#f8f9fa;border-radius:4px}';
  h += '.tag-selector select{width:100%;padding:6px}';
  h += '.tag-badge{display:inline-block;padding:4px 8px;background:#6f42c1;color:white;border-radius:3px;font-size:11px;margin:5px 0}';
  h += '.image-card img{width:100%;height:auto;border:1px solid #ddd;margin:10px 0}';
  h += '</style></head><body>';
  
  h += '<h1>Found ' + urls.length + ' Images</h1>';
  h += '<p>From: ' + hn + ' (' + siteName + ')</p>';
  
  h += '<div class="filters"><h3>Filter Images</h3><div class="filter-row">';
  h += '<label>Min Width: <input type="number" id="minWidth" placeholder="1000"></label>';
  h += '<label>Min Height: <input type="number" id="minHeight" placeholder="800"></label>';
  h += '<button onclick="applyFilters()">Apply</button>';
  h += '<button onclick="resetFilters()">Reset</button>';
  h += '</div></div>';
  
  h += '<div class="selection-controls">';
  h += '<button class="select-all" onclick="selectAll()">Select All</button>';
  h += '<button class="select-none" onclick="selectNone()">Deselect All</button>';
  h += '<button class="delete-selected" onclick="deleteSelected()">Delete Selected</button>';
  h += '<strong id="selectedCount">0 selected</strong>';
  h += '</div>';
  
  h += '<div class="button-group">';
  h += '<button class="download-all-btn" onclick="downloadSelected()">Download Selected</button>';
  h += '<button class="csv-btn" onclick="exportCSV()">Export CSV</button>';
  h += '</div>';
  h += '<div id="status"></div>';
  
  h += '<div class="image-gallery">';
  for(var i=0; i<urls.length; i++){
    h += '<div class="image-card" id="c'+i+'" data-index="'+i+'">';
    h += '<div class="checkbox-wrapper"><input type="checkbox" id="ch'+i+'" onchange="updateSelection()"></div>';
    h += '<h3>Image '+(i+1)+'</h3>';
    h += '<div id="tb'+i+'" class="tag-badge" style="display:none"></div>';
    h += '<div class="tag-selector"><select id="ts'+i+'" onchange="tagChange('+i+')">';
    h += '<option value="">-- Tag --</option>';
    h += '<option value="Primary Image">Primary Image</option>';
    h += '<option value="Alternate Image 1">Alternate Image 1</option>';
    h += '<option value="Alternate Image 2">Alternate Image 2</option>';
    h += '<option value="ProMap">ProMap</option>';
    h += '</select></div>';
    h += '<img src="'+urls[i]+'" id="im'+i+'">';
    h += '</div>';
  }
  h += '</div>';
  
  h += '<script>';
  h += 'var imgUrls='+JSON.stringify(urls)+';';
  h += 'var propTitle="'+pt+'";';
  h += 'var propUrl="'+pu+'";';
  h += 'var tags={};';
  h += 'var tagMap={};';
  h += 'var deleted=new Set();';
  h += 'function tagChange(i){';
  h += 'var s=document.getElementById("ts"+i);';
  h += 'var nt=s.value;';
  h += 'var ot=tags[i];';
  h += 'if(ot){delete tagMap[ot];delete tags[i];document.getElementById("tb"+i).style.display="none"}';
  h += 'if(nt){';
  h += 'if(tagMap[nt]!==undefined){var p=tagMap[nt];delete tags[p];document.getElementById("ts"+p).value="";document.getElementById("tb"+p).style.display="none"}';
  h += 'tags[i]=nt;tagMap[nt]=i;';
  h += 'var b=document.getElementById("tb"+i);b.textContent=nt;b.style.display="inline-block"';
  h += '}';
  h += '}';
  h += 'function applyFilters(){';
  h += 'var mw=parseInt(document.getElementById("minWidth").value)||0;';
  h += 'var mh=parseInt(document.getElementById("minHeight").value)||0;';
  h += 'document.querySelectorAll(".image-card:not(.deleted)").forEach(function(c){';
  h += 'var im=c.querySelector("img");';
  h += 'if(im.naturalWidth>=mw&&im.naturalHeight>=mh)c.classList.remove("hidden");else c.classList.add("hidden"';
  h += ')});updateSelection()}';
  h += 'function resetFilters(){document.getElementById("minWidth").value="";document.getElementById("minHeight").value="";';
  h += 'document.querySelectorAll(".image-card").forEach(function(c){c.classList.remove("hidden")});updateSelection()}';
  h += 'function selectAll(){document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input").forEach(function(cb){';
  h += 'cb.checked=true;cb.closest(".image-card").classList.add("selected")});updateSelection()}';
  h += 'function selectNone(){document.querySelectorAll("input[type=checkbox]").forEach(function(cb){';
  h += 'cb.checked=false;cb.closest(".image-card").classList.remove("selected")});updateSelection()}';
  h += 'function deleteSelected(){';
  h += 'var sel=[];document.querySelectorAll("input[type=checkbox]:checked").forEach(function(cb){';
  h += 'var idx=parseInt(cb.closest(".image-card").dataset.index);sel.push(idx)});';
  h += 'if(sel.length===0){alert("Select images first");return}';
  h += 'if(!confirm("Delete "+sel.length+" images?")){return}';
  h += 'sel.forEach(function(i){deleted.add(i);document.getElementById("c"+i).classList.add("deleted")});updateSelection()}';
  h += 'function updateSelection(){';
  h += 'var cnt=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input:checked").length;';
  h += 'document.getElementById("selectedCount").textContent=cnt+" selected";';
  h += 'document.querySelectorAll(".image-card").forEach(function(c){';
  h += 'if(c.querySelector("input").checked)c.classList.add("selected");else c.classList.remove("selected")'})}';
  h += 'function exportCSV(){';
  h += 'var sel=[];document.querySelectorAll("input:checked").forEach(function(cb){';
  h += 'sel.push(parseInt(cb.closest(".image-card").dataset.index))});';
  h += 'if(sel.length===0){alert("Select images");return}';
  h += 'sel.sort(function(a,b){return a-b});';
  h += 'var rows=["Property,URL,Image Number,Image URL,Tag"];';
  h += 'sel.forEach(function(oi,ni){';
  h += 'var t=tags[oi]||"";';
  h += 'rows.push(\'"\'+propTitle.replace(/"/g,\'""\')+\'","\'+propUrl+\'",'+(ni+1)+\'","\'+imgUrls[oi]+\'","\'+t+\'"\'';
  h += ')});';
  h += 'var csv=rows.join("\\r\\n");';
  h += 'var blob=new Blob([csv],{type:"text/csv"});';
  h += 'var url=URL.createObjectURL(blob);';
  h += 'var a=document.createElement("a");a.href=url;a.download="images.csv";';
  h += 'document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);';
  h += 'alert("CSV exported")}';
  h += 'function downloadSelected(){';
  h += 'var sel=[];document.querySelectorAll("input:checked").forEach(function(cb){';
  h += 'sel.push(parseInt(cb.closest(".image-card").dataset.index))});';
  h += 'if(sel.length===0){alert("Select images");return}';
  h += 'sel.sort(function(a,b){return a-b});';
  h += 'var st=document.getElementById("status");';
  h += 'st.textContent="Starting downloads...";';
  h += 'sel.forEach(function(oi,ni){';
  h += 'setTimeout(function(){';
  h += 'var a=document.createElement("a");';
  h += 'a.href=imgUrls[oi];';
  h += 'a.download="Image_"+(ni+1)+".jpg";';
  h += 'document.body.appendChild(a);a.click();document.body.removeChild(a);';
  h += 'st.textContent="Downloading "+(ni+1)+"/"+sel.length';
  h += '},ni*300)});';
  h += 'setTimeout(function(){st.textContent="Check Downloads folder!"},sel.length*300+500)}';
  h += '</script></body></html>';
  
  return h;
}

})();

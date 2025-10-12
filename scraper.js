(function(){

// ========================================
// SITE HANDLERS
// ========================================

var HANDLERS = {
  
  // ALLSOP SCRAPER
  allsop: {
    name: 'Allsop',
    detect: function(){
      return window.location.hostname.includes('allsop.co.uk');
    },
    extract: function(){
      var u = [];
      document.querySelectorAll('.__image_div[style*="background-image"]').forEach(function(d){
        var s = d.getAttribute('style');
        var m = s.match(/url\("([^"]+)"\)|url\('([^']+)'\)|url\(([^)]+)\)/);
        if(m){
          var url = m[1] || m[2] || m[3];
          if(url.startsWith('api/')) url = window.location.origin + '/' + url;
          else if(url.startsWith('/api/')) url = window.location.origin + url;
          else if(!url.startsWith('http')) url = window.location.origin + '/' + url;
          if(!u.includes(url)) u.push(url);
        }
      });
      return u;
    }
  },
  
  // ZOOPLA SCRAPER
  zoopla: {
    name: 'Zoopla',
    detect: function(){
      return window.location.hostname.includes('zoopla.co.uk');
    },
    extract: function(){
      var u = [];
      document.querySelectorAll('picture.tnabq04 source[type="image/jpeg"]').forEach(function(s){
        var m = s.srcset.match(/https:\/\/[^\s]+2400\/1800\/[^\s]+\.jpg/);
        if(m && !u.includes(m[0])) u.push(m[0]);
      });
      return u;
    }
  },
  
  // EMAIL SCRAPER
  email: {
    name: 'Email (HTML)',
    detect: function(){
      return !!document.querySelector('img[src^="data:image"]') ||
             document.body.innerHTML.includes('cid:') ||
             !!document.querySelector('meta[name="Generator"][content*="Microsoft"]') ||
             document.querySelectorAll('a[href^="mailto:"]').length > 2;
    },
    extract: function(){
      var u = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('data:image/')){
          var m = img.src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
          if(m && m[2].length > 100) u.push(img.src);
        } else if(img.src && img.src.startsWith('http')){
          var w = img.naturalWidth || img.width || 0;
          var h = img.naturalHeight || img.height || 0;
          if(w > 50 && h > 50 && !u.includes(img.src)) u.push(img.src);
        }
      });
      return u.filter(function(url){
        return !url.includes('spacer') && !url.includes('tracking');
      });
    }
  },
  
  // GENERIC SCRAPER (fallback)
  generic: {
    name: 'Generic',
    detect: function(){
      return true;
    },
    extract: function(){
      var u = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && img.naturalWidth > 50 && !u.includes(img.src)){
          u.push(img.src);
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
            if(url.startsWith('http') && !u.includes(url)) u.push(url);
          });
        }
      });
      return u.filter(function(url){
        return !url.includes('logo') && 
               !url.includes('icon') && 
               !url.includes('sprite') && 
               !url.includes('tiny') && 
               !url.includes('small') && 
               !url.match(/\.(svg|gif)$/i);
      });
    }
  }
};

// ========================================
// DETECT SITE AND EXTRACT IMAGES
// ========================================

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
  '<button id="htmlBtn" style="width:100%;padding:15px;margin:10px 0;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Download HTML Viewer</button>' +
  '<button id="csvBtn" style="width:100%;padding:15px;margin:10px 0;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Download CSV</button>' +
  '<button id="copyBtn" style="width:100%;padding:15px;margin:10px 0;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Copy URLs</button>' +
  '<button id="closeBtn" style="width:100%;padding:15px;margin:10px 0;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">Close</button>';

document.body.appendChild(div);

// ========================================
// BUTTON: DOWNLOAD CSV
// ========================================

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

// ========================================
// BUTTON: COPY URLs
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
// BUTTON: CLOSE DIALOG
// ========================================

document.getElementById('closeBtn').onclick = function(){
  document.body.removeChild(div);
};

// ========================================
// BUTTON: DOWNLOAD HTML VIEWER
// ========================================

document.getElementById('htmlBtn').onclick = function(){
  alert('Generating HTML...');
  
  var pt = (document.title || 'Property').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  var pu = window.location.href;
  var hn = (window.location.hostname.replace('www.', '') || 'local');
  
  // Start building HTML
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Images</title>';
  
  // Add CSS styles
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
  
  // Add page header
  h += '<h1>Found ' + urls.length + ' Images</h1>';
  h += '<p>From: ' + hn + ' (' + siteName + ')</p>';
  
  // Add filters section
  h += '<div class="filters"><h3>Filter Images</h3>';
  h += '<div class="filter-row">';
  h += '<label>Min Width: <input type="number" id="minWidth" placeholder="1000"></label>';
  h += '<label>Min Height: <input type="number" id="minHeight" placeholder="800"></label>';
  h += '<button onclick="applyFilters()">Apply</button>';
  h += '<button onclick="resetFilters()">Reset</button>';
  h += '</div></div>';
  
  // Add selection controls
  h += '<div class="selection-controls">';
  h += '<button class="select-all" onclick="selectAll()">Select All</button>';
  h += '<button class="select-none" onclick="selectNone()">Deselect All</button>';
  h += '<button class="delete-selected" onclick="deleteSelected()">Delete Selected</button>';
  h += '<strong id="selectedCount">0 selected</strong>';
  h += '</div>';
  
  // Add action buttons
  h += '<div class="button-group">';
  h += '<button class="download-all-btn" onclick="downloadSelected()">Download Selected</button>';
  h += '<button class="csv-btn" onclick="exportCSV()">Export CSV</button>';
  h += '</div>';
  h += '<div id="status"></div>';
  
  // Add image gallery
  h += '<div class="image-gallery">';
  for(var i = 0; i < urls.length; i++){
    h += '<div class="image-card" id="c' + i + '" data-index="' + i + '">';
    h += '<div class="checkbox-wrapper"><input type="checkbox" id="ch' + i + '" onchange="updateSelection()"></div>';
    h += '<h3>Image ' + (i+1) + '</h3>';
    h += '<div id="tb' + i + '" class="tag-badge" style="display:none"></div>';
    h += '<div class="tag-selector">';
    h += '<select id="ts' + i + '" onchange="tagChange(' + i + ')">';
    h += '<option value="">-- Tag --</option>';
    h += '<option value="Primary Image">Primary Image</option>';
    h += '<option value="Alternate Image 1">Alternate Image 1</option>';
    h += '<option value="Alternate Image 2">Alternate Image 2</option>';
    h += '<option value="ProMap">ProMap</option>';
    h += '</select></div>';
    h += '<img src="' + urls[i] + '" id="im' + i + '">';
    h += '</div>';
  }
  h += '</div>';
  
  // Add JavaScript
  h += '<script>';
  
  // Data variables
  h += 'var imgUrls=' + JSON.stringify(urls) + ';';
  h += 'var propTitle="' + pt + '";';
  h += 'var propUrl="' + pu + '";';
  h += 'var tags={};';
  h += 'var tagMap={};';
  h += 'var deleted=new Set();';
  
  // Tag change function
  h += 'function tagChange(i){';
  h += 'var s=document.getElementById("ts"+i);';
  h += 'var nt=s.value;';
  h += 'var ot=tags[i];';
  h += 'if(ot){delete tagMap[ot];delete tags[i];document.getElementById("tb"+i).style.display="none"}';
  h += 'if(nt){';
  h += 'if(tagMap[nt]!==undefined){var p=tagMap[nt];delete tags[p];document.getElementById("ts"+p).value="";document.getElementById("tb"+p).style.display="none"}';
  h += 'tags[i]=nt;tagMap[nt]=i;';
  h += 'var b=document.getElementById("tb"+i);b.textContent=nt;b.style.display="inline-block"';
  h += '}}';
  
  // Apply filters function
  h += 'function applyFilters(){';
  h += 'var mw=parseInt(document.getElementById("minWidth").value)||0;';
  h += 'var mh=parseInt(document.getElementById("minHeight").value)||0;';
  h += 'document.querySelectorAll(".image-card:not(.deleted)").forEach(function(c){';
  h += 'var im=c.querySelector("img");';
  h += 'if(im.naturalWidth>=mw&&im.naturalHeight>=mh)c.classList.remove("hidden");else c.classList.add("hidden")';
  h += '});updateSelection()}';
  
  // Reset filters function
  h += 'function resetFilters(){';
  h += 'document.getElementById("minWidth").value="";';
  h += 'document.getElementById("minHeight").value="";';
  h += 'document.querySelectorAll(".image-card").forEach(function(c){c.classList.remove("hidden")});';
  h += 'updateSelection()}';
  
  // Select all function
  h += 'function selectAll(){';
  h += 'document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input").forEach(function(cb){';
  h += 'cb.checked=true;cb.closest(".image-card").classList.add("selected")';
  h += '});updateSelection()}';
  
  // Select none function
  h += 'function selectNone(){';
  h += 'document.querySelectorAll("input[type=checkbox]").forEach(function(cb){';
  h += 'cb.checked=false;cb.closest(".image-card").classList.remove("selected")';
  h += '});updateSelection()}';
  
  // Delete selected function
  h += 'function deleteSelected(){';
  h += 'var sel=[];';
  h += 'document.querySelectorAll("input[type=checkbox]:checked").forEach(function(cb){';
  h += 'var idx=parseInt(cb.closest(".image-card").dataset.index);sel.push(idx)';
  h += '});';
  h += 'if(sel.length===0){alert("Select images first");return}';
  h += 'if(!confirm("Delete "+sel.length+" images?")){return}';
  h += 'sel.forEach(function(i){deleted.add(i);document.getElementById("c"+i).classList.add("deleted")});';
  h += 'updateSelection()}';
  
  // Update selection function
  h += 'function updateSelection(){';
  h += 'var cnt=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input:checked").length;';
  h += 'document.getElementById("selectedCount").textContent=cnt+" selected";';
  h += 'document.querySelectorAll(".image-card").forEach(function(c){';
  h += 'if(c.querySelector("input").checked)c.classList.add("selected");else c.classList.remove("selected")';
  h += '})}';
  
  // Export CSV function
  h += 'function exportCSV(){';
  h += 'var sel=[];';
  h += 'document.querySelectorAll("input:checked").forEach(function(cb){';
  h += 'sel.push(parseInt(cb.closest(".image-card").dataset.index))';
  h += '});';
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
  
  // Download selected function
  h += 'function downloadSelected(){';
  h += 'var sel=[];';
  h += 'document.querySelectorAll("input:checked").forEach(function(cb){';
  h += 'sel.push(parseInt(cb.closest(".image-card").dataset.index))';
  h += '});';
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
  
  h += '<\/script></body></html>';
  
  // Download the HTML file
  var blob = new Blob([h], {type: 'text/html'});
  var blobUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'images_' + Date.now() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  alert('HTML viewer downloaded!');
};

})();

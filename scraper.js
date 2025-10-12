(function(){

// ========================================
// SITE HANDLERS - Add new sites here
// ========================================

var HANDLERS = {
  
  // ALLSOP SCRAPER
  allsop: {
    name: 'Allsop',
    detect: function(){ 
      return window.location.hostname.includes('allsop.co.uk'); 
    },
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
  
  // ZOOPLA SCRAPER
  zoopla: {
    name: 'Zoopla',
    detect: function(){ 
      return window.location.hostname.includes('zoopla.co.uk'); 
    },
    extract: function(){
      var urls = [];
      document.querySelectorAll('picture.tnabq04 source[type="image/jpeg"]').forEach(function(source){
        var match = source.srcset.match(/https:\/\/[^\s]+2400\/1800\/[^\s]+\.jpg/);
        if(match && !urls.includes(match[0])) urls.push(match[0]);
      });
      return urls;
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
      var urls = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('data:image/')){
          var match = img.src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
          if(match && match[2].length > 100){
            urls.push(img.src);
          }
        } else if(img.src && img.src.startsWith('http')){
          var w = img.naturalWidth || img.width || 0;
          var h = img.naturalHeight || img.height || 0;
          if(w > 50 && h > 50 && !urls.includes(img.src)) urls.push(img.src);
        }
      });
      return urls.filter(function(url){ 
        return !url.includes('spacer') && !url.includes('tracking'); 
      });
    }
  },
  
  // GENERIC SCRAPER (fallback for all other sites)
  generic: {
    name: 'Generic',
    detect: function(){ 
      return true; 
    },
    extract: function(){
      var urls = [];
      
      // Extract from img tags
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && img.naturalWidth > 50 && !urls.includes(img.src)){
          urls.push(img.src);
        }
      });
      
      // Extract from background-image styles
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
      
      // Filter out unwanted images
      return urls.filter(function(url){
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

// Loop through handlers to find matching site
for(var key in HANDLERS){
  if(key !== 'generic' && HANDLERS[key].detect()){
    detected = key;
    siteName = HANDLERS[key].name;
    break;
  }
}

// Extract images using detected handler
var urls = HANDLERS[detected].extract();

// Check if any images found
if(urls.length === 0){
  alert('No images found!\n\nTip: Try clicking on gallery/images first.');
  return;
}

// ========================================
// CREATE DIALOG BOX
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
// BUTTON: DOWNLOAD ADVANCED HTML VIEWER
// ========================================

document.getElementById('htmlBtn').onclick = function(){
  var propertyTitle = document.title || 'Property';
  var propertyUrl = window.location.href;
  var hostname = window.location.hostname.replace('www.', '') || 'local';
  
  var html = '<!DOCTYPE html>\\n<html>\\n<head>\\n<meta charset="UTF-8">\\n<title>' + hostname + ' Images</title>\\n<style>\\n' +
    '*{margin:0;padding:0;box-sizing:border-box;}\\n' +
    'body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5;}\\n' +
    'h1{color:#333;margin-bottom:10px;}\\n' +
    '.subtitle{color:#666;font-size:14px;margin-bottom:20px;}\\n' +
    '.filters{background:#f8f9fa;padding:20px;margin-bottom:20px;border-radius:4px;border:1px solid #dee2e6;}\\n' +
    '.filters h3{margin-bottom:15px;color:#333;font-size:16px;}\\n' +
    '.filter-row{display:flex;gap:15px;margin-bottom:15px;align-items:center;flex-wrap:wrap;}\\n' +
    '.filter-row label{font-weight:bold;color:#555;min-width:100px;}\\n' +
    '.filter-row input[type="number"]{padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;}\\n' +
    '.filter-row button{padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}\\n' +
    '.filter-row button:hover{background:#0056b3;}\\n' +
    '.filter-row button.reset{background:#6c757d;}\\n' +
    '.filter-row button.reset:hover{background:#545b62;}\\n' +
    '.selection-controls{background:#fff3cd;padding:15px;margin-bottom:20px;border-radius:4px;border:1px solid #ffc107;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}\\n' +
    '.selection-controls button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px;}\\n' +
    '.select-all{background:#28a745;color:white;}\\n' +
    '.select-all:hover{background:#218838;}\\n' +
    '.select-none{background:#dc3545;color:white;}\\n' +
    '.select-none:hover{background:#c82333;}\\n' +
    '.select-large{background:#17a2b8;color:white;}\\n' +
    '.select-large:hover{background:#138496;}\\n' +
    '.delete-selected{background:#fd7e14;color:white;}\\n' +
    '.delete-selected:hover{background:#e8590c;}\\n' +
    '.stats{background:#e7f3ff;padding:15px;margin-bottom:20px;border-radius:4px;display:none;}\\n' +
    '.stats div{margin:5px 0;}\\n' +
    '.button-group{margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;}\\n' +
    '.download-all-btn{padding:12px 24px;background:#28a745;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;font-weight:bold;flex:1;min-width:180px;}\\n' +
    '.download-all-btn:hover{background:#218838;}\\n' +
    '.download-all-btn:disabled{background:#6c757d;cursor:not-allowed;}\\n' +
    '.csv-btn{padding:12px 24px;background:#17a2b8;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;font-weight:bold;flex:1;min-width:180px;}\\n' +
    '.csv-btn:hover{background:#138496;}\\n' +
    '.csv-btn:disabled{background:#6c757d;cursor:not-allowed;}\\n' +
    '#status{width:100%;margin-top:10px;color:#666;font-weight:bold;}\\n' +
    '.image-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}\\n' +
    '.image-card{background:white;padding:15px;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:all 0.3s;position:relative;}\\n' +
    '.image-card.hidden{display:none;}\\n' +
    '.image-card.deleted{display:none;}\\n' +
    '.image-card.selected{border:3px solid #28a745;box-shadow:0 4px 8px rgba(40,167,69,0.3);}\\n' +
    '.image-card.error{opacity:0.5;}\\n' +
    '.image-card h3{margin-bottom:10px;color:#333;font-size:16px;}\\n' +
    '.image-card .dimensions{color:#666;font-size:13px;margin-bottom:10px;font-weight:bold;}\\n' +
    '.image-card .checkbox-wrapper{position:absolute;top:10px;right:10px;}\\n' +
    '.image-card input[type="checkbox"]{width:24px;height:24px;cursor:pointer;}\\n' +
    '.image-card .tag-selector{margin:10px 0;padding:8px;background:#f8f9fa;border-radius:4px;}\\n' +
    '.image-card .tag-selector select{width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;}\\n' +
    '.image-card .tag-badge{display:inline-block;padding:4px 8px;background:#6f42c1;color:white;border-radius:3px;font-size:11px;font-weight:bold;margin-bottom:8px;}\\n' +
    '.image-card img{width:100%;height:auto;border:1px solid #ddd;cursor:pointer;}\\n' +
    '.image-card a{display:inline-block;margin-top:10px;padding:8px 16px;background:#007bff;color:white;text-decoration:none;border-radius:4px;font-size:14px;}\\n' +
    '.image-card a:hover{background:#0056b3;}\\n' +
    '</style>\\n</head>\\n<body>\\n' +
    '<h1>Found ' + urls.length + ' Images</h1>\\n' +
    '<div class="subtitle">From: ' + hostname + ' (' + siteName + ' scraper)</div>\\n' +
    '<div class="stats" id="stats"><strong>📐 Image Statistics:</strong><div id="statsContent"></div></div>\\n' +
    '<div class="filters">\\n<h3>🔍 Filter Images</h3>\\n' +
    '<div class="filter-row">\\n' +
    '<label>Min Width:</label><input type="number" id="minWidth" placeholder="e.g., 1000" style="width:120px;">\\n' +
    '<label style="margin-left:20px;">Min Height:</label><input type="number" id="minHeight" placeholder="e.g., 800" style="width:120px;">\\n' +
    '<label style="margin-left:20px;">Min MP:</label><input type="number" id="minMP" placeholder="e.g., 2" step="0.1" style="width:120px;">\\n' +
    '<button onclick="applyFilters()" style="margin-left:10px;">Apply Filters</button>\\n' +
    '<button class="reset" onclick="resetFilters()" style="margin-left:5px;">Reset</button>\\n' +
    '</div>\\n<div id="filterStatus" style="margin-top:10px;color:#666;font-size:14px;"></div>\\n</div>\\n' +
    '<div class="selection-controls">\\n' +
    '<button class="select-all" onclick="selectAll()">✓ Select All Visible</button>\\n' +
    '<button class="select-none" onclick="selectNone()">✗ Deselect All</button>\\n' +
    '<button class="select-large" onclick="selectLarge()">Select Large (>2MP)</button>\\n' +
    '<button class="delete-selected" onclick="deleteSelected()">🗑️ Delete Selected</button>\\n' +
    '<span style="flex:1;"></span>\\n' +
    '<strong style="align-self:center;color:#856404;" id="selectedCount">0 selected</strong>\\n' +
    '</div>\\n' +
    '<div class="button-group">\\n' +
    '<button class="download-all-btn" onclick="downloadSelected()">⬇️ Download Selected</button>\\n' +
    '<button class="csv-btn" onclick="exportCSV()">📊 Export Selected to CSV</button>\\n' +
    '<div id="status"></div>\\n' +
    '</div>\\n' +
    '<div class="image-gallery" id="gallery">\\n';
  
  // Add image cards with tag selector
  urls.forEach(function(url, i){
    html += '<div class="image-card" id="card' + i + '" data-index="' + i + '" data-original-index="' + i + '">\\n' +
      '<div class="checkbox-wrapper"><input type="checkbox" id="check' + i + '" onchange="updateSelection()"></div>\\n' +
      '<h3>Image ' + (i+1) + '</h3>\\n' +
      '<div id="tagBadge' + i + '" class="tag-badge" style="display:none;"></div>\\n' +
      '<div class="dimensions" id="dim' + i + '">📐 Loading...</div>\\n' +
      '<div class="tag-selector">\\n' +
      '<select id="tagSelect' + i + '" onchange="handleTagChange(' + i + ')">\\n' +
      '<option value="">-- Assign Tag --</option>\\n' +
      '<option value="Primary Image">Primary Image</option>\\n' +
      '<option value="Alternate Image 1">Alternate Image 1</option>\\n' +
      '<option value="Alternate Image 2">Alternate Image 2</option>\\n' +
      '<option value="ProMap">ProMap</option>\\n' +
      '</select>\\n' +
      '</div>\\n' +
      '<img src="' + url + '" alt="Image ' + (i+1) + '" id="img' + i + '" onclick="window.open(\'' + url.replace(/'/g, "\\'") + '\',\'_blank\')" onerror="this.onerror=null;this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3EError%3C/text%3E%3C/svg%3E\';">\\n' +
      '<a href="' + url + '" target="_blank">Open Full Size →</a>\\n' +
      '</div>\\n';
  });
  
  html += '</div>\\n<script>\\n' +
    'const imageUrls=' + JSON.stringify(urls) + ';\\n' +
    'const propertyTitle="' + propertyTitle.replace(/"/g, '\\\\"').replace(/\n/g, ' ') + '";\\n' +
    'const propertyUrl="' + propertyUrl + '";\\n' +
    'const imageDimensions=[];\\n' +
    'const imageTags={};\\n' +
    'const tagToImageIndex={};\\n' +
    'let allLoaded=false;\\n' +
    'let loadedCount=0;\\n' +
    'let errorCount=0;\\n' +
    'let deletedIndices=new Set();\\n' +
    'function handleTagChange(imageIndex){\\n' +
    'const select=document.getElementById("tagSelect"+imageIndex);\\n' +
    'const newTag=select.value;\\n' +
    'const oldTag=imageTags[imageIndex];\\n' +
    'if(oldTag){\\n' +
    'delete tagToImageIndex[oldTag];\\n' +
    'delete imageTags[imageIndex];\\n' +
    'document.getElementById("tagBadge"+imageIndex).style.display="none";\\n' +
    '}\\n' +
    'if(newTag){\\n' +
    'if(tagToImageIndex[newTag]!==undefined){\\n' +
    'const prevIndex=tagToImageIndex[newTag];\\n' +
    'delete imageTags[prevIndex];\\n' +
    'document.getElementById("tagSelect"+prevIndex).value="";\\n' +
    'document.getElementById("tagBadge"+prevIndex).style.display="none";\\n' +
    '}\\n' +
    'imageTags[imageIndex]=newTag;\\n' +
    'tagToImageIndex[newTag]=imageIndex;\\n' +
    'const badge=document.getElementById("tagBadge"+imageIndex);\\n' +
    'badge.textContent=newTag;\\n' +
    'badge.style.display="inline-block";\\n' +
    '}\\n' +
    '}\\n' +
    'window.onload=function(){\\n' +
    'const imgs=document.querySelectorAll(".image-gallery img");\\n' +
    'const widths=[];\\n' +
    'const heights=[];\\n' +
    'imgs.forEach((img,i)=>{\\n' +
    'const updateDimensions=function(){\\n' +
    'const w=img.naturalWidth;\\n' +
    'const h=img.naturalHeight;\\n' +
    'if(w>0&&h>0){\\n' +
    'const mp=(w*h/1000000).toFixed(1);\\n' +
    'imageDimensions[i]={width:w,height:h,megapixels:parseFloat(mp)};\\n' +
    'widths.push(w);\\n' +
    'heights.push(h);\\n' +
    'document.getElementById("dim"+i).textContent="📐 "+w+" × "+h+" px ("+mp+" MP)";\\n' +
    'document.getElementById("card"+i).setAttribute("data-width",w);\\n' +
    'document.getElementById("card"+i).setAttribute("data-height",h);\\n' +
    'document.getElementById("card"+i).setAttribute("data-mp",mp);\\n' +
    '}else{\\n' +
    'document.getElementById("dim"+i).textContent="📐 Invalid image";\\n' +
    'document.getElementById("card"+i).classList.add("error");\\n' +
    'imageDimensions[i]={width:0,height:0,megapixels:0};\\n' +
    'document.getElementById("card"+i).setAttribute("data-width","0");\\n' +
    'document.getElementById("card"+i).setAttribute("data-height","0");\\n' +
    'document.getElementById("card"+i).setAttribute("data-mp","0");\\n' +
    '}\\n' +
    'loadedCount++;\\n' +
    'if(loadedCount===imgs.length){\\n' +
    'allLoaded=true;\\n' +
    'if(widths.length>0){\\n' +
    'const avgW=Math.round(widths.reduce((a,b)=>a+b,0)/widths.length);\\n' +
    'const avgH=Math.round(heights.reduce((a,b)=>a+b,0)/heights.length);\\n' +
    'const maxW=Math.max(...widths);\\n' +
    'const maxH=Math.max(...heights);\\n' +
    'document.getElementById("stats").style.display="block";\\n' +
    'document.getElementById("statsContent").innerHTML="<div>Valid Images: "+(imgs.length-errorCount)+"</div><div>Average: "+avgW+" × "+avgH+" px</div><div>Largest: "+maxW+" × "+maxH+" px</div>";\\n' +
    '}\\n' +
    '}\\n' +
    '};\\n' +
    'img.onload=updateDimensions;\\n' +
    'img.onerror=function(){\\n' +
    'document.getElementById("dim"+i).textContent="📐 Failed to load";\\n' +
    'document.getElementById("card"+i).classList.add("error");\\n' +
    'imageDimensions[i]={width:0,height:0,megapixels:0};\\n' +
    'document.getElementById("card"+i).setAttribute("data-width","0");\\n' +
    'document.getElementById("card"+i).setAttribute("data-height","0");\\n' +
    'document.getElementById("card"+i).setAttribute("data-mp","0");\\n' +
    'errorCount++;\\n' +
    'loadedCount++;\\n' +
    '};\\n' +
    'if(img.complete){updateDimensions();}\\n' +
    '});\\n' +
    '};\\n' +
    'function applyFilters(){\\n' +
    'if(!allLoaded){alert("Please wait for all images to load first!");return;}\\n' +
    'const minW=parseInt(document.getElementById("minWidth").value)||0;\\n' +
    'const minH=parseInt(document.getElementById("minHeight").value)||0;\\n' +
    'const minMP=parseFloat(document.getElementById("minMP").value)||0;\\n' +
    'let hiddenCount=0;\\n' +
    'document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{\\n' +
    'const w=parseInt(card.getAttribute("data-width"))||0;\\n' +
    'const h=parseInt(card.getAttribute("data-height"))||0;\\n' +
    'const mp=parseFloat(card.getAttribute("data-mp"))||0;\\n' +
    'if(w>=minW&&h>=minH&&mp>=minMP){card.classList.remove("hidden");}else{card.classList.add("hidden");hiddenCount++;}\\n' +
    '});\\n' +
    'const totalVisible=imageUrls.length-deletedIndices.size;\\n' +
    'const visibleCount=totalVisible-hiddenCount;\\n' +
    'document.getElementById("filterStatus").textContent="Showing "+visibleCount+" of "+totalVisible+" images ("+errorCount+" failed, "+deletedIndices.size+" deleted)";\\n' +
    'updateSelection();\\n' +
    '}\\n' +
    'function resetFilters(){\\n' +
    'document.getElementById("minWidth").value="";\\n' +
    'document.getElementById("minHeight").value="";\\n' +
    'document.getElementById("minMP").value="";\\n' +
    'document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{card.classList.remove("hidden");});\\n' +
    'document.getElementById("filterStatus").textContent="";\\n' +
    'updateSelection();\\n' +
    '}\\n' +
    'function selectAll(){\\n' +
    'document.querySelectorAll(".image-card:not(.hidden):not(.error):not(.deleted) input[type=\\"checkbox\\"]").forEach(cb=>{\\n' +
    'cb.checked=true;cb.parentElement.parentElement.classList.add("selected");\\n' +
    '});\\n' +
    'updateSelection();\\n' +
    '}\\n' +
    'function selectNone(){\\n' +
    'document.querySelectorAll("input[type=\\"checkbox\\"]").forEach(cb=>{cb.checked=false;cb.parentElement.parentElement.classList.remove("selected");});\\n' +
    'updateSelection();\\n' +
    '}\\n' +
    'function selectLarge(){\\n' +
    'document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{\\n' +
    'const mp=parseFloat(card.getAttribute("data-mp"))||0;\\n' +
    'const checkbox=card.querySelector("input[type=\\"checkbox\\"]");\\n' +
    'if(mp>2&&!card.classList.contains("hidden")&&!card.classList.contains("error")){\\n' +
    'checkbox.checked=true;card.classList.add("selected");\\n' +
    '}else{checkbox.checked=false;card.classList.remove("selected");}\\n' +
    '});\\n' +
    'updateSelection();\\n' +
    '}\\n' +
    'function deleteSelected(){\\n' +
    'const selected=getSelectedIndices();\\n' +
    'if(selected.length===0){alert("Please select at least one image to delete!");return;}\\n' +
    'if(!confirm("Delete "+selected.length+" selected images? This cannot be undone in this session.")){return;}\\n' +
    'selected.forEach(idx=>{\\n' +
    'deletedIndices.add(idx);\\n' +
    'const card=document.getElementById("card"+idx);\\n' +
    'if(card){card.classList.add("deleted");card.querySelector("input[type=\\"checkbox\\"]").checked=false;}\\n' +
    '});\\n' +
    'updateSelection();\\n' +
    'document.getElementById("filterStatus").textContent=deletedIndices.size+" images deleted";\\n' +
    '}\\n' +
    'function updateSelection(){\\n' +
    'const checkboxes=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input[type=\\"checkbox\\"]");\\n' +
    'const selectedCount=Array.from(checkboxes).filter(cb=>cb.checked).length;\\n' +
    'document.getElementById("selectedCount").textContent=selectedCount+" selected";\\n' +
    'document.querySelectorAll(".image-card").forEach(card=>{\\n' +
    'const checkbox=card.querySelector("input[type=\\"checkbox\\"]");\\n' +
    'if(checkbox.checked){card.classList.add("selected");}else{card.classList.remove("selected");}\\n' +
    '});\\n' +
    '}\\n' +
    'function getSelectedIndices(){\\n' +
    'const selected=[];\\n' +
    'document.querySelectorAll("input[type=\\"checkbox\\"]:checked").forEach(cb=>{\\n' +
    'const card=cb.closest(".image-card");\\n' +
    'const index=parseInt(card.getAttribute("data-original-index"));\\n' +
    'selected.push(index);\\n' +
    '});\\n' +
    'return selected.sort((a,b)=>a-b);\\n' +
    '}\\n' +
    'function exportCSV(){\\n' +
    'const selected=getSelectedIndices();\\n' +
    'if(selected.length===0){alert("Please select at least one image!");return;}\\n' +
    'const btn=document.querySelector(".csv-btn");\\n' +
    'btn.disabled=true;btn.textContent="Exporting...";\\n' +
    'const csvRows=[];\\n' +
    'csvRows.push("Property,URL,Image Number,Image URL,Width (px),Height (px),Megapixels,Tag");\\n' +
    'selected.forEach((origIdx,newIdx)=>{\\n' +
    'const dim=imageDimensions[origIdx]||{width:0,height:0,megapixels:0};\\n' +
    'const tag=imageTags[origIdx]||"";\\n' +
    'const row="\\""+propertyTitle.replace(/"/g,\'""\')+\'\\",\\"\'+propertyUrl+\'\\",'+(newIdx+1)+\',\\"\'+imageUrls[origIdx]+\'\\",'+ dim.width+\',\'+dim.height+\',\'+dim.megapixels+\',\\"\'+tag+\'\\"\';\n' +
    'csvRows.push(row);\\n' +
    '});\\n' +
    'const csv=csvRows.join("\\\\n");\\n' +
    'const blob=new Blob([csv],{type:"text/csv"});\\n' +
    'const url=URL.createObjectURL(blob);\\n' +
    'const a=document.createElement("a");\\n' +
    'a.href=url;a.download="selected_images_"+Date.now()+".csv";\\n' +
    'document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);\\n' +
    'btn.textContent="✓ CSV Exported!";setTimeout(()=>{btn.textContent="📊 Export Selected to CSV";btn.disabled=false;},2000);\\n' +
    '}\\n' +
    'async function downloadSelected(){\\n' +
    'const selected=getSelectedIndices();\\n' +
    'if(selected.length===0){alert("Please select at least one image!");return;}\\n' +
    'const btn=document.querySelector(".download-all-btn");\\n' +
    'const status=document.getElementById("status");\\n' +
    'btn.disabled=true;btn.textContent="Downloading...";\\n' +
    'status.textContent="Starting...";\\n' +
    'for(let i=0;i<selected.length;i++){\\n' +
    'const origIdx=selected[i];\\n' +
    'const newIdx=i+1;\\n' +
    'try{\\n' +
    'status.textContent="Downloading "+newIdx+"/"+selected.length+"...";\\n' +
    'const response=await fetch(imageUrls[origIdx],{mode:"cors"});\\n' +
    'const blob=await response.blob();\\n' +
    'const url=URL.createObjectURL(blob);\\n' +
    'const a=document.createElement("a");\\n' +
    'a.href=url;a.download="Image_"+newIdx+".jpg";\\n' +
    'document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);\\n' +
    'await new Promise(resolve=>setTimeout(resolve,500));\\n' +
    '}catch(error){\\n' +
    'console.error("Download error:",error);\\n' +
    'status.textContent="Error on image "+newIdx+", continuing...";\\n' +
    'await new Promise(resolve=>setTimeout(resolve,1000));\\n' +
    '}\\n' +
    '}\\n' +
    'status.textContent="✅ Done! Downloaded "+selected.length+" images.";\\n' +
    'btn.textContent="⬇️ Download Selected";btn.disabled=false;\\n' +
    '}\\n' +
    '</script>\\n</body>\\n</html>';
  
  // Download the HTML file
  var blob = new Blob([html], {type: 'text/html'});
  var blobUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'images_' + Date.now() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  
  alert('Advanced HTML viewer downloaded!\\n\\nFeatures:\\n✅ Filter & select images\\n✅ Tag images (Primary, Alternate 1/2, ProMap)\\n✅ Delete unwanted images\\n✅ Download with incremental naming\\n✅ Export to CSV with tags');
};

// ========================================
// BUTTON: DOWNLOAD CSV (Simple version)
// ========================================

document.getElementById('csvBtn').onclick = function(){
  var csv = 'Property,URL,Image Number,Image URL\\r\\n';
  
  urls.forEach(function(url, i){
    csv += '"' + document.title.replace(/"/g, '""') + '","' + window.location.href + '",' + (i+1) + ',"' + url + '"\\r\\n';
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
// BUTTON: COPY URLs TO CLIPBOARD
// ========================================

document.getElementById('copyBtn').onclick = function(){
  var textarea = document.createElement('textarea');
  textarea.value = urls.join('\\n');
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

})();

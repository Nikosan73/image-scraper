(function(){

// VERSION
var VERSION = 'v2.1.0';

// SITE HANDLERS
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
             !!document.querySelector('meta[name="Generator"][content*="Microsoft"]');
    },
    extract: function(){
      var urls = [];
      document.querySelectorAll('img').forEach(function(img){
        var src = img.src;
        if(src.startsWith('data:image')) urls.push(src);
        else if(src.startsWith('http')) urls.push(src);
      });
      return urls;
    }
  },
  generic: {
    name: 'Generic',
    detect: function(){ return true; },
    extract: function(){
      var urls = [];
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && !urls.includes(img.src)) urls.push(img.src);
        if(img.dataset.src && img.dataset.src.startsWith('http') && !urls.includes(img.dataset.src)) urls.push(img.dataset.src);
        if(img.srcset){
          var srcsetUrls = img.srcset.split(',').map(function(s){ return s.trim().split(' ')[0]; });
          srcsetUrls.forEach(function(u){ if(u.startsWith('http') && !urls.includes(u)) urls.push(u); });
        }
      });
      document.querySelectorAll('source[srcset]').forEach(function(source){
        var srcsetUrls = source.srcset.split(',').map(function(s){ return s.trim().split(' ')[0]; });
        srcsetUrls.forEach(function(u){ if(u.startsWith('http') && !urls.includes(u)) urls.push(u); });
      });
      return urls;
    }
  }
};

// DETECT SITE
var handler = null;
for(var key in HANDLERS){
  if(HANDLERS[key].detect()){
    handler = HANDLERS[key];
    break;
  }
}

var siteName = handler.name;
var imageUrls = handler.extract();

// EXTRACT PDFs
var pdfs = [];
document.querySelectorAll('a[href]').forEach(function(link){
  var href = link.href;
  if(href.toLowerCase().includes('.pdf')){
    pdfs.push({
      url: href,
      text: link.textContent.trim() || link.title || 'PDF Document'
    });
  }
});

// SHOW POPUP
var popup = document.createElement('div');
popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:3px solid #333;padding:30px;z-index:999999;box-shadow:0 10px 40px rgba(0,0,0,0.5);font-family:Arial,sans-serif;border-radius:10px;min-width:400px;';
popup.innerHTML = '<h2 style="margin:0 0 15px 0;color:#333;">Image Scraper '+VERSION+'</h2>' +
  '<p style="margin:10px 0;font-size:16px;"><strong>Site:</strong> '+siteName+'</p>' +
  '<p style="margin:10px 0;font-size:16px;"><strong>Images found:</strong> '+imageUrls.length+'</p>' +
  '<p style="margin:10px 0;font-size:16px;"><strong>PDFs found:</strong> '+pdfs.length+'</p>' +
  '<button id="generateBtn" style="width:100%;padding:15px;margin:15px 0 10px 0;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:bold;">📄 Generate HTML Viewer</button>' +
  '<button id="closeBtn" style="width:100%;padding:15px;background:#dc3545;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:bold;">❌ Close</button>';
document.body.appendChild(popup);

document.getElementById('closeBtn').onclick = function(){
  document.body.removeChild(popup);
};

document.getElementById('generateBtn').onclick = function(){
  var btn = this;
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  var propertyTitle = document.title || 'Property';
  var propertyUrl = window.location.href;
  
  var imageData = [];
  var loadedCount = 0;
  
  function checkComplete(){
    loadedCount++;
    if(loadedCount === imageUrls.length){
      generateHTML();
    }
  }
  
  imageUrls.forEach(function(url, i){
    var img = new Image();
    img.onload = function(){
      var mp = ((this.width * this.height) / 1000000).toFixed(2);
      imageData[i] = {url: url, width: this.width, height: this.height, mp: parseFloat(mp)};
      checkComplete();
    };
    img.onerror = function(){
      imageData[i] = {url: url, width: 0, height: 0, mp: 0};
      checkComplete();
    };
    img.src = url;
  });
  
  function generateHTML(){
    var output = '';
    
    // TAG NAME MAPPING - Maps short codes to full names for CSV export
    output += 'var TAG_NAMES={"Primary Image":"Primary Image","Alternate Image 1":"Alternate Image 1","Alternate Image 2":"Alternate Image 2","ProMap":"ProMap","Brochure":"Brochure"};';
    
    output += '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Image & PDF Manager</title>';
    output += '<style>';
    output += '*{margin:0;padding:0;box-sizing:border-box}';
    output += 'body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5}';
    output += '.header{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output += '.header h1{color:#333;margin-bottom:10px}';
    output += '.header p{color:#666;margin:5px 0}';
    output += '.pdf-section{background:#e3f2fd;padding:15px;margin-bottom:20px;border-radius:8px;border:2px solid #2196f3}';
    output += '.pdf-section h3{color:#1976d2;margin-bottom:10px}';
    output += '.pdf-item{margin:8px 0;padding:8px;background:white;border-radius:4px}';
    output += '.pdf-item input{margin-right:8px}';
    output += '.pdf-item label{cursor:pointer}';
    output += '.pdf-item select{margin-left:10px;padding:4px;border-radius:4px}';
    output += '.filters{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output += '.filter-group{display:inline-block;margin-right:15px;margin-bottom:10px}';
    output += '.filter-group label{display:block;margin-bottom:5px;font-weight:bold;color:#555}';
    output += '.filter-group input{padding:8px;border:1px solid #ddd;border-radius:4px;width:100px}';
    output += '.btn-primary{background:#007bff;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:14px;margin-right:10px}';
    output += '.btn-secondary{background:#6c757d;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:14px;margin-right:10px}';
    output += '.btn-danger{background:#dc3545;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:14px;margin-right:10px}';
    output += '.btn-primary:hover{background:#0056b3}';
    output += '.btn-secondary:hover{background:#545b62}';
    output += '.btn-danger:hover{background:#c82333}';
    output += '.controls{background:white;padding:15px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output += '.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}';
    output += '.card{background:white;border-radius:8px;padding:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);position:relative}';
    output += '.card.deleted{display:none}';
    output += '.card input[type=checkbox]{position:absolute;top:10px;left:10px;width:20px;height:20px;cursor:pointer;z-index:10}';
    output += '.card img{width:100%;height:200px;object-fit:cover;border-radius:4px;margin-bottom:10px}';
    output += '.card-info{font-size:14px;color:#666;margin-bottom:8px}';
    output += '.tag-select{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-top:5px;font-size:14px}';
    output += '</style></head><body>';
    
    output += '<div class="header"><h1>Image & PDF Manager</h1>';
    output += '<p><strong>Property:</strong> '+propertyTitle.replace(/</g,'&lt;')+'</p>';
    output += '<p><strong>Source:</strong> '+siteName+'</p>';
    output += '<p><strong>Images:</strong> <span id="imgCount">'+imageData.length+'</span></p>';
    output += '<p><strong>PDFs:</strong> '+pdfs.length+'</p></div>';
    
    // PDF SECTION
    if(pdfs.length > 0){
      output += '<div class="pdf-section"><h3>📄 PDF Documents</h3>';
      for(var p=0; p<pdfs.length; p++){
        var pdfText = pdfs[p].text.replace(/</g,'&lt;').replace(/"/g,'&quot;');
        var pdfUrl = pdfs[p].url.replace(/"/g,'&quot;');
        output += '<div class="pdf-item">';
        output += '<input type="checkbox" id="pdf'+p+'" data-url="'+pdfUrl+'">';
        output += '<label for="pdf'+p+'">'+pdfText+'</label>';
        output += '<select class="pdf-tag-select" data-pdfid="'+p+'" onchange="pdfTagChanged('+p+',this.value)">';
        output += '<option value="">No Tag</option>';
        output += '<option value="Brochure">Brochure</option>';
        output += '</select>';
        output += '</div>';
      }
      output += '</div>';
    }
    
    output += '<div class="filters"><h3>Filters</h3>';
    output += '<div class="filter-group"><label>Min MP:</label><input type="number" step="0.1" id="minMP" value="0" onchange="applyFilters()"></div>';
    output += '<div class="filter-group"><label>Max MP:</label><input type="number" step="0.1" id="maxMP" value="999" onchange="applyFilters()"></div>';
    output += '<button class="btn-secondary" onclick="resetFilters()">Reset Filters</button></div>';
    
    output += '<div class="controls">';
    output += '<button class="btn-secondary" onclick="selectAll()">✓ Select All Images</button>';
    output += '<button class="btn-secondary" onclick="deselectAll()">✗ Deselect All</button>';
    output += '<button class="btn-danger" onclick="deleteSelected()">🗑 Delete Selected</button>';
    output += '<button class="btn-primary" onclick="exportCSV()">📊 Export CSV</button>';
    output += '<span id="selCount" style="margin-left:15px;font-weight:bold;color:#333">0 selected</span></div>';
    
    output += '<div class="gallery" id="gallery">';
    
    var propTitle = propertyTitle.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
    var propUrl = propertyUrl.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    
    for(var i=0; i<imageData.length; i++){
      var item = imageData[i];
      output += '<div class="card" id="card'+i+'" data-mp="'+item.mp+'" data-idx="'+i+'">';
      output += '<input type="checkbox" onchange="updateCount()">';
      output += '<img src="'+item.url+'" loading="lazy">';
      output += '<div class="card-info"><strong>'+item.mp+' MP</strong> ('+item.width+'x'+item.height+')</div>';
      output += '<select class="tag-select" onchange="tagChanged('+i+',this.value)">';
      output += '<option value="">No Tag</option>';
      output += '<option value="Primary Image">Primary Image</option>';
      output += '<option value="Alternate Image 1">Alternate Image 1</option>';
      output += '<option value="Alternate Image 2">Alternate Image 2</option>';
      output += '<option value="ProMap">ProMap</option>';
      output += '</select></div>';
    }
    
    output += '</div>';
    
    // JAVASCRIPT
    output += '<script>';
    output += 'var imageData='+JSON.stringify(imageData)+';';
    output += 'var propTitle="'+propTitle+'";';
    output += 'var propUrl="'+propUrl+'";';
    output += 'var tags={};';
    output += 'var pdfTags={};';
    
    output += 'function applyFilters(){';
    output += 'var minMP=parseFloat(document.getElementById("minMP").value)||0;';
    output += 'var maxMP=parseFloat(document.getElementById("maxMP").value)||999;';
    output += 'var cards=document.querySelectorAll(".card");';
    output += 'var count=0;';
    output += 'cards.forEach(function(card){';
    output += 'var mp=parseFloat(card.dataset.mp);';
    output += 'if(mp>=minMP&&mp<=maxMP){card.style.display="block";count++;}';
    output += 'else{card.style.display="none";}';
    output += '});';
    output += 'document.getElementById("imgCount").textContent=count;';
    output += '}';
    
    output += 'function resetFilters(){';
    output += 'document.getElementById("minMP").value=0;';
    output += 'document.getElementById("maxMP").value=999;';
    output += 'applyFilters();';
    output += '}';
    
    output += 'function selectAll(){';
    output += 'document.querySelectorAll(".card").forEach(function(card){';
    output += 'if(card.style.display!=="none"){card.querySelector("input").checked=true;}';
    output += '});';
    output += 'updateCount();';
    output += '}';
    
    output += 'function deselectAll(){';
    output += 'document.querySelectorAll(".card input").forEach(function(cb){cb.checked=false;});';
    output += 'updateCount();';
    output += '}';
    
    output += 'function deleteSelected(){';
    output += 'if(!confirm("Delete selected images?"))return;';
    output += 'document.querySelectorAll(".card input:checked").forEach(function(cb){';
    output += 'cb.closest(".card").classList.add("deleted");';
    output += '});';
    output += 'updateCount();';
    output += '}';
    
    output += 'function updateCount(){';
    output += 'var count=document.querySelectorAll(".card:not(.deleted) input:checked").length;';
    output += 'document.getElementById("selCount").textContent=count+" selected";';
    output += '}';
    
    output += 'function tagChanged(idx,value){';
    output += 'if(value==="Primary Image"||value==="Alternate Image 1"||value==="Alternate Image 2"||value==="ProMap"){';
    output += 'for(var i in tags){if(tags[i]===value&&i!=idx)tags[i]="";}';
    output += 'document.querySelectorAll(".tag-select").forEach(function(sel,i){';
    output += 'if(i!=idx&&sel.value===value)sel.value="";';
    output += '});';
    output += '}';
    output += 'tags[idx]=value;';
    output += '}';
    
    output += 'function pdfTagChanged(pdfId,value){';
    output += 'if(value==="Brochure"){';
    output += 'for(var i in pdfTags){if(pdfTags[i]==="Brochure"&&i!=pdfId)pdfTags[i]="";}';
    output += 'document.querySelectorAll(".pdf-tag-select").forEach(function(sel){';
    output += 'var id=sel.dataset.pdfid;';
    output += 'if(id!=pdfId&&sel.value==="Brochure")sel.value="";';
    output += '});';
    output += '}';
    output += 'pdfTags[pdfId]=value;';
    output += '}';
    
    output += 'function exportCSV(){';
    output += 'var selected=[];';
    output += 'document.querySelectorAll(".card:not(.deleted) input:checked").forEach(function(cb){';
    output += 'selected.push(parseInt(cb.closest(".card").dataset.idx));';
    output += '});';
    output += 'var selectedPDFs=[];';
    output += 'document.querySelectorAll("[id^=pdf]:checked").forEach(function(cb){';
    output += 'var pdfId=cb.id.replace("pdf","");';
    output += 'selectedPDFs.push({url:cb.dataset.url,tag:pdfTags[pdfId]||""});';
    output += '});';
    output += 'if(selected.length==0&&selectedPDFs.length==0){alert("Please select images or PDFs");return;}';
    output += 'selected.sort(function(a,b){return a-b;});';
    output += 'var csv="Property,URL,Type,Number,Resource URL,Megapixels,Tag\\n";';
    output += 'selected.forEach(function(idx,num){';
    output += 'var img=imageData[idx];';
    output += 'var tag=tags[idx]||"";';
    output += 'csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",Image,"+(num+1)+",\\""+img.url+"\\","+img.mp+",\\""+tag+"\\"\\n";';
    output += '});';
    output += 'selectedPDFs.forEach(function(pdf,num){';
    output += 'csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",PDF,"+(num+1)+",\\""+pdf.url+"\\",\\"\\",'+ '"\\""+pdf.tag+"\\"\\n";';
    output += '});';
    output += 'var blob=new Blob([csv],{type:"text/csv"});';
    output += 'var link=document.createElement("a");';
    output += 'link.href=URL.createObjectURL(blob);';
    output += 'link.download="images_pdfs_"+Date.now()+".csv";';
    output += 'link.click();';
    output += '}';
    
    output += '<\/script></body></html>';
    
    var blob = new Blob([output], {type: 'text/html'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'property_images_'+Date.now()+'.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('HTML file downloaded! Open it to manage images and PDFs.');
    document.body.removeChild(popup);
  }
};

})();

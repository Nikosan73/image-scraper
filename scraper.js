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
      return!!document.querySelector('img[src^="data:image"]')||
        document.body.innerHTML.includes('cid:')||
        !!document.querySelector('meta[name="Generator"][content*="Microsoft"]')||
        !!document.querySelector('meta[name="ProgId"][content*="Word"]');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img').forEach(function(img){
        var src=img.src;
        if(src&&(src.startsWith('data:image')||src.includes('cid:'))){
          if(!u.includes(src))u.push(src);
        }
      });
      return u;
    }
  },
  generic:{
    name:'Generic',
    detect:function(){return true},
    extract:function(){
      var u=[];
      var seen={};
      document.querySelectorAll('img').forEach(function(img){
        var src=img.src;
        var srcset=img.srcset;
        if(srcset){
          var matches=srcset.match(/https?:\/\/[^\s]+/g);
          if(matches){
            var urls=[];
            matches.forEach(function(url){
              var widthMatch=srcset.match(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+(\\d+)w'));
              if(widthMatch){
                urls.push({url:url,width:parseInt(widthMatch[1])});
              }else{
                urls.push({url:url,width:0});
              }
            });
            urls.sort(function(a,b){return b.width-a.width});
            if(urls[0]&&!seen[urls[0].url]){
              u.push(urls[0].url);
              seen[urls[0].url]=true;
            }
          }
        }else if(src&&src.startsWith('http')&&!seen[src]){
          u.push(src);
          seen[src]=true;
        }
      });
      document.querySelectorAll('[style*="background-image"]').forEach(function(el){
        var style=el.getAttribute('style');
        var m=style.match(/url\(['"]?([^'"()]+)['"]?\)/);
        if(m&&m[1].startsWith('http')&&!seen[m[1]]){
          u.push(m[1]);
          seen[m[1]]=true;
        }
      });
      return u;
    }
  }
};

function extractPDFs(){
  var pdfs=[];
  var seen={};
  
  document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"], a[href*=".pdf#"]').forEach(function(a){
    var href=a.href;
    if(href&&!seen[href]){
      var text=a.textContent.trim()||a.title||'PDF Document';
      pdfs.push({url:href,name:text});
      seen[href]=true;
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

if(!handler){
  alert('No handler found for this site');
  return;
}

var urls=handler.extract();
var pdfs=extractPDFs();

if(urls.length===0&&pdfs.length===0){
  alert('No images or PDFs found on this page.\n\nScraper: '+handler.name+'\nVersion: '+VERSION);
  return;
}

var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border:2px solid #333;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:999999;font-family:Arial,sans-serif;max-width:500px';

var info='<div style="text-align:center">';
info+='<h2 style="margin:0 0 15px 0;color:#333">Images & PDFs Found</h2>';
info+='<p style="margin:10px 0;font-size:16px;color:#666"><strong>Images:</strong> '+urls.length+'</p>';
info+='<p style="margin:10px 0;font-size:16px;color:#666"><strong>PDFs:</strong> '+pdfs.length+'</p>';
info+='<p style="margin:10px 0;font-size:14px;color:#999">Scraper: '+handler.name+'</p>';
info+='<p style="margin:10px 0;font-size:12px;color:#999">Version: '+VERSION+'</p>';
info+='<div style="margin-top:20px">';
info+='<button id="downloadBtn" style="background:#4CAF50;color:white;border:none;padding:12px 24px;font-size:16px;border-radius:5px;cursor:pointer;margin:5px">Generate HTML</button>';
info+='<button id="closeBtn" style="background:#f44336;color:white;border:none;padding:12px 24px;font-size:16px;border-radius:5px;cursor:pointer;margin:5px">Close</button>';
info+='</div></div>';

div.innerHTML=info;
document.body.appendChild(div);

document.getElementById('downloadBtn').onclick=function(){
  this.disabled=true;
  this.textContent='Processing...';
  
  var imageData=[];
  var processed=0;
  
  function processNext(){
    if(processed>=urls.length){
      generateHTML();
      return;
    }
    
    var img=new Image();
    var url=urls[processed];
    
    img.onload=function(){
      var mp=(this.naturalWidth*this.naturalHeight/1000000).toFixed(2);
      imageData.push({
        url:url,
        width:this.naturalWidth,
        height:this.naturalHeight,
        mp:parseFloat(mp)
      });
      processed++;
      document.getElementById('downloadBtn').textContent='Processing '+processed+'/'+urls.length+'...';
      processNext();
    };
    
    img.onerror=function(){
      imageData.push({
        url:url,
        width:0,
        height:0,
        mp:0
      });
      processed++;
      document.getElementById('downloadBtn').textContent='Processing '+processed+'/'+urls.length+'...';
      processNext();
    };
    
    img.src=url;
  }
  
  function generateHTML(){
    var propTitle=document.title.replace(/[<>]/g,'');
    var propUrl=window.location.href;
    
    var output='<!DOCTYPE html><html><head><meta charset="UTF-8">';
    output+='<title>Images & PDFs - '+propTitle+'</title>';
    output+='<style>';
    output+='*{box-sizing:border-box}';
    output+='body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}';
    output+='.header{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.header h1{margin:0 0 10px 0;color:#333}';
    output+='.header p{margin:5px 0;color:#666}';
    output+='.pdf-section{background:#e3f2fd;padding:20px;margin-bottom:20px;border-radius:8px;border-left:4px solid #2196F3}';
    output+='.pdf-section h2{margin:0 0 15px 0;color:#1976D2}';
    output+='.pdf-item{padding:10px;margin:10px 0;background:white;border-radius:4px;display:flex;align-items:center;gap:10px}';
    output+='.pdf-item input{width:18px;height:18px;cursor:pointer}';
    output+='.pdf-item a{color:#2196F3;text-decoration:none;flex:1}';
    output+='.pdf-item a:hover{text-decoration:underline}';
    output+='.pdf-tag-select{padding:5px;border:1px solid #ddd;border-radius:3px;background:white}';
    output+='.filters{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.filters h2{margin:0 0 15px 0;color:#333}';
    output+='.filter-group{margin:10px 0}';
    output+='.filter-group label{display:inline-block;width:100px;font-weight:bold}';
    output+='.filter-group input{padding:5px;border:1px solid #ddd;border-radius:3px;width:100px}';
    output+='.filter-group button{margin-left:10px;padding:8px 16px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer}';
    output+='.filter-group button:hover{background:#45a049}';
    output+='.controls{background:white;padding:15px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:flex;gap:10px;flex-wrap:wrap}';
    output+='.controls button{padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-size:14px}';
    output+='.btn-select{background:#2196F3;color:white}';
    output+='.btn-deselect{background:#FF9800;color:white}';
    output+='.btn-delete{background:#f44336;color:white}';
    output+='.btn-export{background:#4CAF50;color:white}';
    output+='.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}';
    output+='.card{background:white;border:2px solid #ddd;border-radius:8px;overflow:hidden;transition:all 0.3s}';
    output+='.card:hover{transform:translateY(-5px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}';
    output+='.card.selected{border-color:#4CAF50;box-shadow:0 0 10px rgba(76,175,80,0.5)}';
    output+='.card.deleted{display:none}';
    output+='.card.error{opacity:0.5;background:#f5f5f5}';
    output+='.img-wrapper{position:relative;padding-top:75%;background:#f9f9f9;overflow:hidden}';
    output+='.img-wrapper img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain}';
    output+='.card-info{padding:12px}';
    output+='.card-info div{margin:5px 0;font-size:12px;color:#666}';
    output+='.checkbox-container{text-align:center;padding:10px;border-top:1px solid #eee}';
    output+='.checkbox-container input{width:20px;height:20px;cursor:pointer}';
    output+='.tag-container{padding:10px;border-top:1px solid #eee}';
    output+='.tag-select{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;cursor:pointer}';
    output+='.download-btn{display:block;width:100%;padding:10px;background:#2196F3;color:white;text-align:center;text-decoration:none;border:none;cursor:pointer;font-size:14px}';
    output+='.download-btn:hover{background:#1976D2}';
    output+='</style></head><body>';
    
    output+='<div class="header">';
    output+='<h1>'+propTitle+'</h1>';
    output+='<p><strong>URL:</strong> <a href="'+propUrl+'" target="_blank">'+propUrl+'</a></p>';
    output+='<p><strong>Images Found:</strong> '+imageData.length+'</p>';
    output+='<p><strong>PDFs Found:</strong> '+pdfs.length+'</p>';
    output+='</div>';
    
    if(pdfs.length>0){
      output+='<div class="pdf-section">';
      output+='<h2>📄 PDF Documents</h2>';
      pdfs.forEach(function(pdf,i){
        output+='<div class="pdf-item">';
        output+='<input type="checkbox" id="pdf'+i+'" checked>';
        output+='<a href="'+pdf.url+'" target="_blank">'+pdf.name+'</a>';
        output+='<select class="pdf-tag-select" data-pdfid="'+i+'" onchange="pdfTagChanged('+i+',this.value)">';
        output+='<option value="">No Tag</option>';
        output+='<option value="Marketing Brochure">Marketing Brochure</option>';
        output+='</select>';
        output+='</div>';
      });
      output+='</div>';
    }
    
    output+='<div class="filters">';
    output+='<h2>Filters</h2>';
    output+='<div class="filter-group">';
    output+='<label>Min MP:</label><input type="number" id="minMP" value="0.8" step="0.1">';
    output+='<label style="margin-left:20px">Max MP:</label><input type="number" id="maxMP" value="50" step="0.1">';
    output+='<button onclick="applyFilters()">Apply Filters</button>';
    output+='</div>';
    output+='</div>';
    
    output+='<div class="controls">';
    output+='<button class="btn-select" onclick="selectAll()">✓ Select All</button>';
    output+='<button class="btn-deselect" onclick="deselectAll()">✗ Deselect All</button>';
    output+='<button class="btn-delete" onclick="deleteSelected()">🗑 Delete Selected</button>';
    output+='<button class="btn-export" onclick="exportCSV()">📊 Export CSV</button>';
    output+='</div>';
    
    output+='<div class="gallery" id="gallery">';
    imageData.forEach(function(img,idx){
      var errorClass=img.width===0?' error':'';
      output+='<div class="card'+errorClass+'" data-idx="'+idx+'" data-mp="'+img.mp+'">';
      output+='<div class="img-wrapper">';
      if(img.width>0){
        output+='<img src="'+img.url+'" alt="Image '+(idx+1)+'">';
      }else{
        output+='<div style="padding:20px;text-align:center;color:#999">Failed to load</div>';
      }
      output+='</div>';
      output+='<div class="card-info">';
      output+='<div><strong>Image #'+(idx+1)+'</strong></div>';
      if(img.width>0){
        output+='<div>'+img.width+' × '+img.height+' px</div>';
        output+='<div>'+img.mp+' MP</div>';
      }
      output+='</div>';
      output+='<div class="tag-container">';
      output+='<select class="tag-select" data-idx="'+idx+'" onchange="tagChanged('+idx+',this.value)">';
      output+='<option value="">No Tag</option>';
      output+='<option value="Primary Image">Primary Image</option>';
      output+='<option value="Alternate Image 1">Alternate Image 1</option>';
      output+='<option value="Alternate Image 2">Alternate Image 2</option>';
      output+='<option value="ProMap">ProMap</option>';
      output+='</select>';
      output+='</div>';
      output+='<div class="checkbox-container">';
      output+='<input type="checkbox" data-idx="'+idx+'">';
      output+='</div>';
      output+='<a href="'+img.url+'" download="Image_'+(idx+1)+'.jpg" class="download-btn">⬇ Download</a>';
      output+='</div>';
    });
    output+='</div>';
    
    output+='<script>';
    output+='var imageData='+JSON.stringify(imageData)+';';
    output+='var tags={};';
    output+='var pdfTags={};';
    output+='var propTitle="'+propTitle.replace(/"/g,'\\"')+'";';
    output+='var propUrl="'+propUrl+'";';
    
    output+='function applyFilters(){';
    output+='var minMP=parseFloat(document.getElementById("minMP").value)||0;';
    output+='var maxMP=parseFloat(document.getElementById("maxMP").value)||999;';
    output+='document.querySelectorAll(".card").forEach(function(card){';
    output+='var mp=parseFloat(card.dataset.mp);';
    output+='if(mp>=minMP&&mp<=maxMP){';
    output+='card.style.display="block";';
    output+='}else{';
    output+='card.style.display="none";';
    output+='card.querySelector("input[type=checkbox]").checked=false;';
    output+='}';
    output+='});';
    output+='}';
    
    output+='function selectAll(){';
    output+='document.querySelectorAll(".card:not(.deleted)").forEach(function(card){';
    output+='if(card.style.display!=="none"){';
    output+='card.querySelector("input[type=checkbox]").checked=true;';
    output+='card.classList.add("selected");';
    output+='}';
    output+='});';
    output+='}';
    
    output+='function deselectAll(){';
    output+='document.querySelectorAll(".card input[type=checkbox]").forEach(function(cb){';
    output+='cb.checked=false;';
    output+='cb.closest(".card").classList.remove("selected");';
    output+='});';
    output+='}';
    
    output+='function deleteSelected(){';
    output+='var count=0;';
    output+='document.querySelectorAll(".card input[type=checkbox]:checked").forEach(function(cb){';
    output+='cb.closest(".card").classList.add("deleted");';
    output+='count++;';
    output+='});';
    output+='alert("Deleted "+count+" image(s)");';
    output+='}';
    
    output+='function tagChanged(idx,value){';
    output+='if(value){';
    output+='for(var i in tags){';
    output+='if(tags[i]===value&&i!=idx){';
    output+='tags[i]="";';
    output+='document.querySelector(".tag-select[data-idx=\\""+i+"\\"]").value="";';
    output+='}';
    output+='}';
    output+='}';
    output+='tags[idx]=value;';
    output+='}';
    
    output+='function pdfTagChanged(pdfId,value){';
    output+='if(value==="Marketing Brochure"){';
    output+='for(var i in pdfTags){if(pdfTags[i]==="Marketing Brochure"&&i!=pdfId)pdfTags[i]="";}';
    output+='document.querySelectorAll(".pdf-tag-select").forEach(function(sel){';
    output+='var id=sel.dataset.pdfid;';
    output+='if(id!=pdfId&&sel.value==="Marketing Brochure")sel.value="";';
    output+='});';
    output+='}';
    output+='pdfTags[pdfId]=value;';
    output+='}';
    
    output+='document.querySelectorAll(".card input[type=checkbox]").forEach(function(cb){';
    output+='cb.addEventListener("change",function(){';
    output+='if(this.checked){';
    output+='this.closest(".card").classList.add("selected");';
    output+='}else{';
    output+='this.closest(".card").classList.remove("selected");';
    output+='}';
    output+='});';
    output+='});';
    
    output+='function exportCSV(){';
    output+='var selectedImages=[];';
    output+='document.querySelectorAll(".card:not(.deleted) input[type=checkbox]:checked").forEach(function(cb){';
    output+='selectedImages.push(parseInt(cb.dataset.idx));';
    output+='});';
    output+='var selectedPDFs=[];';
    output+='document.querySelectorAll(".pdf-item input:checked").forEach(function(cb){';
    output+='var idx=parseInt(cb.id.replace("pdf",""));';
    output+='var url=cb.nextElementSibling.href;';
    output+='var name=cb.nextElementSibling.textContent;';
    output+='var tag=pdfTags[idx]||"";';
    output+='selectedPDFs.push({url:url,name:name,tag:tag});';
    output+='});';
    output+='if(selectedImages.length===0&&selectedPDFs.length===0){alert("Please select at least one image or PDF");return;}';
    output+='selectedImages.sort(function(a,b){return a-b;});';
    output+='var csv="Property,URL,Type,Image Number,Image URL,Megapixels,Tag\\n";';
    output+='selectedImages.forEach(function(idx,num){';
    output+='var img=imageData[idx];';
    output+='var tag=tags[idx]||"";';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",Image,"+(num+1)+",\\""+img.url+"\\","+img.mp+",\\""+tag+"\\"\\n";';
    output+='});';
    output+='selectedPDFs.forEach(function(pdf,num){';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",PDF,"+(num+1)+",\\""+pdf.url+"\\",N/A,\\""+pdf.tag+"\\"\\n";';
    output+='});';
    output+='var blob=new Blob([csv],{type:"text/csv"});';
    output+='var link=document.createElement("a");';
    output+='link.href=URL.createObjectURL(blob);';
    output+='link.download="images_pdfs_"+Date.now()+".csv";';
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
    
    alert('HTML file downloaded!\n\nOpen it to view, filter, tag, and export images & PDFs.');
    document.body.removeChild(div);
  }
  
  processNext();
};

document.getElementById('closeBtn').onclick=function(){
  document.body.removeChild(div);
};

})();

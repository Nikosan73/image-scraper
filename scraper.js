(function(){

// VERSION
var VERSION = 'v2.2.0';

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
      return window.location.hostname.includes('estatesgazette.com')||
             window.location.hostname.includes('propertylink');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[srcset]').forEach(function(img){
        var srcset=img.getAttribute('srcset');
        if(!srcset)return;
        var parts=srcset.split(',').map(function(p){return p.trim()});
        var maxWidth=0;
        var maxUrl='';
        parts.forEach(function(part){
          var match=part.match(/^(\S+)\s+(\d+)w$/);
          if(match){
            var url=match[1];
            var width=parseInt(match[2]);
            if(width>maxWidth){
              maxWidth=width;
              maxUrl=url;
            }
          }
        });
        if(maxUrl&&!u.includes(maxUrl))u.push(maxUrl);
      });
      return u;
    }
  },
  knightfrank:{
    name:'Knight Frank',
    detect:function(){
      return window.location.hostname.includes('knightfrank.co') && 
             !window.location.hostname.includes('emails.knightfrank');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[data-src]').forEach(function(img){
        var dataSrc=img.dataset.src;
        if(dataSrc&&dataSrc.includes('content.knightfrank.com')){
          if(!u.includes(dataSrc))u.push(dataSrc);
        }
      });
      return u;
    }
  },
  loopnet:{
    name:'LoopNet',
    detect:function(){return window.location.hostname.includes('loopnet.co')},
    extract:function(){
      var u=[];
      document.querySelectorAll('img').forEach(function(img){
        var srcset=img.getAttribute('srcset');
        if(srcset){
          var parts=srcset.split(',').map(function(p){return p.trim()});
          var maxRes='';
          var maxUrl='';
          parts.forEach(function(part){
            var match=part.match(/^(\S+)\s+(\d+)x$/);
            if(match){
              var url=match[1];
              var res=parseInt(match[2]);
              if(!maxRes||res>maxRes){
                maxRes=res;
                maxUrl=url;
              }
            }else{
              var widthMatch=part.match(/^(\S+)\s+(\d+)w$/);
              if(widthMatch){
                var url=widthMatch[1];
                var width=parseInt(widthMatch[2]);
                if(!maxRes||width>maxRes){
                  maxRes=width;
                  maxUrl=url;
                }
              }
            }
          });
          if(maxUrl&&!u.includes(maxUrl))u.push(maxUrl);
        }else{
          var src=img.src;
          if(src&&src.includes('images.loopnet.co')&&!u.includes(src)){
            u.push(src);
          }
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
        !!document.querySelector('meta[name="Generator"][content*="Microsoft"]');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img[src]').forEach(function(img){
        var src=img.src;
        if(src.startsWith('data:image')||src.includes('cid:'))return;
        if(src.endsWith('.gif')&&src.includes('/s.gif'))return;
        if(img.width===1&&img.height===1)return;
        if(!u.includes(src))u.push(src);
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
      document.querySelectorAll('img[src], img[data-src], source[srcset]').forEach(function(el){
        if(el.tagName==='IMG'){
          var src=el.src||el.dataset.src;
          if(!src)return;
          if(src.startsWith('data:'))return;
          if(src.endsWith('.gif')&&src.includes('/s.gif'))return;
          if(el.width===1&&el.height===1)return;
          if(!seen[src]){
            seen[src]=true;
            u.push(src);
          }
        }else if(el.tagName==='SOURCE'){
          var srcset=el.getAttribute('srcset');
          if(!srcset)return;
          var parts=srcset.split(',').map(function(p){return p.trim()});
          var maxWidth=0;
          var maxUrl='';
          parts.forEach(function(part){
            var match=part.match(/^(\S+)\s+(\d+)w$/);
            if(match){
              var url=match[1];
              var width=parseInt(match[2]);
              if(width>maxWidth){
                maxWidth=width;
                maxUrl=url;
              }
            }else{
              var simpleMatch=part.match(/^(\S+)/);
              if(simpleMatch&&!maxUrl){
                maxUrl=simpleMatch[1];
              }
            }
          });
          if(maxUrl&&!seen[maxUrl]){
            seen[maxUrl]=true;
            u.push(maxUrl);
          }
        }
      });
      return u;
    }
  }
};

function getPDFs(){
  var pdfs=[];
  
  // Standard PDF links
  document.querySelectorAll('a[href$=".pdf"], embed[src$=".pdf"], object[data$=".pdf"], iframe[src$=".pdf"]').forEach(function(el){
    var url=el.href||el.src||el.data;
    if(url&&!pdfs.some(function(p){return p.url===url})){
      var name=el.textContent.trim()||el.title||'PDF Document';
      pdfs.push({url:url,name:name});
    }
  });
  
  // Fallback: Search for "brochure" links if no PDFs found
  if(pdfs.length===0){
    document.querySelectorAll('a[href]').forEach(function(link){
      var text=link.textContent.trim().toLowerCase();
      var title=(link.title||'').toLowerCase();
      if(text.includes('brochure')||title.includes('brochure')){
        var url=link.href;
        if(url&&!pdfs.some(function(p){return p.url===url})){
          var name=link.textContent.trim()||link.title||'Brochure';
          pdfs.push({url:url,name:name});
        }
      }
    });
  }
  
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
  alert('No handler detected!');
  return;
}

var imageUrls=handler.extract();
var pdfList=getPDFs();

var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border:2px solid #333;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:999999;font-family:Arial,sans-serif;min-width:350px;border-radius:8px';

div.innerHTML='<div style="margin-bottom:20px;text-align:center"><h2 style="margin:0 0 15px 0;color:#333;font-size:24px">Property Scraper</h2><p style="margin:5px 0;color:#666;font-size:14px"><strong>Version:</strong> '+VERSION+'</p><p style="margin:5px 0;color:#666;font-size:14px"><strong>Scraper:</strong> '+handler.name+'</p><p style="margin:10px 0;color:#333;font-size:16px"><strong>'+imageUrls.length+'</strong> images found</p><p style="margin:5px 0;color:#333;font-size:16px"><strong>'+pdfList.length+'</strong> PDFs found</p></div><div style="display:flex;gap:10px;justify-content:center"><button id="downloadBtn" style="padding:12px 24px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold">Download Manager</button><button id="closeBtn" style="padding:12px 24px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold">Close</button></div>';

document.body.appendChild(div);

document.getElementById('downloadBtn').onclick=function(){
  if(imageUrls.length===0&&pdfList.length===0){
    alert('No images or PDFs found to process!');
    return;
  }
  
  alert('Processing images...\n\nThis may take a moment for large images.');
  
  var imageData=[];
  var processedCount=0;
  var loadTimeout=5000; // 5 second timeout per image
  
  var processNext=function(){
    if(processedCount<imageUrls.length){
      var url=imageUrls[processedCount];
      var img=new Image();
      var timeoutId;
      var completed=false;
      
      // Don't use crossOrigin for same-origin images
      var urlObj;
      try{
        urlObj=new URL(url);
        if(urlObj.origin!==window.location.origin){
          img.crossOrigin='anonymous';
        }
      }catch(e){
        // Invalid URL, skip crossOrigin
      }
      
      var completeLoad=function(width,height){
        if(completed)return;
        completed=true;
        clearTimeout(timeoutId);
        var mp=(width*height/1000000).toFixed(2);
        imageData.push({url:url,width:width,height:height,mp:parseFloat(mp)});
        processedCount++;
        processNext();
      };
      
      img.onload=function(){
        completeLoad(img.naturalWidth||img.width,img.naturalHeight||img.height);
      };
      
      img.onerror=function(){
        // Try without CORS if it failed
        if(img.crossOrigin){
          img.crossOrigin=null;
          img.src=url+'?'+Date.now();
        }else{
          completeLoad(0,0);
        }
      };
      
      // Timeout fallback
      timeoutId=setTimeout(function(){
        if(!completed){
          completeLoad(0,0);
        }
      },loadTimeout);
      
      img.src=url;
    }else{
      generateHTML();
    }
  };
  
  function generateHTML(){
    var propTitle=document.title||'Property';
    var propUrl=window.location.href;
    
    var output='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Property Images & PDFs</title><style>';
    output+='body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}';
    output+='.header{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.header h1{margin:0 0 10px 0;color:#333}';
    output+='.header p{margin:5px 0;color:#666}';
    output+='.controls{background:white;padding:15px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:15px}';
    output+='.filter-group{display:flex;flex-direction:column}';
    output+='.filter-group label{font-size:12px;color:#666;margin-bottom:3px}';
    output+='.filter-group input{padding:5px;border:1px solid #ddd;border-radius:4px}';
    output+='.buttons{display:flex;gap:10px;flex-wrap:wrap}';
    output+='.buttons button{padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px}';
    output+='.btn-primary{background:#4CAF50;color:white}';
    output+='.btn-secondary{background:#2196F3;color:white}';
    output+='.btn-danger{background:#f44336;color:white}';
    output+='.btn-primary:hover{background:#45a049}';
    output+='.btn-secondary:hover{background:#0b7dda}';
    output+='.btn-danger:hover{background:#da190b}';
    output+='.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}';
    output+='.image-card{background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.2s}';
    output+='.image-card:hover{transform:translateY(-5px);box-shadow:0 4px 12px rgba(0,0,0,0.2)}';
    output+='.image-card img{width:100%;height:200px;object-fit:cover;display:block}';
    output+='.image-info{padding:15px}';
    output+='.image-info p{margin:5px 0;font-size:13px;color:#666}';
    output+='.image-actions{display:flex;gap:5px;margin-top:10px}';
    output+='.image-actions select,.image-actions a{flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;text-decoration:none;text-align:center;background:white;color:#333}';
    output+='.image-actions a{background:#4CAF50;color:white;border:none}';
    output+='.image-actions a:hover{background:#45a049}';
    output+='.checkbox-container{display:flex;align-items:center;gap:8px;margin-bottom:10px}';
    output+='.checkbox-container input[type="checkbox"]{width:18px;height:18px;cursor:pointer}';
    output+='.checkbox-container label{font-size:14px;color:#333;cursor:pointer}';
    output+='.pdf-section{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.pdf-section h2{margin:0 0 15px 0;color:#333;font-size:20px}';
    output+='.pdf-list{display:flex;flex-direction:column;gap:10px}';
    output+='.pdf-item{display:flex;align-items:center;gap:10px;padding:10px;background:#f9f9f9;border-radius:4px}';
    output+='.pdf-item input[type="checkbox"]{width:18px;height:18px;cursor:pointer}';
    output+='.pdf-item a{flex:1;color:#2196F3;text-decoration:none;font-size:14px}';
    output+='.pdf-item a:hover{text-decoration:underline}';
    output+='.pdf-item select{padding:5px;border:1px solid #ddd;border-radius:4px;font-size:12px;min-width:150px}';
    output+='</style></head><body>';
    
    output+='<div class="header">';
    output+='<h1>'+propTitle+'</h1>';
    output+='<p><strong>URL:</strong> <a href="'+propUrl+'" target="_blank">'+propUrl+'</a></p>';
    output+='<p><strong>Images:</strong> '+imageData.length+' | <strong>PDFs:</strong> '+pdfList.length+'</p>';
    output+='<p><strong>Scraper:</strong> '+handler.name+' | <strong>Version:</strong> '+VERSION+'</p>';
    output+='</div>';
    
    if(pdfList.length>0){
      output+='<div class="pdf-section">';
      output+='<h2>📄 PDF Documents</h2>';
      output+='<div class="pdf-list">';
      pdfList.forEach(function(pdf,idx){
        output+='<div class="pdf-item">';
        output+='<input type="checkbox" class="pdf-checkbox" data-index="'+idx+'">';
        output+='<a href="'+pdf.url+'" target="_blank">'+pdf.name+'</a>';
        output+='<select class="pdf-tag" data-index="'+idx+'">';
        output+='<option value="">No Tag</option>';
        output+='<option value="Marketing Brochure">Marketing Brochure</option>';
        output+='<option value="Floor Plan">Floor Plan</option>';
        output+='<option value="Legal Pack">Legal Pack</option>';
        output+='<option value="Title Deeds">Title Deeds</option>';
        output+='<option value="EPC">EPC</option>';
        output+='</select>';
        output+='</div>';
      });
      output+='</div>';
      output+='</div>';
    }
    
    output+='<div class="controls">';
    output+='<div class="filters">';
    output+='<div class="filter-group"><label>Min MP:</label><input type="number" id="minMP" step="0.1" placeholder="e.g. 0.8"></div>';
    output+='<div class="filter-group"><label>Max MP:</label><input type="number" id="maxMP" step="0.1" placeholder="e.g. 5.0"></div>';
    output+='</div>';
    output+='<div class="buttons">';
    output+='<button class="btn-primary" onclick="applyFilters()">Apply Filters</button>';
    output+='<button class="btn-secondary" onclick="selectAll()">Select All</button>';
    output+='<button class="btn-secondary" onclick="deselectAll()">Deselect All</button>';
    output+='<button class="btn-danger" onclick="deleteSelected()">Delete Selected</button>';
    output+='<button class="btn-primary" onclick="exportCSV()">Export CSV</button>';
    output+='</div>';
    output+='</div>';
    
    output+='<div class="gallery" id="gallery">';
    imageData.forEach(function(img,idx){
      output+='<div class="image-card" data-index="'+idx+'" data-mp="'+img.mp+'">';
      output+='<img src="'+img.url+'" alt="Image '+(idx+1)+'">';
      output+='<div class="image-info">';
      output+='<div class="checkbox-container">';
      output+='<input type="checkbox" id="cb'+idx+'" class="image-checkbox">';
      output+='<label for="cb'+idx+'">Select</label>';
      output+='</div>';
      output+='<p><strong>Image '+(idx+1)+'</strong></p>';
      output+='<p>'+img.width+' × '+img.height+' px</p>';
      output+='<p>'+img.mp+' MP</p>';
      output+='<div class="image-actions">';
      output+='<select class="image-tag" data-index="'+idx+'">';
      output+='<option value="">No Tag</option>';
      output+='<option value="Primary Image">Primary Image</option>';
      output+='<option value="Alternate Image 1">Alternate Image 1</option>';
      output+='<option value="Alternate Image 2">Alternate Image 2</option>';
      output+='<option value="ProMap">ProMap</option>';
      output+='</select>';
      output+='<a href="'+img.url+'" download="Image_'+(idx+1)+'.jpg">Download</a>';
      output+='</div>';
      output+='</div>';
      output+='</div>';
    });
    output+='</div>';
    
    output+='<script>';
    output+='var imageData='+JSON.stringify(imageData)+';';
    output+='var pdfList='+JSON.stringify(pdfList)+';';
    output+='var propTitle="'+propTitle.replace(/"/g,'\\"')+'";';
    output+='var propUrl="'+propUrl.replace(/"/g,'\\"')+'";';
    
    output+='var tags={};';
    output+='var pdfTags={};';
    
    output+='document.querySelectorAll(".image-tag").forEach(function(sel){';
    output+='sel.addEventListener("change",function(){';
    output+='var idx=parseInt(this.dataset.index);';
    output+='var val=this.value;';
    output+='if(val==="Primary Image"||val==="Alternate Image 1"||val==="Alternate Image 2"||val==="ProMap"){';
    output+='document.querySelectorAll(".image-tag").forEach(function(other){';
    output+='if(other!==sel&&other.value===val)other.value="";';
    output+='});';
    output+='}';
    output+='tags[idx]=val;';
    output+='});';
    output+='});';
    
    output+='document.querySelectorAll(".pdf-tag").forEach(function(sel){';
    output+='sel.addEventListener("change",function(){';
    output+='var idx=parseInt(this.dataset.index);';
    output+='var val=this.value;';
    output+='if(val==="Marketing Brochure"){';
    output+='document.querySelectorAll(".pdf-tag").forEach(function(other){';
    output+='if(other!==sel&&other.value==="Marketing Brochure")other.value="";';
    output+='});';
    output+='}';
    output+='pdfTags[idx]=val;';
    output+='});';
    output+='});';
    
    output+='function applyFilters(){';
    output+='var minMP=parseFloat(document.getElementById("minMP").value)||0;';
    output+='var maxMP=parseFloat(document.getElementById("maxMP").value)||Infinity;';
    output+='document.querySelectorAll(".image-card").forEach(function(card){';
    output+='var mp=parseFloat(card.dataset.mp);';
    output+='if(mp>=minMP&&mp<=maxMP){';
    output+='card.style.display="block";';
    output+='}else{';
    output+='card.style.display="none";';
    output+='}';
    output+='});';
    output+='}';
    
    output+='function selectAll(){';
    output+='document.querySelectorAll(".image-card").forEach(function(card){';
    output+='if(card.style.display!=="none"){';
    output+='card.querySelector(".image-checkbox").checked=true;';
    output+='}';
    output+='});';
    output+='}';
    
    output+='function deselectAll(){';
    output+='document.querySelectorAll(".image-checkbox").forEach(function(cb){cb.checked=false;});';
    output+='}';
    
    output+='function deleteSelected(){';
    output+='if(!confirm("Delete selected images?"))return;';
    output+='document.querySelectorAll(".image-checkbox:checked").forEach(function(cb){';
    output+='cb.closest(".image-card").remove();';
    output+='});';
    output+='}';
    
    output+='function exportCSV(){';
    output+='var selectedImages=[];';
    output+='document.querySelectorAll(".image-checkbox:checked").forEach(function(cb){';
    output+='var card=cb.closest(".image-card");';
    output+='selectedImages.push(parseInt(card.dataset.index));';
    output+='});';
    output+='var selectedPDFs=[];';
    output+='document.querySelectorAll(".pdf-checkbox:checked").forEach(function(cb){';
    output+='var idx=parseInt(cb.dataset.index);';
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

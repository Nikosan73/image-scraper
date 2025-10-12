(function(){

// VERSION
var VERSION = '2.0.1';

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
        if(srcset && srcset.includes('propertylinkassets')){
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
  email:{
    name:'Email (HTML)',
    detect:function(){
      return!!document.querySelector('img[src^="data:image"]')||
        document.body.innerHTML.includes('cid:')||
        !!document.querySelector('meta[name="Generator"][content*="Microsoft"]')||
        !!document.querySelector('meta[name="Generator"][content*="Outlook"]');
    },
    extract:function(){
      var u=[];
      document.querySelectorAll('img').forEach(function(img){
        var src=img.src||'';
        if(src.startsWith('data:image')){
          u.push(src);
        }else if(src.startsWith('http')){
          u.push(src);
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
      
      document.querySelectorAll('img[srcset]').forEach(function(img){
        var srcset=img.srcset;
        if(srcset){
          var matches=srcset.match(/https:\/\/[^\s]+\s+(\d+)w/g);
          if(matches){
            var maxWidth=0;
            var maxUrl='';
            matches.forEach(function(match){
              var parts=match.match(/(https:\/\/[^\s]+)\s+(\d+)w/);
              if(parts){
                var url=parts[1];
                var width=parseInt(parts[2]);
                if(width>maxWidth && !url.match(/tiny|small|thumb/i)){
                  maxWidth=width;
                  maxUrl=url;
                }
              }
            });
            if(maxUrl && !seen[maxUrl]){
              seen[maxUrl]=true;
              u.push(maxUrl);
            }
          }
        }
      });
      
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && img.naturalWidth>200 && !seen[img.src]){
          if(!img.src.match(/logo|icon|sprite|avatar|thumb/i)){
            seen[img.src]=true;
            u.push(img.src);
          }
        }
      });
      
      document.querySelectorAll('picture source').forEach(function(src){
        var srcset=src.srcset||'';
        var matches=srcset.match(/https:\/\/[^\s,]+/g);
        if(matches){
          matches.forEach(function(url){
            if(!seen[url]){
              seen[url]=true;
              u.push(url);
            }
          });
        }
      });
      
      document.querySelectorAll('[style*="background-image"]').forEach(function(el){
        var style=el.getAttribute('style')||'';
        var matches=style.match(/url\(['""]?([^'"")]+)['""]?\)/g);
        if(matches){
          matches.forEach(function(match){
            var url=match.replace(/url\(['""]?/,'').replace(/['"")]/g,'').trim();
            if(url.startsWith('/')){
              url=window.location.origin+url;
            }else if(!url.startsWith('http')){
              url=window.location.origin+'/'+url;
            }
            if(!seen[url] && !url.match(/logo|icon|sprite/i)){
              seen[url]=true;
              u.push(url);
            }
          });
        }
      });
      
      return u;
    }
  }
};

function extractPDFs(){
  var pdfs=[];
  var seen={};
  
  document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"]').forEach(function(a){
    var href=a.href;
    if(!seen[href]){
      seen[href]=true;
      pdfs.push({
        url: href,
        text: a.textContent.trim() || 'PDF Document'
      });
    }
  });
  
  document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"]').forEach(function(el){
    var src=el.src || el.data;
    if(src && !seen[src]){
      seen[src]=true;
      pdfs.push({
        url: src,
        text: 'Embedded PDF'
      });
    }
  });
  
  document.querySelectorAll('iframe[src*=".pdf"]').forEach(function(iframe){
    var src=iframe.src;
    if(src && !seen[src]){
      seen[src]=true;
      pdfs.push({
        url: src,
        text: 'PDF (iframe)'
      });
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

var urls=handler.extract();
urls=urls.filter(function(url){return !url.match(/\.pdf(\?|#|$)/i);});
var pdfs=extractPDFs();
var siteName=handler.name;
var propertyTitle=document.title||'Property';
var propertyUrl=window.location.href;

if(urls.length===0){
  alert('No images found on this page!');
  return;
}

var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:3px solid #333;padding:20px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:Arial,sans-serif;min-width:400px;max-width:500px;';
div.innerHTML='<h2 style="margin:0 0 15px 0;color:#333;">Image Scraper</h2>'+
  '<p style="margin:5px 0;"><strong>Site:</strong> '+siteName+'</p>'+
  '<p style="margin:5px 0;"><strong>Images Found:</strong> '+urls.length+'</p>'+
  '<p style="margin:5px 0;"><strong>PDFs Found:</strong> '+pdfs.length+'</p>'+
  '<p style="margin:5px 0;color:#666;font-size:12px;">Version '+VERSION+'</p>'+
  '<div style="margin-top:15px;">'+
  '<button id="htmlBtn" style="padding:10px 15px;margin:5px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:4px;font-size:14px;">📄 Download HTML Viewer</button>'+
  '<button id="closeBtn" style="padding:10px 15px;margin:5px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:4px;font-size:14px;">✖ Close</button>'+
  '</div>';
document.body.appendChild(div);

document.getElementById('htmlBtn').onclick=function(){
  var btn=this;
  btn.disabled=true;
  btn.textContent='Processing...';
  
  var imageDimensions=[];
  var index=0;
  
  function processNext(){
    if(index>=urls.length){
      createViewer();
      return;
    }
    
    btn.textContent='Processing '+(index+1)+'/'+urls.length+'...';
    
    var currentUrl=urls[index];
    var img=new Image();
    var done=false;
    
    var timeout=setTimeout(function(){
      if(!done){
        done=true;
        imageDimensions.push({url:currentUrl,width:0,height:0,mp:0});
        index++;
        processNext();
      }
    },2000);
    
    img.onload=function(){
      if(!done){
        done=true;
        clearTimeout(timeout);
        var mp=(this.naturalWidth*this.naturalHeight/1000000).toFixed(2);
        imageDimensions.push({url:currentUrl,width:this.naturalWidth,height:this.naturalHeight,mp:mp});
        index++;
        processNext();
      }
    };
    
    img.onerror=function(){
      if(!done){
        done=true;
        clearTimeout(timeout);
        imageDimensions.push({url:currentUrl,width:0,height:0,mp:0});
        index++;
        processNext();
      }
    };
    
    img.src=currentUrl;
  }
  
  function createViewer(){
    btn.textContent='Creating viewer...';
    
    var propTitle=propertyTitle.replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,' ');
    var propUrl=propertyUrl.replace(/'/g,"\\'").replace(/"/g,'\\"');
    
    var output='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+propertyTitle.replace(/</g,'&lt;')+'</title>';
    output+='<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}';
    output+='.header{background:white;padding:20px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='.controls{background:white;padding:15px;margin-bottom:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}';
    output+='button{padding:10px 15px;margin:5px;cursor:pointer;border:none;border-radius:4px;font-weight:bold}';
    output+='.btn-primary{background:#4CAF50;color:white}.btn-secondary{background:#2196F3;color:white}.btn-danger{background:#f44336;color:white}';
    output+='.filters{background:white;padding:15px;margin-bottom:20px;border-radius:8px}';
    output+='.filter-group{display:inline-block;margin:10px 15px 10px 0}';
    output+='.filter-group label{display:block;margin-bottom:5px;font-weight:bold}';
    output+='.filter-group input{padding:5px;width:100px;border:1px solid #ddd;border-radius:4px}';
    output+='.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px}';
    output+='.card{border:2px solid #ddd;border-radius:8px;background:white;padding:10px}';
    output+='.card.selected{border-color:#4CAF50;box-shadow:0 0 10px rgba(76,175,80,0.5)}';
    output+='.card.deleted{display:none}';
    output+='.card img{width:100%;height:200px;object-fit:contain;background:#f9f9f9}';
    output+='.card-info{padding:10px 0;font-size:13px}';
    output+='.tag-select{width:100%;padding:5px;margin:5px 0;border:1px solid #ddd;border-radius:4px}';
    output+='.download-btn{display:block;width:100%;padding:8px;background:#2196F3;color:white;text-decoration:none;text-align:center;border-radius:4px;margin-top:5px}';
    output+='</style></head><body>';
    
    output+='<div class="header"><h1>Image Manager</h1>';
    output+='<p><strong>Property:</strong> '+propertyTitle.replace(/</g,'&lt;')+'</p>';
    output+='<p><strong>Source:</strong> '+siteName+'</p>';
    output+='<p><strong>Images:</strong> <span id="imgCount">'+imageDimensions.length+'</span></p></div>';
    
    if(pdfs.length>0){
      output+='<div class="controls" style="background:#e3f2fd"><h3 style="margin:0 0 10px 0">📄 PDFs Found ('+pdfs.length+')</h3>';
      for(var p=0;p<pdfs.length;p++){
        var pdfText=pdfs[p].text.replace(/</g,'&lt;').replace(/"/g,'&quot;');
        var pdfUrl=pdfs[p].url.replace(/"/g,'&quot;');
        output+='<div style="margin:5px 0"><input type="checkbox" id="pdf'+p+'" data-url="'+pdfUrl+'"> ';
        output+='<label for="pdf'+p+'">'+pdfText+'</label></div>';
      }
      output+='</div>';
    }
    
    output+='<div class="filters"><h3>Filter by Megapixels</h3>';
    output+='<div class="filter-group"><label>Min MP:</label><input type="number" step="0.1" id="minMP" value="0"></div>';
    output+='<div class="filter-group"><label>Max MP:</label><input type="number" step="0.1" id="maxMP" value="999"></div>';
    output+='<button class="btn-primary" onclick="applyFilters()">Apply</button>';
    output+='<button class="btn-secondary" onclick="resetFilters()">Reset</button></div>';
    
    output+='<div class="controls">';
    output+='<button class="btn-secondary" onclick="selectAll()">✓ Select All</button>';
    output+='<button class="btn-secondary" onclick="deselectAll()">✗ Deselect All</button>';
    output+='<button class="btn-danger" onclick="deleteSelected()">🗑 Delete Selected</button>';
    output+='<button class="btn-primary" onclick="exportCSV()">📊 Export CSV</button>';
    output+='<span id="selCount" style="margin-left:10px;font-weight:bold">0 selected</span></div>';
    
    output+='<div class="gallery" id="gallery">';
    
    for(var i=0;i<imageDimensions.length;i++){
      var item=imageDimensions[i];
      output+='<div class="card" id="card'+i+'" data-mp="'+item.mp+'" data-idx="'+i+'">';
      output+='<input type="checkbox" onchange="updateCount()">';
      output+='<img src="'+item.url+'" loading="lazy">';
      output+='<div class="card-info"><strong>'+item.mp+' MP</strong></div>';
      output+='<select class="tag-select" onchange="tagChanged('+i+',this.value)">';
      output+='<option value="">No Tag</option>';
      output+='<option value="Primary">Primary Image</option>';
      output+='<option value="Alt1">Alternate Image 1</option>';
      output+='<option value="Alt2">Alternate Image 2</option>';
      output+='<option value="ProMap">ProMap</option>';
      output+='</select>';
      output+='<a href="'+item.url+'" download="Image_'+(i+1)+'.jpg" class="download-btn">⬇ Download</a>';
      output+='</div>';
    }
    
    output+='</div>';
    
    output+='<script>';
    output+='var imageData='+JSON.stringify(imageDimensions)+';';
    output+='var tags={};';
    output+='var propTitle="'+propTitle+'";';
    output+='var propUrl="'+propUrl+'";';
    
    output+='function applyFilters(){';
    output+='var minMP=parseFloat(document.getElementById("minMP").value)||0;';
    output+='var maxMP=parseFloat(document.getElementById("maxMP").value)||999;';
    output+='var cards=document.querySelectorAll(".card");';
    output+='var count=0;';
    output+='cards.forEach(function(card){';
    output+='if(card.classList.contains("deleted"))return;';
    output+='var mp=parseFloat(card.dataset.mp);';
    output+='if(mp>=minMP&&mp<=maxMP){card.style.display="block";count++;}';
    output+='else{card.style.display="none";}';
    output+='});';
    output+='document.getElementById("imgCount").textContent=count;';
    output+='}';
    
    output+='function resetFilters(){';
    output+='document.getElementById("minMP").value=0;';
    output+='document.getElementById("maxMP").value=999;';
    output+='applyFilters();';
    output+='}';
    
    output+='function selectAll(){';
    output+='document.querySelectorAll(".card:not(.deleted)").forEach(function(card){';
    output+='if(card.style.display!="none")card.querySelector("input").checked=true;';
    output+='});';
    output+='updateCount();';
    output+='}';
    
    output+='function deselectAll(){';
    output+='document.querySelectorAll("input[type=checkbox]").forEach(function(cb){cb.checked=false;});';
    output+='updateCount();';
    output+='}';
    
    output+='function deleteSelected(){';
    output+='var selected=[];';
    output+='document.querySelectorAll(".card input:checked").forEach(function(cb){';
    output+='selected.push(cb.closest(".card"));';
    output+='});';
    output+='if(selected.length==0){alert("Please select images to delete");return;}';
    output+='if(!confirm("Delete "+selected.length+" images?")){return;}';
    output+='selected.forEach(function(card){';
    output+='card.classList.add("deleted");';
    output+='card.querySelector("input").checked=false;';
    output+='});';
    output+='updateCount();';
    output+='applyFilters();';
    output+='}';
    
    output+='function updateCount(){';
    output+='var count=document.querySelectorAll(".card:not(.deleted) input:checked").length;';
    output+='document.getElementById("selCount").textContent=count+" selected";';
    output+='document.querySelectorAll(".card").forEach(function(card){';
    output+='if(card.querySelector("input").checked){card.classList.add("selected");}';
    output+='else{card.classList.remove("selected");}';
    output+='});';
    output+='}';
    
    output+='function tagChanged(idx,val){';
    output+='if(val){';
    output+='for(var k in tags){if(tags[k]==val)delete tags[k];}';
    output+='tags[idx]=val;';
    output+='document.querySelectorAll("select").forEach(function(sel){';
    output+='var cardIdx=parseInt(sel.closest(".card").dataset.idx);';
    output+='if(cardIdx!=idx&&sel.value==val){sel.value="";}';
    output+='});';
    output+='}else{delete tags[idx];}';
    output+='}';
    
    output+='function exportCSV(){';
    output+='var selected=[];';
    output+='document.querySelectorAll(".card:not(.deleted) input:checked").forEach(function(cb){';
    output+='selected.push(parseInt(cb.closest(".card").dataset.idx));';
    output+='});';
    output+='var selectedPDFs=[];';
    output+='document.querySelectorAll("[id^=pdf]:checked").forEach(function(cb){';
    output+='selectedPDFs.push({url:cb.dataset.url,text:cb.nextElementSibling.textContent});';
    output+='});';
    output+='if(selected.length==0&&selectedPDFs.length==0){alert("Please select images or PDFs");return;}';
    output+='selected.sort(function(a,b){return a-b;});';
    output+='var csv="Property,URL,Type,Number,Resource URL,Megapixels,Tag\\n";';
    output+='selected.forEach(function(idx,num){';
    output+='var img=imageData[idx];';
    output+='var tag=tags[idx]||"";';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",Image,"+(num+1)+",\\""+img.url+"\\","+img.mp+",\\""+tag+"\\"\\n";';
    output+='});';
    output+='selectedPDFs.forEach(function(pdf,num){';
    output+='csv+="\\""+propTitle+"\\",\\""+propUrl+"\\",PDF,"+(num+1)+",\\""+pdf.url+"\\",N/A,N/A\\n";';
    output+='});';
    output+='var blob=new Blob([csv],{type:"text/csv"});';
    output+='var link=document.createElement("a");';
    output+='link.href=URL.createObjectURL(blob);';
    output+='link.download="images_pdfs_"+Date.now()+".csv";';
    output+='link.click();';
    output+='}';
    
    output+='</script></body></html>';
    
    var blob=new Blob([output],{type:'text/html'});
    var blobUrl=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=blobUrl;
    a.download='images_'+Date.now()+'.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
    alert('HTML viewer downloaded!');
    document.body.removeChild(div);
  }
  
  processNext();
};

document.getElementById('closeBtn').onclick=function(){
  document.body.removeChild(div);
};

})();

(function(){

// VERSION
var VERSION = '1.0.6';

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
          // Extract all URLs with their widths
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
      
      // Handle srcset images (like Estates Gazette)
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
      
      // Regular img tags
      document.querySelectorAll('img').forEach(function(img){
        if(img.src && img.src.startsWith('http') && img.naturalWidth>200 && !seen[img.src]){
          if(!img.src.match(/logo|icon|sprite|avatar|thumb/i)){
            seen[img.src]=true;
            u.push(img.src);
          }
        }
      });
      
      // Picture source tags
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
      
      // Background images
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

// Extract PDFs
function extractPDFs(){
  var pdfs=[];
  var seen={};
  
  // Links to PDFs
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
  
  // Embedded PDFs
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
  
  // iframes with PDFs
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

// Detect site and extract
var handler=null;
for(var key in HANDLERS){
  if(HANDLERS[key].detect()){
    handler=HANDLERS[key];
    break;
  }
}

var urls=handler.extract();

// Filter out any PDFs from image URLs
urls=urls.filter(function(url){
  return !url.match(/\.pdf(\?|#|$)/i);
});

var pdfs=extractPDFs();
var siteName=handler.name;
var propertyTitle=document.title||'Property';
var propertyUrl=window.location.href;

if(urls.length===0 && pdfs.length===0){
  alert('No images or PDFs found on this page!');
  return;
}

// Create popup dialog
var div=document.createElement('div');
div.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:3px solid #333;padding:20px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:Arial,sans-serif;min-width:400px;max-width:500px;';
div.innerHTML='<h2 style="margin:0 0 15px 0;color:#333;">Image & PDF Scraper</h2>'+
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
  
  function processNextImage(index){
    if(index>=urls.length){
      generateHTML();
      return;
    }
    
    btn.textContent='Processing '+(index+1)+'/'+urls.length+'...';
    
    var currentUrl=urls[index];
    var img=new Image();
    var done=false;
    
    var timeout=setTimeout(function(){
      if(!done){
        done=true;
        imageDimensions.push({
          url:currentUrl,
          width:0,
          height:0,
          megapixels:0
        });
        processNextImage(index+1);
      }
    },2000);
    
    img.onload=function(){
      if(!done){
        done=true;
        clearTimeout(timeout);
        imageDimensions.push({
          url:currentUrl,
          width:this.naturalWidth,
          height:this.naturalHeight,
          megapixels:(this.naturalWidth*this.naturalHeight/1000000).toFixed(2)
        });
        processNextImage(index+1);
      }
    };
    
    img.onerror=function(){
      if(!done){
        done=true;
        clearTimeout(timeout);
        imageDimensions.push({
          url:currentUrl,
          width:0,
          height:0,
          megapixels:0
        });
        processNextImage(index+1);
      }
    };
    
    img.src=currentUrl;
  }
  
  function generateHTML(){
    '<div class="header"><h1>Images & PDFs Viewer</h1><p><strong>Property:</strong> '+propertyTitle.replace(/</g,'&lt;')+'</p><p><strong>Source:</strong> '+siteName+'</p><p><strong>URL:</strong> <a href="'+propertyUrl+'" target="_blank">'+propertyUrl+'</a></p><p><strong>Images:</strong> '+imageDimensions.length+' | <strong>PDFs:</strong> '+pdfs.length+'</p></div>'+
    '<div class="filters"><h3 style="margin:0 0 10px 0">Filters</h3><div class="filter-group"><label>Min Width (px):</label><input type="number" id="minWidth" value="0"></div><div class="filter-group"><label>Max Width (px):</label><input type="number" id="maxWidth" value="99999"></div><div class="filter-group"><label>Min Height (px):</label><input type="number" id="minHeight" value="0"></div><div class="filter-group"><label>Max Height (px):</label><input type="number" id="maxHeight" value="99999"></div><div class="filter-group"><label>Min Megapixels:</label><input type="number" step="0.1" id="minMP" value="0"></div><div class="filter-group"><label>Max Megapixels:</label><input type="number" step="0.1" id="maxMP" value="999"></div><br><button class="btn-primary" onclick="applyFilters()">Apply Filters</button><button class="btn-secondary" onclick="resetFilters()">Reset Filters</button></div>'+
    '<div class="controls"><button class="btn-secondary" onclick="selectAll()">✓ Select All</button><button class="btn-secondary" onclick="deselectAll()">✗ Deselect All</button><button class="btn-danger" onclick="deleteSelected()">🗑 Delete Selected</button><button class="btn-primary" onclick="downloadCSV()">📊 Export CSV</button></div>';
    
    if(pdfs.length>0){
      html+='<div class="section"><h2>📄 PDF Documents ('+pdfs.length+')</h2><ul class="pdf-list">';
      pdfs.forEach(function(pdf,idx){
        html+='<li class="pdf-item"><a href="'+pdf.url+'" target="_blank" download>📥 '+(pdf.text||'PDF '+(idx+1))+'</a><br><small style="color:#666;">'+pdf.url+'</small></li>';
      });
      html+='</ul></div>';
    }
    
    html+='<div class="section"><h2>🖼 Images (<span id="imageCount">'+imageDimensions.length+'</span>)</h2><div class="gallery" id="gallery">';
    
    imageDimensions.forEach(function(item,i){
      html+='<div class="image-card" data-width="'+item.width+'" data-height="'+item.height+'" data-mp="'+item.megapixels+'">'+
        '<div class="checkbox-wrapper"><input type="checkbox" class="img-checkbox" data-url="'+item.url+'" data-index="'+i+'"></div>'+
        '<div class="image-wrapper"><img src="'+item.url+'" alt="Image '+(i+1)+'" loading="lazy"></div>'+
        '<div class="image-info"><div><strong>Dimensions:</strong> '+item.width+' × '+item.height+'</div><div><strong>Megapixels:</strong> '+item.megapixels+' MP</div></div>'+
        '<div class="tag-buttons"><button class="tag-btn" onclick="toggleTag(this,\'Primary\')">Primary</button><button class="tag-btn" onclick="toggleTag(this,\'Alt1\')">Alt 1</button><button class="tag-btn" onclick="toggleTag(this,\'Alt2\')">Alt 2</button><button class="tag-btn" onclick="toggleTag(this,\'ProMap\')">ProMap</button></div>'+
        '<a href="'+item.url+'" download="Image_'+(i+1)+'.jpg" class="download-link">⬇️ Download</a></div>';
    });
    
    html+='</div></div><script>function applyFilters(){var minW=parseInt(document.getElementById("minWidth").value)||0;var maxW=parseInt(document.getElementById("maxWidth").value)||99999;var minH=parseInt(document.getElementById("minHeight").value)||0;var maxH=parseInt(document.getElementById("maxHeight").value)||99999;var minMP=parseFloat(document.getElementById("minMP").value)||0;var maxMP=parseFloat(document.getElementById("maxMP").value)||999;var cards=document.querySelectorAll(".image-card");var count=0;cards.forEach(function(card){var w=parseInt(card.dataset.width);var h=parseInt(card.dataset.height);var mp=parseFloat(card.dataset.mp);if(w>=minW&&w<=maxW&&h>=minH&&h<=maxH&&mp>=minMP&&mp<=maxMP){card.style.display="block";count++;}else{card.style.display="none";}});document.getElementById("imageCount").textContent=count;}function resetFilters(){document.getElementById("minWidth").value=0;document.getElementById("maxWidth").value=99999;document.getElementById("minHeight").value=0;document.getElementById("maxHeight").value=99999;document.getElementById("minMP").value=0;document.getElementById("maxMP").value=999;applyFilters();}function selectAll(){document.querySelectorAll(".image-card").forEach(function(card){if(card.style.display!=="none"){card.querySelector(".img-checkbox").checked=true;card.classList.add("selected");}});}function deselectAll(){document.querySelectorAll(".img-checkbox").forEach(function(cb){cb.checked=false;cb.closest(".image-card").classList.remove("selected");});}function deleteSelected(){if(!confirm("Delete selected images?"))return;document.querySelectorAll(".img-checkbox:checked").forEach(function(cb){cb.closest(".image-card").remove();});applyFilters();}function toggleTag(btn,tag){btn.classList.toggle("active");var card=btn.closest(".image-card");if(!card.dataset.tags)card.dataset.tags="";var tags=card.dataset.tags.split(",").filter(function(t){return t});if(btn.classList.contains("active")){if(!tags.includes(tag))tags.push(tag);}else{tags=tags.filter(function(t){return t!==tag});}card.dataset.tags=tags.join(",");}function downloadCSV(){var rows=[["Property","URL","Image Number","Image URL","Width","Height","Megapixels","Tags"]];document.querySelectorAll(".image-card").forEach(function(card,i){if(card.style.display!=="none"){var cb=card.querySelector(".img-checkbox");var url=cb.dataset.url;var w=card.dataset.width;var h=card.dataset.height;var mp=card.dataset.mp;var tags=card.dataset.tags||"";rows.push(["'+propertyTitle.replace(/"/g,'\\"')+'","'+propertyUrl+'","'+(i+1)+'","'+url+'","'+w+'","'+h+'","'+mp+'","'+tags+'"]);}});var csv=rows.map(function(r){return r.map(function(c){return \'"\'+String(c).replace(/"/g,\'""\')+\'"\';}).join(",");}).join("\\n");var blob=new Blob([csv],{type:"text/csv"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="images_"+Date.now()+".csv";a.click();URL.revokeObjectURL(url);}document.querySelectorAll(".img-checkbox").forEach(function(cb){cb.addEventListener("change",function(){this.closest(".image-card").classList.toggle("selected",this.checked);});});<\/script></body></html>';
    
    var blob=new Blob([html],{type:'text/html'});
    var blobUrl=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=blobUrl;
    a.download='images_pdfs_'+Date.now()+'.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    alert('HTML file downloaded! Open it to view images and PDFs.');
    document.body.removeChild(div);
  }
  
  processNextImage(0);
};

document.getElementById('closeBtn').onclick=function(){
  document.body.removeChild(div);
};

})();

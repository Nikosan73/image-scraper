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
  '<button id="htmlBtn" style="width:100%;padding:15px;margin:10px 0;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📄 Download HTML Viewer</button>' +
  '<button id="csvBtn" style="width:100%;padding:15px;margin:10px 0;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📊 Download CSV</button>' +
  '<button id="copyBtn" style="width:100%;padding:15px;margin:10px 0;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">📋 Copy URLs</button>' +
  '<button id="closeBtn" style="width:100%;padding:15px;margin:10px 0;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:bold;">❌ Close</button>';

document.body.appendChild(div);

// ========================================
// BUTTON: DOWNLOAD HTML VIEWER
// ========================================

document.getElementById('htmlBtn').onclick = function(){
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + siteName + ' Images</title></head><body style="font-family:Arial;padding:20px;background:#f5f5f5;"><h1>Found ' + urls.length + ' Images</h1><p>From: ' + siteName + ' scraper</p>';
  
  urls.forEach(function(url, i){
    html += '<div style="background:white;padding:15px;margin:15px 0;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">' +
      '<h3>Image ' + (i+1) + '</h3>' +
      '<img src="' + url + '" style="max-width:100%;border:1px solid #ddd;"><br>' +
      '<a href="' + url + '" download="Image_' + (i+1) + '.jpg" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">Download Image ' + (i+1) + '</a>' +
      '</div>';
  });
  
  html += '</body></html>';
  
  var blob = new Blob([html], {type: 'text/html'});
  var blobUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'images_' + Date.now() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  alert('HTML file downloaded!');
};

// ========================================
// BUTTON: DOWNLOAD CSV
// ========================================

document.getElementById('csvBtn').onclick = function(){
  var csv = 'Property,URL,Image Number,Image URL\n';
  
  urls.forEach(function(url, i){
    csv += '"' + document.title.replace(/"/g, '""') + '","' + window.location.href + '",' + (i+1) + ',"' + url + '"\n';
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

})();

// VERSION
var VERSION = 'v2.1.4';

// SITE-SPECIFIC HANDLERS
var HANDLERS = {
  zoopla: {
    name: 'Zoopla',
    detect: function() {
      return window.location.hostname.includes('zoopla.co.uk');
    },
    extract: function() {
      var u = [];
      document.querySelectorAll('img[src], img[data-src]').forEach(function(img) {
        var src = img.dataset.src || img.src;
        if (src && src.includes('lid.zoocdn.com')) {
          var highRes = src.replace(/_max_\d+x\d+/, '_max_2000x2000').replace(/_\d+x\d+\./, '_max_2000x2000.');
          if (!u.includes(highRes)) u.push(highRes);
        }
      });
      return u;
    }
  },
  allsop: {
    name: 'Allsop',
    detect: function() {
      return window.location.hostname.includes('allsop.co.uk');
    },
    extract: function() {
      var u = [];
      document.querySelectorAll('a[href*="mediamanager"][href*="lotImages"]').forEach(function(a) {
        var href = a.href;
        if (!u.includes(href)) u.push(href);
      });
      return u;
    }
  },
  propertylink: {
    name: 'PropertyLink/Estates Gazette',
    detect: function() {
      return window.location.hostname.includes('estatesgazette.com') || 
             window.location.hostname.includes('propertylink');
    },
    extract: function() {
      var u = [];
      document.querySelectorAll('img[srcset]').forEach(function(img) {
        var srcset = img.srcset;
        if (srcset && (srcset.includes('propertylinkassets') || srcset.includes('estatesgazette'))) {
          var matches = srcset.match(/https:\/\/[^\s]+\s+(\d+)w/g);
          if (matches) {
            var maxWidth = 0;
            var maxUrl = '';
            matches.forEach(function(match) {
              var parts = match.match(/(https:\/\/[^\s]+)\s+(\d+)w/);
              if (parts) {
                var url = parts[1];
                var width = parseInt(parts[2]);
                if (width > maxWidth) {
                  maxWidth = width;
                  maxUrl = url;
                }
              }
            });
            if (maxUrl && !u.includes(maxUrl)) {
              u.push(maxUrl);
            }
          }
        }
      });
      return u;
    }
  },
  knightfrank: {
    name: 'Knight Frank',
    detect: function() {
      return window.location.hostname.includes('knightfrank.co');
    },
    extract: function() {
      var u = [];
      document.querySelectorAll('img[data-src]').forEach(function(img) {
        var dataSrc = img.dataset.src;
        if (dataSrc && dataSrc.includes('content.knightfrank.com')) {
          if (!u.includes(dataSrc)) u.push(dataSrc);
        }
      });
      return u;
    }
  }
};

// GENERIC EXTRACTOR
function extractGeneric() {
  var u = [];
  
  document.querySelectorAll('img').forEach(function(img) {
    var src = img.dataset.src || img.src;
    if (src && src.startsWith('http')) {
      if (!u.includes(src)) u.push(src);
    }
    
    if (img.srcset) {
      var srcset = img.srcset;
      var matches = srcset.match(/https?:\/\/[^\s,]+/g);
      if (matches) {
        matches.forEach(function(url) {
          var cleanUrl = url.trim();
          if (!u.includes(cleanUrl)) u.push(cleanUrl);
        });
      }
    }
  });
  
  document.querySelectorAll('a[href]').forEach(function(a) {
    var href = a.href;
    if (href && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(href)) {
      if (!u.includes(href)) u.push(href);
    }
  });
  
  return u;
}

// PDF EXTRACTOR
function extractPDFs() {
  var pdfs = [];
  document.querySelectorAll('a[href]').forEach(function(a) {
    var href = a.href;
    if (href && /\.pdf(\?|$)/i.test(href)) {
      var text = a.textContent.trim() || a.title || 'PDF Document';
      if (!pdfs.some(function(p) { return p.url === href; })) {
        pdfs.push({ url: href, name: text });
      }
    }
  });
  return pdfs;
}

// MAIN EXECUTION
(function() {
  var handler = null;
  for (var key in HANDLERS) {
    if (HANDLERS[key].detect()) {
      handler = HANDLERS[key];
      break;
    }
  }
  
  var images = handler ? handler.extract() : extractGeneric();
  var pdfs = extractPDFs();
  
  if (images.length === 0 && pdfs.length === 0) {
    alert('No images or PDFs found on this page!');
    return;
  }
  
  var style = document.createElement('style');
  style.textContent = `
    #imgScraperUI { position:fixed; top:20px; right:20px; width:420px; max-height:85vh; background:#fff; 
      border:2px solid #333; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:999999; 
      font-family:Arial,sans-serif; font-size:13px; overflow:hidden; display:flex; flex-direction:column; }
    #imgScraperUI * { box-sizing:border-box; }
    #scraperHeader { background:#2c3e50; color:#fff; padding:12px 15px; font-weight:bold; font-size:14px; 
      display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
    #scraperContent { padding:15px; overflow-y:auto; flex:1; }
    .scraperSection { margin-bottom:20px; }
    .scraperSection h3 { margin:0 0 10px 0; font-size:13px; color:#2c3e50; border-bottom:1px solid #ddd; padding-bottom:5px; }
    .imgItem, .pdfItem { margin:8px 0; padding:8px; border:1px solid #ddd; border-radius:4px; background:#f9f9f9; }
    .imgItem img { width:100%; height:auto; border-radius:4px; margin-bottom:8px; cursor:pointer; }
    .imgItem img:hover { opacity:0.8; }
    .imgControls, .pdfControls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .imgControls input[type="checkbox"] { margin:0; }
    .imgControls label { font-size:11px; color:#555; }
    .imgControls select { padding:4px; font-size:11px; border:1px solid #ccc; border-radius:3px; flex:1; min-width:100px; }
    .pdfControls select { padding:4px; font-size:11px; border:1px solid #ccc; border-radius:3px; flex:1; }
    .pdfItem a { color:#2980b9; text-decoration:none; font-weight:bold; word-break:break-all; }
    .pdfItem a:hover { text-decoration:underline; }
    .filterRow { display:flex; gap:10px; margin-bottom:15px; align-items:center; flex-wrap:wrap; }
    .filterRow label { font-weight:bold; color:#2c3e50; white-space:nowrap; }
    .filterRow input { padding:6px; border:1px solid #ccc; border-radius:4px; width:80px; }
    .filterRow button { padding:6px 12px; background:#3498db; color:#fff; border:none; border-radius:4px; 
      cursor:pointer; font-weight:bold; }
    .filterRow button:hover { background:#2980b9; }
    .actionRow { display:flex; gap:8px; margin-top:15px; flex-shrink:0; padding:0 15px 15px 15px; }
    .actionRow button { flex:1; padding:10px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; }
    #downloadBtn { background:#27ae60; color:#fff; }
    #downloadBtn:hover { background:#229954; }
    #downloadBtn:disabled { background:#95a5a6; cursor:not-allowed; }
    #downloadCSVBtn { background:#e67e22; color:#fff; }
    #downloadCSVBtn:hover { background:#d35400; }
    #downloadCSVBtn:disabled { background:#95a5a6; cursor:not-allowed; }
    #closeBtn { background:#e74c3c; color:#fff; }
    #closeBtn:hover { background:#c0392b; }
    .stats { font-size:11px; color:#7f8c8d; margin-bottom:10px; }
  `;
  document.head.appendChild(style);
  
  var div = document.createElement('div');
  div.id = 'imgScraperUI';
  
  var headerHTML = '<div id="scraperHeader">';
  headerHTML += '<span>Image & PDF Scraper ' + VERSION;
  if (handler) headerHTML += ' (' + handler.name + ')';
  headerHTML += '</span>';
  headerHTML += '<button id="closeBtn" style="background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;width:25px;height:25px;">×</button>';
  headerHTML += '</div>';
  
  var contentHTML = '<div id="scraperContent">';
  
  contentHTML += '<div class="filterRow">';
  contentHTML += '<label>Min Width:</label><input type="number" id="minWidth" value="800" min="0">';
  contentHTML += '<label>Min Height:</label><input type="number" id="minHeight" value="600" min="0">';
  contentHTML += '<button id="applyFilter">Apply</button>';
  contentHTML += '</div>';
  
  contentHTML += '<div class="scraperSection">';
  contentHTML += '<h3>Images (' + images.length + ' found)</h3>';
  contentHTML += '<div id="imageList"></div>';
  contentHTML += '</div>';
  
  if (pdfs.length > 0) {
    contentHTML += '<div class="scraperSection">';
    contentHTML += '<h3>PDFs (' + pdfs.length + ' found)</h3>';
    pdfs.forEach(function(pdf, i) {
      contentHTML += '<div class="pdfItem">';
      contentHTML += '<a href="' + pdf.url + '" target="_blank">' + pdf.name + '</a>';
      contentHTML += '<div class="pdfControls">';
      contentHTML += '<input type="checkbox" class="pdfCheck" data-url="' + pdf.url + '" id="pdf' + i + '">';
      contentHTML += '<label for="pdf' + i + '" style="margin:0 8px 0 4px;">Include</label>';
      contentHTML += '<select class="pdfTag" data-url="' + pdf.url + '">';
      contentHTML += '<option value="">No Tag</option>';
      contentHTML += '<option value="Floorplan">Floorplan</option>';
      contentHTML += '<option value="EPC">EPC</option>';
      contentHTML += '<option value="Title Plan">Title Plan</option>';
      contentHTML += '<option value="Marketing Brochure">Marketing Brochure</option>';
      contentHTML += '<option value="Other">Other</option>';
      contentHTML += '</select>';
      contentHTML += '</div>';
      contentHTML += '</div>';
    });
    contentHTML += '</div>';
  }
  
  contentHTML += '</div>';
  
  var actionsHTML = '<div class="actionRow">';
  actionsHTML += '<button id="downloadBtn" disabled>Download Selected</button>';
  actionsHTML += '<button id="downloadCSVBtn" disabled>Export CSV</button>';
  actionsHTML += '</div>';
  
  div.innerHTML = headerHTML + contentHTML + actionsHTML;
  document.body.appendChild(div);
  
  var imageData = [];
  var loadedCount = 0;
  var minW = 800;
  var minH = 600;
  
  function loadImages() {
    imageData = [];
    loadedCount = 0;
    document.getElementById('imageList').innerHTML = '<div class="stats">Loading images...</div>';
    
    images.forEach(function(url, idx) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        loadedCount++;
        imageData.push({
          url: url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          megapixels: (img.naturalWidth * img.naturalHeight / 1000000).toFixed(2)
        });
        
        if (loadedCount === images.length) {
          renderImages();
        }
      };
      img.onerror = function() {
        loadedCount++;
        if (loadedCount === images.length) {
          renderImages();
        }
      };
      img.src = url;
    });
  }
  
  function renderImages() {
    var filtered = imageData.filter(function(img) {
      return img.width >= minW && img.height >= minH;
    });
    
    var listDiv = document.getElementById('imageList');
    listDiv.innerHTML = '';
    
    if (filtered.length === 0) {
      listDiv.innerHTML = '<div class="stats">No images match the filter criteria.</div>';
      document.getElementById('downloadBtn').disabled = true;
      document.getElementById('downloadCSVBtn').disabled = true;
      return;
    }
    
    var stats = document.createElement('div');
    stats.className = 'stats';
    stats.textContent = 'Showing ' + filtered.length + ' of ' + imageData.length + ' images';
    listDiv.appendChild(stats);
    
    filtered.forEach(function(img, i) {
      var item = document.createElement('div');
      item.className = 'imgItem';
      
      var imgEl = document.createElement('img');
      imgEl.src = img.url;
      imgEl.onclick = function() { window.open(img.url, '_blank'); };
      item.appendChild(imgEl);
      
      var controls = document.createElement('div');
      controls.className = 'imgControls';
      
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'imgCheck';
      cb.dataset.url = img.url;
      cb.id = 'img' + i;
      
      var lbl = document.createElement('label');
      lbl.htmlFor = 'img' + i;
      lbl.textContent = img.width + 'x' + img.height + ' (' + img.megapixels + 'MP)';
      lbl.style.marginRight = '8px';
      
      var sel = document.createElement('select');
      sel.className = 'imgTag';
      sel.dataset.url = img.url;
      sel.innerHTML = '<option value="">No Tag</option><option value="External">External</option><option value="Internal">Internal</option><option value="Floorplan">Floorplan</option><option value="EPC">EPC</option><option value="Map">Map</option><option value="Other">Other</option>';
      
      controls.appendChild(cb);
      controls.appendChild(lbl);
      controls.appendChild(sel);
      item.appendChild(controls);
      
      listDiv.appendChild(item);
    });
    
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('downloadCSVBtn').disabled = false;
    
    document.querySelectorAll('.imgCheck, .pdfCheck').forEach(function(cb) {
      cb.addEventListener('change', updateButtons);
    });
    
    document.querySelectorAll('.imgTag').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var url = this.dataset.url;
        var tag = this.value;
        var cb = document.querySelector('.imgCheck[data-url="' + url + '"]');
        
        if (tag === 'Floorplan' || tag === 'EPC') {
          document.querySelectorAll('.imgTag').forEach(function(otherSel) {
            if (otherSel !== sel && otherSel.value === tag) {
              otherSel.value = '';
            }
          });
          document.querySelectorAll('.pdfTag').forEach(function(pdfSel) {
            if (pdfSel.value === tag) {
              pdfSel.value = '';
            }
          });
        }
        
        if (tag && cb) cb.checked = true;
        updateButtons();
      });
    });
    
    document.querySelectorAll('.pdfTag').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var url = this.dataset.url;
        var tag = this.value;
        var cb = document.querySelector('.pdfCheck[data-url="' + url + '"]');
        
        if (tag === 'Floorplan' || tag === 'EPC' || tag === 'Marketing Brochure') {
          document.querySelectorAll('.pdfTag').forEach(function(otherSel) {
            if (otherSel !== sel && otherSel.value === tag) {
              otherSel.value = '';
            }
          });
          document.querySelectorAll('.imgTag').forEach(function(imgSel) {
            if (imgSel.value === tag) {
              imgSel.value = '';
            }
          });
        }
        
        if (tag && cb) cb.checked = true;
        updateButtons();
      });
    });
  }
  
  function updateButtons() {
    var anyChecked = document.querySelectorAll('.imgCheck:checked, .pdfCheck:checked').length > 0;
    document.getElementById('downloadBtn').disabled = !anyChecked;
    document.getElementById('downloadCSVBtn').disabled = !anyChecked;
  }
  
  document.getElementById('applyFilter').onclick = function() {
    minW = parseInt(document.getElementById('minWidth').value) || 0;
    minH = parseInt(document.getElementById('minHeight').value) || 0;
    renderImages();
  };
  
  document.getElementById('downloadBtn').onclick = function() {
    var selected = [];
    document.querySelectorAll('.imgCheck:checked').forEach(function(cb) {
      selected.push(cb.dataset.url);
    });
    document.querySelectorAll('.pdfCheck:checked').forEach(function(cb) {
      selected.push(cb.dataset.url);
    });
    
    if (selected.length === 0) {
      alert('Please select at least one image or PDF!');
      return;
    }
    
    selected.forEach(function(url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };
  
  document.getElementById('downloadCSVBtn').onclick = function() {
    var rows = [['URL', 'Type', 'Tag', 'Width', 'Height', 'Megapixels']];
    
    document.querySelectorAll('.imgCheck:checked').forEach(function(cb) {
      var url = cb.dataset.url;
      var tag = document.querySelector('.imgTag[data-url="' + url + '"]').value || '';
      var img = imageData.find(function(i) { return i.url === url; });
      if (img) {
        rows.push([url, 'Image', tag, img.width, img.height, img.megapixels]);
      }
    });
    
    document.querySelectorAll('.pdfCheck:checked').forEach(function(cb) {
      var url = cb.dataset.url;
      var tag = document.querySelector('.pdfTag[data-url="' + url + '"]').value || '';
      rows.push([url, 'PDF', tag, '', '', '']);
    });
    
    if (rows.length === 1) {
      alert('Please select at least one image or PDF!');
      return;
    }
    
    var csv = rows.map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'scraped_data_' + new Date().getTime() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  document.getElementById('closeBtn').onclick = function() {
    document.body.removeChild(div);
  };
  
  loadImages();
})();

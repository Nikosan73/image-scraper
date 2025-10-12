function getViewerJavaScript(){
  return `
function handleTagChange(imageIndex){
  const select=document.getElementById("tagSelect"+imageIndex);
  const newTag=select.value;
  const oldTag=imageTags[imageIndex];
  if(oldTag){
    delete tagToImageIndex[oldTag];
    delete imageTags[imageIndex];
    document.getElementById("tagBadge"+imageIndex).style.display="none";
  }
  if(newTag){
    if(tagToImageIndex[newTag]!==undefined){
      const prevIndex=tagToImageIndex[newTag];
      delete imageTags[prevIndex];
      document.getElementById("tagSelect"+prevIndex).value="";
      document.getElementById("tagBadge"+prevIndex).style.display="none";
    }
    imageTags[imageIndex]=newTag;
    tagToImageIndex[newTag]=imageIndex;
    const badge=document.getElementById("tagBadge"+imageIndex);
    badge.textContent=newTag;
    badge.style.display="inline-block";
  }
}
window.onload=function(){
  const imgs=document.querySelectorAll(".image-gallery img");
  const widths=[],heights=[];
  imgs.forEach((img,i)=>{
    const updateDimensions=function(){
      const w=img.naturalWidth,h=img.naturalHeight;
      if(w>0&&h>0){
        const mp=(w*h/1000000).toFixed(1);
        imageDimensions[i]={width:w,height:h,megapixels:parseFloat(mp)};
        widths.push(w);heights.push(h);
        document.getElementById("dim"+i).textContent="📐 "+w+" × "+h+" px ("+mp+" MP)";
        document.getElementById("card"+i).setAttribute("data-width",w);
        document.getElementById("card"+i).setAttribute("data-height",h);
        document.getElementById("card"+i).setAttribute("data-mp",mp);
      }else{
        imageDimensions[i]={width:0,height:0,megapixels:0};
        document.getElementById("card"+i).classList.add("error");
      }
      loadedCount++;
      if(loadedCount===imgs.length){
        allLoaded=true;
        if(widths.length>0){
          const avgW=Math.round(widths.reduce((a,b)=>a+b,0)/widths.length);
          const avgH=Math.round(heights.reduce((a,b)=>a+b,0)/heights.length);
          document.getElementById("stats").style.display="block";
          document.getElementById("statsContent").innerHTML="<div>Valid: "+(imgs.length-errorCount)+"</div><div>Avg: "+avgW+"×"+avgH+"px</div>";
        }
      }
    };
    img.onload=updateDimensions;
    img.onerror=function(){errorCount++;loadedCount++;};
    if(img.complete)updateDimensions();
  });
};
function applyFilters(){
  if(!allLoaded){alert("Please wait for images to load!");return;}
  const minW=parseInt(document.getElementById("minWidth").value)||0;
  const minH=parseInt(document.getElementById("minHeight").value)||0;
  const minMP=parseFloat(document.getElementById("minMP").value)||0;
  let hiddenCount=0;
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{
    const w=parseInt(card.getAttribute("data-width"))||0;
    const h=parseInt(card.getAttribute("data-height"))||0;
    const mp=parseFloat(card.getAttribute("data-mp"))||0;
    if(w>=minW&&h>=minH&&mp>=minMP){card.classList.remove("hidden");}else{card.classList.add("hidden");hiddenCount++;}
  });
  document.getElementById("filterStatus").textContent="Showing "+(imageUrls.length-deletedIndices.size-hiddenCount)+" images";
  updateSelection();
}
function resetFilters(){
  document.getElementById("minWidth").value="";
  document.getElementById("minHeight").value="";
  document.getElementById("minMP").value="";
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>card.classList.remove("hidden"));
  document.getElementById("filterStatus").textContent="";
  updateSelection();
}
function selectAll(){
  document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input[type='checkbox']").forEach(cb=>{
    cb.checked=true;cb.parentElement.parentElement.classList.add("selected");
  });
  updateSelection();
}
function selectNone(){
  document.querySelectorAll("input[type='checkbox']").forEach(cb=>{
    cb.checked=false;cb.parentElement.parentElement.classList.remove("selected");
  });
  updateSelection();
}
function selectLarge(){
  document.querySelectorAll(".image-card:not(.deleted)").forEach(card=>{
    const mp=parseFloat(card.getAttribute("data-mp"))||0;
    const checkbox=card.querySelector("input[type='checkbox']");
    if(mp>2&&!card.classList.contains("hidden")){
      checkbox.checked=true;card.classList.add("selected");
    }else{
      checkbox.checked=false;card.classList.remove("selected");
    }
  });
  updateSelection();
}
function deleteSelected(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  if(!confirm("Delete "+selected.length+" images?")){return;}
  selected.forEach(idx=>{
    deletedIndices.add(idx);
    const card=document.getElementById("card"+idx);
    if(card){card.classList.add("deleted");card.querySelector("input[type='checkbox']").checked=false;}
  });
  updateSelection();
}
function updateSelection(){
  const checkboxes=document.querySelectorAll(".image-card:not(.hidden):not(.deleted) input[type='checkbox']");
  const selectedCount=Array.from(checkboxes).filter(cb=>cb.checked).length;
  document.getElementById("selectedCount").textContent=selectedCount+" selected";
  document.querySelectorAll(".image-card").forEach(card=>{
    const checkbox=card.querySelector("input[type='checkbox']");
    if(checkbox&&checkbox.checked){card.classList.add("selected");}else{card.classList.remove("selected");}
  });
}
function getSelectedIndices(){
  const selected=[];
  document.querySelectorAll("input[type='checkbox']:checked").forEach(cb=>{
    const card=cb.closest(".image-card");
    selected.push(parseInt(card.getAttribute("data-original-index")));
  });
  return selected.sort((a,b)=>a-b);
}
function exportCSV(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  const btn=document.querySelector(".csv-btn");
  btn.disabled=true;btn.textContent="Exporting...";
  const rows=["Property,URL,Image Number,Image URL,Width,Height,Megapixels,Tag"];
  selected.forEach((origIdx,newIdx)=>{
    const dim=imageDimensions[origIdx]||{width:0,height:0,megapixels:0};
    const tag=imageTags[origIdx]||"";
    rows.push('"'+propertyTitle.replace(/"/g,'""')+'","'+propertyUrl+'",'+(newIdx+1)+',"'+imageUrls[origIdx]+'",'+dim.width+','+dim.height+','+dim.megapixels+',"'+tag+'"');
  });
  const csv=rows.join("\\r\\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="images_"+Date.now()+".csv";
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  btn.textContent="✓ Exported!";
  setTimeout(()=>{btn.textContent="📊 Export to CSV";btn.disabled=false;},2000);
}
function downloadSelected(){
  const selected=getSelectedIndices();
  if(selected.length===0){alert("Select images first!");return;}
  const btn=document.querySelector(".download-all-btn");
  const status=document.getElementById("status");
  btn.disabled=true;
  btn.textContent="Preparing downloads...";
  status.textContent="Creating download links...";
  
  let downloadCount = 0;
  const totalCount = selected.length;
  
  selected.forEach((origIdx,newIdx)=>{
    setTimeout(()=>{
      const a=document.createElement("a");
      a.href=imageUrls[origIdx];
      a.download="Image_"+(newIdx+1)+".jpg";
      a.style.display="none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      downloadCount++;
      status.textContent="Downloading "+downloadCount+"/"+totalCount+"...";
      
      if(downloadCount===totalCount){
        status.textContent="✅ Started "+totalCount+" downloads! Check your Downloads folder.";
        btn.textContent="⬇️ Download Selected";
        btn.disabled=false;
      }
    }, newIdx * 300);
  });
}
`;
}

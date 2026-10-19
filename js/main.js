// Mobile nav toggle
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('navToggle');
  var mainNav=document.getElementById('mainNav');
  if(navToggle && mainNav){
    navToggle.addEventListener('click',function(){
      if(mainNav.style.display==='flex'){ mainNav.style.display='none'; }
      else { mainNav.style.display='flex'; mainNav.style.flexDirection='column'; }
    });
  }

  // Simple gallery lightbox
  var galleryImgs=document.querySelectorAll('.gallery img');
  var lb=document.getElementById('lightbox');
  var lbImg=document.getElementById('lbImg');
  var closeLb=document.getElementById('closeLb');
  if(galleryImgs && lb && lbImg){
    galleryImgs.forEach(function(img){
      img.addEventListener('click',function(){
        lbImg.src = img.dataset.full || img.src;
        lb.hidden = false;
      });
    });
    if(closeLb){ closeLb.addEventListener('click',function(){ lb.hidden=true; lbImg.src=''; }); }
    lb.addEventListener('click',function(e){ if(e.target===lb) { lb.hidden=true; lbImg.src=''; } });
  }
});
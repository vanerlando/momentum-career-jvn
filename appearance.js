(()=>{
const key='momentum-appearance-v1';let settings={theme:'light',size:'normal'};
try{const saved=JSON.parse(localStorage.getItem(key));if(saved)settings={...settings,...saved}}catch{}
function apply(){document.documentElement.dataset.theme=settings.theme==='dark'?'dark':'light';document.documentElement.dataset.textSize=['normal','large','xlarge'].includes(settings.size)?settings.size:'normal'}
apply();
document.addEventListener('DOMContentLoaded',()=>{
const box=document.createElement('details');box.className='appearance-settings';
box.innerHTML='<summary>◐ Pengaturan tampilan</summary><label>Mode tampilan<select id="appearanceTheme"><option value="light">☀ Terang</option><option value="dark">☾ Gelap / malam</option></select></label><label>Ukuran teks<select id="appearanceSize"><option value="normal">Normal</option><option value="large">Besar</option><option value="xlarge">Ekstra besar</option></select></label><p>Disimpan untuk browser ini.</p>';
document.querySelector('aside').append(box);
const theme=box.querySelector('select'),size=box.querySelector('#appearanceSize');theme.value=settings.theme;size.value=settings.size;
function update(){settings={theme:theme.value,size:size.value};apply();try{localStorage.setItem(key,JSON.stringify(settings))}catch{box.querySelector('p').textContent='Berlaku saat ini; browser tidak dapat menyimpan pilihan.'}}
theme.addEventListener('change',update);size.addEventListener('change',update);
});
})();
